-- Los resultados se conservan independientemente de cualquier archivo de audio.
CREATE TABLE practice_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  song_id TEXT NOT NULL REFERENCES songs(id),
  season_id TEXT NOT NULL REFERENCES seasons(id),
  duration_seconds REAL NOT NULL CHECK(duration_seconds > 0 AND duration_seconds <= 601),
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
  analysis TEXT NOT NULL CHECK(json_valid(analysis)),
  submitted_at TEXT NOT NULL
);
CREATE INDEX practice_results_season_user ON practice_results(season_id,user_id,submitted_at);
CREATE INDEX practice_results_song ON practice_results(song_id,submitted_at);
-- Conservar íntegro el análisis existente antes de retirar los audios de R2.
INSERT INTO practice_results(id,user_id,song_id,season_id,duration_seconds,score,analysis,submitted_at)
SELECT id,user_id,song_id,season_id,duration_seconds,score,analysis,COALESCE(uploaded_at,recorded_at)
FROM recordings WHERE status='ready' AND analysis IS NOT NULL AND score IS NOT NULL;
