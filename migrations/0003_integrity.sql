ALTER TABLE recordings ADD COLUMN upload_started_at TEXT;
ALTER TABLE rate_limits ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
CREATE TRIGGER attendance_insert_guard BEFORE INSERT ON rehearsal_attendance BEGIN
 SELECT CASE WHEN NEW.effective_minutes > (SELECT duration_minutes FROM rehearsals WHERE id=NEW.rehearsal_id) THEN RAISE(ABORT,'invalid_effective_minutes') END;
 SELECT CASE WHEN NEW.attendance_status='pending' AND (SELECT status FROM rehearsals WHERE id=NEW.rehearsal_id)='final' THEN RAISE(ABORT,'final_pending') END;
 SELECT CASE WHEN NEW.attendance_status='late' AND NOT(NEW.arrival_at>(SELECT starts_at FROM rehearsals WHERE id=NEW.rehearsal_id) AND NEW.arrival_at<(SELECT ends_at FROM rehearsals WHERE id=NEW.rehearsal_id)) THEN RAISE(ABORT,'invalid_arrival') END;
END;
CREATE TRIGGER attendance_update_guard BEFORE UPDATE ON rehearsal_attendance BEGIN
 SELECT CASE WHEN NEW.effective_minutes > (SELECT duration_minutes FROM rehearsals WHERE id=NEW.rehearsal_id) THEN RAISE(ABORT,'invalid_effective_minutes') END;
 SELECT CASE WHEN NEW.attendance_status='pending' AND (SELECT status FROM rehearsals WHERE id=NEW.rehearsal_id)='final' THEN RAISE(ABORT,'final_pending') END;
 SELECT CASE WHEN NEW.attendance_status='late' AND NOT(NEW.arrival_at>(SELECT starts_at FROM rehearsals WHERE id=NEW.rehearsal_id) AND NEW.arrival_at<(SELECT ends_at FROM rehearsals WHERE id=NEW.rehearsal_id)) THEN RAISE(ABORT,'invalid_arrival') END;
END;
