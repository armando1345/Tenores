ALTER TABLE recordings ADD COLUMN analysis TEXT;
ALTER TABLE recordings ADD COLUMN score INTEGER CHECK(score BETWEEN 0 AND 100);
CREATE TABLE IF NOT EXISTS song_references(
  song_id TEXT PRIMARY KEY REFERENCES songs(id),
  source TEXT NOT NULL,
  reference TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
