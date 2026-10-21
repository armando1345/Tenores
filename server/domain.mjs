export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function ensure(condition, message, status = 400) { if (!condition) throw new HttpError(status, message); }
export function text(value, max = 100) {
  ensure(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'Texto inválido.');
  return value.trim();
}
export function uuid(value) { ensure(typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value), 'Identificador inválido.'); return value; }
export function clock(value) {
  ensure(typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value), 'Hora inválida.');
  return Number(value.slice(0,2)) * 60 + Number(value.slice(3));
}
export function date(value) {
  ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value, 'Fecha inválida.'); return value;
}
export function attendance(row, start, end) {
  const a = clock(start), b = clock(end);
  ensure(b > a, 'El cierre debe ser posterior al inicio, en la misma fecha.');
  const status = row.attendance_status || 'pending';
  ensure(['pending','on_time','late','absent'].includes(status), 'Estado de asistencia inválido.');
  let arrival = null, reason = null, departure = row.departure_at || null;
  if (status === 'late') {
    ensure(['justified','unjustified'].includes(row.late_reason), 'Selecciona el tipo de llegada tardía.');
    arrival = row.arrival_at; reason = row.late_reason;
    ensure(clock(arrival) > a && clock(arrival) < b, 'La llegada tardía debe estar entre el inicio y el cierre.');
  }
  if (departure) ensure(clock(departure) > (arrival ? clock(arrival) : a) && clock(departure) <= b, 'Salida fuera del horario efectivo.');
  const minutes = status === 'pending' ? null : status === 'absent' ? 0 : Math.max(0, Math.min(b, departure ? clock(departure) : b) - Math.max(a, arrival ? clock(arrival) : a));
  return { user_id: uuid(row.user_id), attendance_status: status, late_reason: reason, arrival_at: arrival, departure_at: departure, effective_minutes: minutes };
}
export function canReadRecording(user, recording) { return !!user && (user.role === 'admin' || user.id === recording.user_id); }
export function recordingMetadata(body, limits) {
  uuid(body.id); uuid(body.song_id); uuid(body.season_id);
  ensure(Number.isInteger(body.file_size) && body.file_size > 0 && body.file_size <= limits.bytes, 'El audio supera el tamaño permitido.', 413);
  ensure(Number.isFinite(body.duration_seconds) && body.duration_seconds > 0 && body.duration_seconds <= limits.seconds, 'Duración de audio fuera del límite.');
  const mime = text(body.mime_type, 100).toLowerCase();
  ensure(/^(audio\/(webm|ogg|mp4|aac|mpeg))(;\s*codecs=[a-z0-9., "-]+)?$/.test(mime), 'Formato de audio no permitido.', 415);
  return { ...body, mime_type: mime, codec: /codecs=([^;]+)/.exec(mime)?.[1] || null };
}
export function sniffAudio(bytes, mime) {
  const b = new Uint8Array(bytes), ascii = (n, len) => String.fromCharCode(...b.slice(n,n+len));
  if (mime.startsWith('audio/webm')) return b[0]===0x1a && b[1]===0x45 && b[2]===0xdf && b[3]===0xa3;
  if (mime.startsWith('audio/ogg')) return ascii(0,4)==='OggS';
  if (mime.startsWith('audio/mp4')) return ascii(4,4)==='ftyp';
  if (mime.startsWith('audio/mpeg')) return ascii(0,3)==='ID3' || (b[0]===0xff && (b[1]&0xe0)===0xe0);
  return b[0]===0xff && (b[1]&0xf6)===0xf0;
}
export function practiceAnalysis(raw, songId) {
  const ok = raw && typeof raw === 'object' && !Array.isArray(raw);
  ensure(ok, 'Análisis inválido.');
  ensure(typeof raw.engineVersion === 'string' && raw.engineVersion.length > 0 && raw.engineVersion.length <= 20, 'Versión del motor inválida.');
  ensure(raw.mode === 'guide', 'Solo se guardan análisis con guía.');
  ensure(raw.isFull === true, 'El análisis debe ser de la canción completa.');
  ensure(raw.valid === true, 'El análisis no es válido.');
  ensure(raw.songId === songId, 'El análisis no corresponde a esta canción.');
  const total = raw.scores?.total;
  ensure(Number.isInteger(total) && total >= 0 && total <= 100, 'Puntuación inválida.');
  ensure(Array.isArray(raw.tips) && Array.isArray(raw.phrases) && Array.isArray(raw.curves?.ref), 'Análisis incompleto.');
  for (const key of ['pitch','rhythm','stability']) ensure(raw.scores[key] == null || (Number.isFinite(raw.scores[key]) && raw.scores[key] >= 0 && raw.scores[key] <= 100), 'Métrica inválida.');
  const allowed = ['engineVersion','songId','mode','isFull','valid','scores','tips','phrases','curves','phraseFrom','phraseTo','coverage'];
  ensure(Object.keys(raw).every(key => allowed.includes(key)), 'El análisis contiene campos no admitidos.');
  const json = JSON.stringify(raw);
  ensure(json.length <= 262144, 'El análisis es demasiado grande.', 413);
  return { json, score: total };
}
export function referencePayload(raw, song) {
  ensure(raw && typeof raw === 'object' && !Array.isArray(raw), 'Curva inválida.');
  ensure(raw.source === song.reference_audio_key, 'La referencia de la canción cambió; vuelve a generar la curva.', 409);
  ensure(raw.hopMs === 10, 'Paso de la curva inválido.');
  ensure(Array.isArray(raw.midi) && raw.midi.length > 0, 'La curva está vacía.');
  ensure(Array.isArray(raw.phrases) && raw.phrases.length > 0 && raw.phrases.every(p => p && p.start < p.end), 'Frases inválidas.');
  const json = JSON.stringify({ ...raw, songId: song.id });
  ensure(json.length <= 163840, 'La curva es demasiado grande.', 413);
  return json;
}
