// Codifica la toma con MediaRecorder (en paralelo a la captura sin procesar del análisis) para enviarla a jefatura.
export const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm'];
export const BAD_TAKE = 'La grabación está vacía o supera el tamaño máximo. Vuelve a grabar.';

export function pickMimeType(isSupported) {
  for (const type of MIME_TYPES) {
    try { if (isSupported(type)) return type; } catch { /* sin soporte */ }
  }
  return '';
}

export function createTakeEncoder(stream, { maxBytes, Recorder = globalThis.MediaRecorder } = {}) {
  if (!Recorder) throw new Error('MediaRecorder no disponible');
  const mimeType = pickMimeType(t => Recorder.isTypeSupported(t));
  const options = { audioBitsPerSecond: 64000 };
  if (mimeType) options.mimeType = mimeType;
  const rec = new Recorder(stream, options);
  let chunks = [];
  let failure = null;
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onerror = e => { failure = (e && e.error) || new Error('Error del codificador'); };
  return {
    start() { chunks = []; failure = null; rec.start(1000); },
    stop() {
      return new Promise((resolve, reject) => {
        const finish = () => {
          if (failure) { reject(failure); return; }
          const type = rec.mimeType || mimeType;
          const blob = new Blob(chunks, type ? { type } : {});
          chunks = [];
          if (!blob.size || (maxBytes && blob.size > maxBytes)) { reject(new Error(BAD_TAKE)); return; }
          resolve({ blob, mimeType: blob.type || type });
        };
        if (rec.state === 'inactive') { finish(); return; }
        rec.onstop = finish;
        try { rec.stop(); } catch (err) { reject(err); }
      });
    },
  };
}
