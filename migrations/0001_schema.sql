PRAGMA foreign_keys = ON;
CREATE TABLE users (
 id TEXT PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL,
 password_hash TEXT, role TEXT NOT NULL CHECK(role IN ('tenor','admin')), active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
 legacy_key TEXT UNIQUE, last_login_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 CHECK(active=0 OR (username IS NOT NULL AND password_hash IS NOT NULL))
);
CREATE TABLE seasons (
 id TEXT PRIMARY KEY, year INTEGER UNIQUE NOT NULL CHECK(year BETWEEN 2000 AND 2200), starts_on TEXT NOT NULL, ends_on TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closing','closed')), CHECK(ends_on>=starts_on)
);
CREATE TABLE season_memberships (
 season_id TEXT NOT NULL REFERENCES seasons(id), user_id TEXT NOT NULL REFERENCES users(id),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), PRIMARY KEY(season_id,user_id)
);
CREATE TABLE songs (
 id TEXT PRIMARY KEY, season_id TEXT NOT NULL REFERENCES seasons(id), legacy_key TEXT, title TEXT NOT NULL,
 reference_audio_key TEXT NOT NULL, lyrics TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), UNIQUE(season_id,legacy_key)
);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT UNIQUE NOT NULL, csrf_token TEXT NOT NULL,
 expires_at TEXT NOT NULL, revoked_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE rehearsals (
 id TEXT PRIMARY KEY, season_id TEXT NOT NULL REFERENCES seasons(id), rehearsal_date TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
 duration_minutes INTEGER NOT NULL CHECK(duration_minutes>0 AND duration_minutes<1440), status TEXT NOT NULL CHECK(status IN ('draft','final')),
 version INTEGER NOT NULL DEFAULT 1, write_token TEXT NOT NULL, payload_hash TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(season_id,rehearsal_date,starts_at), CHECK(ends_at>starts_at)
);
CREATE INDEX rehearsals_season ON rehearsals(season_id,status,rehearsal_date);
CREATE TABLE rehearsal_attendance (
 rehearsal_id TEXT NOT NULL REFERENCES rehearsals(id), user_id TEXT NOT NULL REFERENCES users(id),
 attendance_status TEXT NOT NULL CHECK(attendance_status IN ('pending','on_time','late','absent')),
 late_reason TEXT CHECK(late_reason IN ('justified','unjustified')), arrival_at TEXT, departure_at TEXT,
 effective_minutes INTEGER CHECK(effective_minutes>=0), updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(rehearsal_id,user_id),
 CHECK((attendance_status='late' AND late_reason IS NOT NULL AND arrival_at IS NOT NULL) OR (attendance_status!='late' AND late_reason IS NULL AND arrival_at IS NULL)),
 CHECK((attendance_status='pending' AND effective_minutes IS NULL) OR (attendance_status!='pending' AND effective_minutes IS NOT NULL)),
 CHECK(attendance_status!='absent' OR effective_minutes=0)
);
CREATE INDEX attendance_user ON rehearsal_attendance(user_id,rehearsal_id);
CREATE TABLE admin_audit (
 id TEXT PRIMARY KEY, changed_by TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, entity_id TEXT NOT NULL,
 previous_value TEXT, new_value TEXT, changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX audit_entity ON admin_audit(entity_id,changed_at);
CREATE TABLE legacy_attendance (
 season_id TEXT NOT NULL REFERENCES seasons(id), user_id TEXT NOT NULL REFERENCES users(id), minutes REAL NOT NULL,
 scheduled_minutes REAL NOT NULL, rehearsals INTEGER NOT NULL, rehearsals_attended INTEGER NOT NULL,
 attendance REAL NOT NULL, tardy_count INTEGER NOT NULL, tardy_pct REAL, tardy_justified_pct REAL,
 source TEXT NOT NULL, PRIMARY KEY(season_id,user_id)
);
CREATE TABLE recordings (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), song_id TEXT NOT NULL REFERENCES songs(id), season_id TEXT NOT NULL REFERENCES seasons(id),
 r2_object_key TEXT UNIQUE NOT NULL, duration_seconds REAL NOT NULL CHECK(duration_seconds>0), file_size INTEGER NOT NULL CHECK(file_size>0), mime_type TEXT NOT NULL, codec TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','deleted')),
 recorded_at TEXT NOT NULL, uploaded_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX recordings_owner ON recordings(user_id,season_id,status,created_at);
CREATE INDEX recordings_season ON recordings(season_id,status,file_size);
CREATE TABLE activity_events (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), event_type TEXT NOT NULL CHECK(event_type IN ('login','active_day','reference_start','recording_sent')),
 song_id TEXT REFERENCES songs(id), event_day TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(user_id,event_type,song_id,event_day)
);
CREATE UNIQUE INDEX active_day_unique ON activity_events(user_id,event_day) WHERE event_type='active_day';
CREATE INDEX activity_owner ON activity_events(user_id,event_day,event_type);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL);
CREATE TABLE app_limits (id INTEGER PRIMARY KEY CHECK(id=1), audio_bytes INTEGER NOT NULL, audio_seconds INTEGER NOT NULL, daily_recordings INTEGER NOT NULL, season_bytes INTEGER NOT NULL, total_bytes INTEGER NOT NULL);
INSERT INTO app_limits VALUES(1,20000000,600,10,3000000000,8000000000);
CREATE TRIGGER recording_guard BEFORE INSERT ON recordings BEGIN
 SELECT RAISE(ABORT,'season_closed') WHERE (SELECT status FROM seasons WHERE id=NEW.season_id)!='active';
 SELECT RAISE(ABORT,'invalid_song') WHERE NOT EXISTS(SELECT 1 FROM songs WHERE id=NEW.song_id AND season_id=NEW.season_id AND active=1);
 SELECT RAISE(ABORT,'audio_limit') WHERE NEW.file_size>(SELECT audio_bytes FROM app_limits) OR NEW.duration_seconds>(SELECT audio_seconds FROM app_limits);
 SELECT RAISE(ABORT,'daily_limit') WHERE (SELECT COUNT(*) FROM recordings WHERE user_id=NEW.user_id AND substr(created_at,1,10)=substr(NEW.created_at,1,10)) >= (SELECT daily_recordings FROM app_limits);
 SELECT RAISE(ABORT,'storage_limit') WHERE (SELECT COALESCE(SUM(file_size),0) FROM recordings WHERE status!='deleted' AND season_id=NEW.season_id)+NEW.file_size>(SELECT season_bytes FROM app_limits);
 SELECT RAISE(ABORT,'storage_limit') WHERE (SELECT COALESCE(SUM(file_size),0) FROM recordings WHERE status!='deleted')+NEW.file_size>(SELECT total_bytes FROM app_limits);
END;
