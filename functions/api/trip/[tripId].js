const TRIP_ID = "usa-west-coast-2026-10";
const COLLECTIONS = new Set(["bills", "travelers", "tickets", "settings"]);

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function requestedCollections(request) {
  const raw = new URL(request.url).searchParams.get("collections") || "";
  const selected = [...new Set(raw.split(",").filter(Boolean))];
  return selected.length && selected.every((name) => COLLECTIONS.has(name)) ? selected : null;
}

async function snapshot(db, tripId, collections) {
  const result = { version: 1, settings: null, bills: [], travelers: [], todos: [], tickets: [], updatedAt: new Date().toISOString() };
  for (const collection of collections) {
    const rows = await db.prepare("SELECT value_json FROM trip_records WHERE trip_id = ? AND collection = ? ORDER BY record_id")
      .bind(tripId, collection).all();
    const records = (rows.results || []).map((row) => JSON.parse(row.value_json));
    if (collection === "settings") {
      const record = records.find((item) => item.id === "ledger");
      if (record) {
        const { id, ...settings } = record;
        result.settings = settings;
      }
    } else result[collection] = records;
  }
  return result;
}

function contextError(context) {
  if (context.params.tripId !== TRIP_ID) return json({ error: "Unknown trip" }, 404);
  if (!context.env.TRAVEL_DB) return json({ error: "TRAVEL_DB binding is missing" }, 503);
  if (!requestedCollections(context.request)) return json({ error: "Invalid collections" }, 400);
  return null;
}

export async function onRequestGet(context) {
  const error = contextError(context);
  if (error) return error;
  const collections = requestedCollections(context.request);
  try { return json(await snapshot(context.env.TRAVEL_DB, TRIP_ID, collections)); }
  catch (cause) { console.error("D1 trip read failed", cause); return json({ error: "Database read failed" }, 500); }
}

export async function onRequestPost(context) {
  const error = contextError(context);
  if (error) return error;
  if (context.request.headers.get("x-travel-actor") !== "Weiyang") return json({ error: "Read-only profile" }, 403);
  if (Number(context.request.headers.get("content-length") || 0) > 500000) return json({ error: "Request too large" }, 413);
  let body;
  try { body = await context.request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }
  const collections = requestedCollections(context.request);
  const changes = body?.changes;
  if (!Array.isArray(changes) || changes.length > 100) return json({ error: "Invalid changes" }, 400);
  const now = new Date().toISOString();
  const statements = [];
  for (const change of changes) {
    const { collection, op, value } = change || {};
    const id = String(change?.id || value?.id || "");
    if (!collections.includes(collection) || !["upsert", "delete"].includes(op) || !/^[a-z0-9][a-z0-9._:-]{0,119}$/i.test(id)) {
      return json({ error: "Invalid record change" }, 400);
    }
    if (collection === "settings" && id !== "ledger") return json({ error: "Invalid settings record" }, 400);
    if (op === "delete") {
      statements.push(context.env.TRAVEL_DB.prepare("DELETE FROM trip_records WHERE trip_id = ? AND collection = ? AND record_id = ?")
        .bind(TRIP_ID, collection, id));
    } else {
      const serialized = JSON.stringify(value);
      if (!serialized || serialized.length > 20000) return json({ error: "Record too large" }, 400);
      statements.push(context.env.TRAVEL_DB.prepare(
        "INSERT INTO trip_records (trip_id, collection, record_id, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(trip_id, collection, record_id) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by"
      ).bind(TRIP_ID, collection, id, serialized, now, "Weiyang"));
    }
  }
  try {
    if (statements.length) await context.env.TRAVEL_DB.batch(statements);
    return json(await snapshot(context.env.TRAVEL_DB, TRIP_ID, collections));
  } catch (cause) {
    console.error("D1 trip write failed", cause);
    return json({ error: "Database write failed" }, 500);
  }
}
