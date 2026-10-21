ALTER TABLE recordings ADD COLUMN upload_started_at TEXT;
ALTER TABLE rate_limits ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
CREATE TRIGGER attendance_insert_guard BEFORE INSERT ON rehearsal_attendance BEGIN
 SELECT RAISE(ABORT,'invalid_effective_minutes') WHERE NEW.effective_minutes > (SELECT duration_minutes FROM rehearsals WHERE id=NEW.rehearsal_id);
 SELECT RAISE(ABORT,'final_pending') WHERE NEW.attendance_status='pending' AND (SELECT status FROM rehearsals WHERE id=NEW.rehearsal_id)='final';
 SELECT RAISE(ABORT,'invalid_arrival') WHERE NEW.attendance_status='late' AND NOT(NEW.arrival_at>(SELECT starts_at FROM rehearsals WHERE id=NEW.rehearsal_id) AND NEW.arrival_at<(SELECT ends_at FROM rehearsals WHERE id=NEW.rehearsal_id));
END;
CREATE TRIGGER attendance_update_guard BEFORE UPDATE ON rehearsal_attendance BEGIN
 SELECT RAISE(ABORT,'invalid_effective_minutes') WHERE NEW.effective_minutes > (SELECT duration_minutes FROM rehearsals WHERE id=NEW.rehearsal_id);
 SELECT RAISE(ABORT,'final_pending') WHERE NEW.attendance_status='pending' AND (SELECT status FROM rehearsals WHERE id=NEW.rehearsal_id)='final';
 SELECT RAISE(ABORT,'invalid_arrival') WHERE NEW.attendance_status='late' AND NOT(NEW.arrival_at>(SELECT starts_at FROM rehearsals WHERE id=NEW.rehearsal_id) AND NEW.arrival_at<(SELECT ends_at FROM rehearsals WHERE id=NEW.rehearsal_id));
END;
