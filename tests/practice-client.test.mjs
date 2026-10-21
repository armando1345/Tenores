import test from 'node:test';
import assert from 'node:assert/strict';
import { compactAnalysis } from '../practice/compact.js';
import { assertCloudinary } from '../practice/reference-source.js';
const mk=(n,hop=10)=>({engineVersion:'1',songId:'fum',scores:{total:80,pitch:1,rhythm:2,stability:3},tips:['a'],curves:{hopMs:hop,startSec:0,ref:Array.from({length:n},(_,i)=>i%7===0?null:60+Math.sin(i)*3.14159),user:Array.from({length:n},(_,i)=>i%5===0?null:61.123456+i%3)}});
test('compactAnalysis submuestrea, redondea y conserva null',()=>{
  const a=mk(16000),c=compactAnalysis(a);
  assert(c.curves.ref.length<=4000&&c.curves.user.length<=4000);assert.equal(c.curves.hopMs,40);
  assert.equal(c.curves.ref[0],null);assert.deepEqual(c.scores,a.scores);assert.deepEqual(c.tips,a.tips);
  for(const v of c.curves.user)assert(v===null||Math.round(v*100)/100===v);
  assert.equal(compactAnalysis(mk(100)).curves.hopMs,10);
});
test('El análisis de 160 s compactado cabe en 262 144',()=>{assert(JSON.stringify(compactAnalysis(mk(16000))).length<262144);});
test('assertCloudinary exige res.cloudinary.com',()=>{
  assertCloudinary('https://res.cloudinary.com/x.wav');
  assert.throws(()=>assertCloudinary('https://example.com/x.wav'),{message:'Para generar la curva, la referencia debe estar en Cloudinary (res.cloudinary.com).'});
});

