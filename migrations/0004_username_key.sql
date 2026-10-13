-- Conservar el nombre visible y comparar los accesos sin distinguir mayúsculas.
-- Los usuarios anteriores a esta migración utilizaban identificadores ASCII.
ALTER TABLE users ADD COLUMN username_key TEXT;
UPDATE users SET username_key=LOWER(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX users_username_key ON users(username_key);
