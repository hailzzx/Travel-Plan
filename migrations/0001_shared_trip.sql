CREATE TABLE IF NOT EXISTS trip_records (
  trip_id TEXT NOT NULL,
  collection TEXT NOT NULL,
  record_id TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (trip_id, collection, record_id)
);

CREATE TABLE IF NOT EXISTS itinerary_state (
  trip_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  days_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
