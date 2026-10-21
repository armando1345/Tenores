export const FRAGMENT_MESSAGE = 'Para enviar a jefatura, canta la canción completa.';
const SEND_FAILED = 'No se pudo enviar la práctica.';

// Decide si una toma analizada se puede enviar a jefatura.
export function sendState(result) {
  if (result.valid !== true) return { state: 'invalid' };
  if (result.mode !== 'guide' || result.isFull !== true) return { state: 'fragment', message: FRAGMENT_MESSAGE };
  return { state: 'ready' };
}

// Estado tras un intento de envío: `error` nulo es éxito. Un fallo conserva la toma pendiente (mismo id) para reintentar.
export function sendOutcome(pending, sent, error) {
  if (error == null) return { pending: pending === sent ? null : pending, send: { state: 'sent' } };
  return { pending, send: { state: 'error', message: (error && error.message) || SEND_FAILED } };
}