import { MIME_TYPES, pickMimeType, createTakeEncoder } from '../practice/encoder.js';
import { analysisMarkup } from '../practice/result-view.js';
const EMPTY_MSG = 'La grabación está vacía o supera el tamaño máximo. Vuelve a grabar.';
test('pickMimeType respeta el orden de MIME_TYPES y devuelve vacío sin soporte', () => {
  assert.deepEqual(MIME_TYPES, ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm']);
  assert.equal(pickMimeType(() => true), 'audio/webm;codecs=opus');
  assert.equal(pickMimeType(t => t.startsWith('audio/mp4')), 'audio/mp4;codecs=mp4a.40.2');
  assert.equal(pickMimeType(t => t === 'audio/webm'), 'audio/webm');
  assert.equal(pickMimeType(() => false), '');
  assert.equal(pickMimeType(() => { throw new Error('x'); }), '');
});
function fakeRecorder(parts, supported = t => t === 'audio/ogg;codecs=opus') {
  const made = [];
  class R {
    static isTypeSupported(t) { return supported(t); }
    constructor(stream, options) { this.stream = stream; this.options = options; this.mimeType = options.mimeType || ''; this.state = 'inactive'; made.push(this); }
    start(slice) { this.slice = slice; this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      setTimeout(() => { for (const p of parts) this.ondataavailable?.({ data: new Blob([p], { type: this.mimeType }) }); this.onstop?.(); });
    }
  }
  return { R, made };
}
test('createTakeEncoder devuelve el blob con su MIME y usa 64 000 bps', async () => {
  const { R, made } = fakeRecorder(['abc', 'def']);
  const stream = {};
  const enc = createTakeEncoder(stream, { maxBytes: 100, Recorder: R });
  enc.start();
  assert.equal(made[0].stream, stream);
  assert.equal(made[0].options.audioBitsPerSecond, 64000);
  assert.equal(made[0].options.mimeType, 'audio/ogg;codecs=opus');
  assert.equal(made[0].slice, 1000);
  const { blob, mimeType } = await enc.stop();
  assert.equal(blob.size, 6);
  assert.equal(mimeType, 'audio/ogg;codecs=opus');
  assert.equal(blob.type, 'audio/ogg;codecs=opus');
});
test('createTakeEncoder rechaza si la toma está vacía o supera maxBytes', async () => {
  const empty = fakeRecorder([]);
  const a = createTakeEncoder({}, { maxBytes: 100, Recorder: empty.R });
  a.start();
  await assert.rejects(a.stop(), { message: EMPTY_MSG });
  const big = fakeRecorder(['0123456789', 'x']);
  const b = createTakeEncoder({}, { maxBytes: 10, Recorder: big.R });
  b.start();
  await assert.rejects(b.stop(), { message: EMPTY_MSG });
});
const result = {
  engineVersion: '1.1.0', songId: 'x', mode: 'guide', isFull: true, valid: true,
  scores: { total: 73, pitch: 81, rhythm: 55, stability: null },
  tips: [{ kind: 'pitch', phrase: 1, text: 'Frase 1: <b>"alto"</b> & más' }, { kind: 'praise', phrase: null, text: '¡Muy bien!' }],
  phrases: [{ index: 1, start: 0, end: 2.5, pitch: 81 }, { index: 2, start: 2.5, end: 5, pitch: 40 }],
  curves: { hopMs: 10, startSec: 0, ref: [60, 60.5, null, 62, 62], user: [59.8, null, 61, 62.2, 62] },
};
test('analysisMarkup muestra nota, desglose y comparación visible sin consejos', () => {
  const html = analysisMarkup(result);
  assert.match(html, /practice-score__value">73</);
  assert(html.includes('No cuenta en la nota total'));assert(html.includes('Entonación'));assert(!html.includes('Afinación'));assert(html.includes('practice-intonation__value">81<'));assert(html.includes('Similitud total'));
  assert(!html.includes('Para la próxima práctica'));
  assert(!html.includes('¡Muy bien!'));
  assert(html.includes('<section class="practice-voice-detail">'));
  assert(!html.includes('<details class="practice-voice-detail">'));
  assert(html.includes('<svg'));
  assert(html.includes('Frase 2'));
  assert(!html.includes('<button'));
  assert(!html.includes('90%'));
  assert(!analysisMarkup({ ...result, scores: { ...result.scores, total: 90 } }).includes('90%'));
});

import { sendState, sendOutcome } from '../practice/send-state.js';
import { MIN_TAKE_RATIO, incompleteTake } from '../practice/take-check.js';
const ENC_OK = { ok: true, blob: {}, mimeType: 'audio/webm' };
test('sendState: inválida, fragmento, sin codificador y lista', () => {
  assert.deepEqual(sendState({ valid: false, mode: 'guide', isFull: true }, ENC_OK), { state: 'invalid' });
  const FRAG = { state: 'fragment', message: 'Para enviar a jefatura, canta la canción completa.' };
  assert.deepEqual(sendState({ valid: true, mode: 'guide', isFull: false }, ENC_OK), FRAG); // fragmento válido
  assert.deepEqual(sendState({ valid: true, mode: 'free', isFull: true }, ENC_OK), FRAG); // completa en otro modo
  assert.deepEqual(sendState({ valid: true, mode: 'guide', isFull: true }), { state: 'ready' }); // No requiere codificar ni subir audio
  assert.deepEqual(sendState({ valid: true, mode: 'guide', isFull: true }, ENC_OK), { state: 'ready' });
});
test('sendOutcome: un error conserva la toma pendiente con el mismo id; el éxito la retira', () => {
  const take = { id: 'abc-123', blob: {} };
  const failed = sendOutcome(take, take, new Error('Sin conexión.'));
  assert.equal(failed.pending, take);
  assert.equal(failed.pending.id, 'abc-123');
  assert.deepEqual(failed.send, { state: 'error', message: 'Sin conexión.' });
  assert.deepEqual(sendOutcome(take, take, {}).send, { state: 'error', message: 'No se pudo enviar la práctica.' });
  const ok = sendOutcome(take, take, null);
  assert.equal(ok.pending, null);
  assert.deepEqual(ok.send, { state: 'sent' });
  const other = { id: 'otra' };
  assert.equal(sendOutcome(other, take, null).pending, other);
});
test('incompleteTake detecta audio comprimido y no avisa en tomas muy cortas', () => {
  assert.equal(MIN_TAKE_RATIO, 0.9);
  assert.equal(incompleteTake(17, 17), false);
  assert.equal(incompleteTake(11, 17), true);
  assert.equal(incompleteTake(15.4, 17), false);
  assert.equal(incompleteTake(1, 1.5), false);
});
