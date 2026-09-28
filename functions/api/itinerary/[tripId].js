const TRIP_ID = "usa-west-coast-2026-10";

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function setupError(context) {
  if (context.params.tripId !== TRIP_ID) return json({ error: "Unknown trip" }, 404);
  if (!context.env.TRAVEL_DB) return json({ error: "TRAVEL_DB binding is missing" }, 503);
  return null;
}

async function getState(db) {
  const row = await db.prepare("SELECT version, days_json, updated_at, updated_by FROM itinerary_state WHERE trip_id = ?")
    .bind(TRIP_ID).first();
  return row ? { version: row.version, days: JSON.parse(row.days_json), updatedAt: row.updated_at, updatedBy: row.updated_by }
    : { version: 0, days: {}, updatedAt: null, updatedBy: null };
}

function validText(value, limit, required = false) {
  return typeof value === "string" && value.length <= limit && (!required || Boolean(value.trim()));
}

function validDays(days) {
  if (!days || typeof days !== "object" || Array.isArray(days)) return false;
  return Object.entries(days).every(([day, edit]) =>
    /^[1-8]$/.test(day) && edit && typeof edit === "object" && !Array.isArray(edit) &&
    validText(edit.title, 100, true) &&
    Array.isArray(edit.locations) && edit.locations.length >= 1 && edit.locations.length <= 20 &&
    edit.locations.every((value) => validText(value, 80, true)) &&
    Array.isArray(edit.schedule) && edit.schedule.length <= 80 &&
    edit.schedule.every((item) => item && typeof item === "object" &&
      validText(item.id, 90, true) && validText(item.time, 24) && validText(item.text, 500, true) &&
      (item.mapQuery === undefined || validText(item.mapQuery, 200)) &&
      (item.mapLabel === undefined || validText(item.mapLabel, 200))) &&
    Array.isArray(edit.notes) && edit.notes.length <= 30 &&
    edit.notes.every((value) => validText(value, 800, true))
  );
}

export async function onRequestGet(context) {
  const error = setupError(context);
  if (error) return error;
  try { return json(await getState(context.env.TRAVEL_DB)); }
  catch (cause) { console.error("D1 itinerary read failed", cause); return json({ error: "Database read failed" }, 500); }
}

export async function onRequestPut(context) {
  const error = setupError(context);
  if (error) return error;
  if (context.request.headers.get("x-travel-actor") !== "Weiyang") return json({ error: "Read-only profile" }, 403);
  if (Number(context.request.headers.get("content-length") || 0) > 500000) return json({ error: "Request too large" }, 413);
  let body;
  try { body = await context.request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }
  const { version, days } = body || {};
  if (!Number.isSafeInteger(version) || version < 0 || !validDays(days)) return json({ error: "Invalid itinerary" }, 400);
  const serialized = JSON.stringify(days);
  if (serialized.length > 400000) return json({ error: "Itinerary too large" }, 413);
  const db = context.env.TRAVEL_DB;
  const now = new Date().toISOString();
  try {
    const result = version === 0
      ? await db.prepare("INSERT INTO itinerary_state (trip_id, version, days_json, updated_at, updated_by) VALUES (?, 1, ?, ?, ?) ON CONFLICT(trip_id) DO NOTHING")
        .bind(TRIP_ID, serialized, now, "Weiyang").run()
      : await db.prepare("UPDATE itinerary_state SET version = version + 1, days_json = ?, updated_at = ?, updated_by = ? WHERE trip_id = ? AND version = ?")
        .bind(serialized, now, "Weiyang", TRIP_ID, version).run();
    if (!result.meta?.changes) return json({ error: "Itinerary changed elsewhere", current: await getState(db) }, 409);
    return json(await getState(db));
  } catch (cause) {
    console.error("D1 itinerary write failed", cause);
    return json({ error: "Database write failed" }, 500);
  }
}
