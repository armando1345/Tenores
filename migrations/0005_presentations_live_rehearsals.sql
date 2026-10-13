ALTER TABLE rehearsals ADD COLUMN is_live INTEGER NOT NULL DEFAULT 0 CHECK(is_live IN (0,1));
CREATE UNIQUE INDEX one_live_rehearsal_per_season ON rehearsals(season_id) WHERE is_live=1;
CREATE TABLE presentations (
 id TEXT PRIMARY KEY, season_id TEXT NOT NULL REFERENCES seasons(id), title TEXT NOT NULL,
 presentation_date TEXT NOT NULL, starts_at TEXT NOT NULL, call_at TEXT NOT NULL,
 venue TEXT NOT NULL, city TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX presentations_season_date ON presentations(season_id,presentation_date,starts_at);
