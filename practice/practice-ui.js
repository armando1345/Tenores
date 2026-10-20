import { createRecorder } from './recorder.js';
import { playClickAt } from './tones.js';
import { runAnalysis } from './analysis-client.js';
import { formatTime } from './util.js';
import { LIVE, noteName, targetFor, livePitch, deviationCents, tuningState } from './live-pitch.js';
import { LATENCY, effectiveLatency, saveLatency, detectOnsets, measureLatency } from './latency.js';
import { visibleNotes, createTrail, targetScale, stepScale, drawTrack, TRACK } from './live-track.js';
import { createTakeEncoder, BAD_TAKE } from './encoder.js';
import { compactAnalysis } from './compact.js';
import { analysisMarkup, esc } from './result-view.js';

const LIVE_PITCH = true;
const GUIDE_WARNING = 'Usa auriculares, mejor con cable: si el micrófono capta la guía, la puntuación no será fiable. Con Bluetooth, pulsa «Calibrar auriculares» antes.';
const LATENCY_SOURCE = { calibrated: 'calibrado', browser: 'automático', default: 'estimado' };
const GUIDE_TIMEOUT_MS = 3000; // si la guía no empieza a sonar en este tiempo, se avisa
const NO_ENCODER = 'Este navegador no puede enviar audio.';

let panel = null, sheet = null, body = null, titleEl = null, opener = null;
let s = null; // sesión de práctica abierta
let seq = 0; // contador global: los tokens nunca se reutilizan entre sesiones

const stale = token => !s || s.token !== token;

function ensurePanel() {
  if (panel) return;
  const t = document.createElement('template');
  t.innerHTML = `<div id="practicePanel" class="practice-panel" hidden>
    <div class="practice-panel__backdrop" data-close></div>
    <section class="practice-panel__sheet" role="dialog" aria-modal="true" aria-labelledby="practiceTitle" tabindex="-1">
      <header class="practice-panel__header">
        <div><p class="practice-eyebrow">Práctica</p><h2 id="practiceTitle"></h2></div>
        <button class="practice-close" type="button" data-close aria-label="Cerrar práctica">&times;</button>
      </header>
      <div class="practice-body" aria-live="polite"></div>
    </section>
  </div>`;
  panel = t.content.firstElementChild;
  document.body.append(panel);
  sheet = panel.querySelector('.practice-panel__sheet');
  body = panel.querySelector('.practice-body');
  titleEl = panel.querySelector('#practiceTitle');
  panel.addEventListener('click', e => { if (e.target.closest('[data-close]')) closePractice(); });
  window.addEventListener('beforeunload', e => {
    if (!hasPendingTake()) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

const focusablesIn = root => [...root.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled])')]
  .filter(el => el.offsetParent !== null);

// Escucha en `document` mientras el panel está abierto: cada render reemplaza el
// contenido y el foco puede caer en <body>, donde el panel ya no recibiría teclas.
function onKeydown(e) {
  if (e.key === 'Escape') { e.preventDefault(); closePractice(); return; }
  if (e.key !== 'Tab') return;
  const focusables = focusablesIn(sheet);
  if (!focusables.length) { e.preventDefault(); sheet.focus(); return; }
  const first = focusables[0], last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (!sheet.contains(active) || active === sheet) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

// Tras cada render: foco en el primer control del contenido o, si no hay, en el panel.
function focusBody() {
  const target = focusablesIn(body)[0] || sheet;
  target.focus({ preventScroll: true }); // sin saltar a mitad de los resultados
}

// Toma enviable (con guía, completa y válida) que aún no se ha enviado.
export function hasPendingTake() {
  return !!(s && s.pending);
}

export async function openPractice(song, hooks) {
  ensurePanel();
  if (s) endSession();
  opener = document.activeElement;
  document.getElementById('audio-track')?.pause();
  const audio = new Audio(song.track);
  audio.preload = 'auto';
  s = {
    song, hooks, audio, token: ++seq, ref: null, recorder: null, encoder: null, timers: new Set(), raf: 0,
    take: null, takeSource: null, refStop: null, finished: -1,
    result: null, pending: null, send: null,
    settings: { range: 'full', phraseFrom: 1, phraseTo: 1 },
  };
  titleEl.textContent = song.title;
  panel.hidden = false;
  document.body.classList.add('practice-panel-open');
  document.addEventListener('keydown', onKeydown);
  sheet.focus();
  await loadReference();
}

// Con una toma pendiente, cerrar pide antes confirmación en el panel.
export function closePractice() {
  if (!s) return;
  guardPending(endSession);
}

function endSession() {
  if (!s) return;
  cancelFlow();
  s.recorder?.dispose();
  s.audio.pause();
  s.audio.removeAttribute('src');
  s.audio.load();
  s = null;
  panel.hidden = true;
  document.removeEventListener('keydown', onKeydown);
  body.innerHTML = '';
  document.body.classList.remove('practice-panel-open');
  if (opener && document.contains(opener)) opener.focus();
}

function cancelFlow() {
  s.token = ++seq;
  for (const t of s.timers) clearTimeout(t);
  s.timers.clear();
  cancelAnimationFrame(s.raf);
  if (s.encoder) { s.encoder.stop().catch(() => {}); s.encoder = null; }
  stopTake();
  stopRefSegment();
  s.audio.pause();
}

function wait(ms) {
  return new Promise(resolve => {
    const t = setTimeout(() => { s?.timers.delete(t); resolve(); }, ms);
    s.timers.add(t);
  });
}

// Coloca el audio en `time` sin reproducirlo. iOS ignora preload: load() fuerza la carga.
// Con readyState 0 el valor queda como posición inicial por defecto; al llegar los
// metadatos se vuelve a fijar por si el navegador no la respetó.
function seekAudio(token, time) {
  const audio = s.audio;
  if (audio.readyState === 0) audio.load();
  audio.currentTime = time;
  if (audio.readyState < 1) {
    audio.addEventListener('loadedmetadata', () => {
      if (!stale(token) && Math.abs(audio.currentTime - time) > 0.05) audio.currentTime = time;
    }, { once: true });
  }
}

function seekAndPlay(token, time) {
  seekAudio(token, time);
  const audio = s.audio;
  const go = () => { if (!stale(token)) audio.play().catch(() => {}); };
  if (audio.readyState >= 1) go(); else audio.addEventListener('loadedmetadata', go, { once: true });
}

// Reproduce la guía y se resuelve cuando suena de verdad (evento `playing`): ese es
// el instante cero de la grabación. Se rechaza si play() falla o no suena en 3 s.
function playGuide() {
  const audio = s.audio, timers = s.timers;
  return new Promise((resolve, reject) => {
    let timer = 0;
    const settle = (ok, err) => {
      if (!timer) return;
      clearTimeout(timer);
      timers.delete(timer);
      timer = 0;
      audio.removeEventListener('playing', onPlaying);
      if (ok) resolve(); else reject(err);
    };
    const onPlaying = () => settle(true);
    timer = setTimeout(() => settle(false, new Error('La guía no empezó a sonar')), GUIDE_TIMEOUT_MS);
    timers.add(timer);
    audio.addEventListener('playing', onPlaying);
    audio.play().catch(err => settle(false, err));
  });
}

async function loadReference() {
  const token = s.token;
  renderMessage('Cargando referencia…');
  try {
    const ref = await s.hooks.loadReference();
    if (!ref || !Array.isArray(ref.phrases) || !ref.phrases.length) throw new Error('Referencia vacía');
    if (stale(token)) return;
    s.ref = ref;
    s.settings.phraseTo = ref.phrases.length;
    renderSetup();
  } catch {
    if (!stale(token)) renderError('No se pudo cargar la referencia.', loadReference);
  }
}

function renderMessage(text) {
  body.innerHTML = `<p class="practice-message">${esc(text)}</p>`;
  focusBody();
}

function renderError(text, retry) {
  body.innerHTML = `<div class="practice-error" role="alert"><p>${esc(text)}</p>
    <button type="button" class="btn small" data-retry>Reintentar</button></div>`;
  body.querySelector('[data-retry]').addEventListener('click', retry);
  focusBody();
}

function micErrorMessage(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Permiso de micrófono denegado. Actívalo en los ajustes del sitio (icono junto a la dirección web) y pulsa Reintentar.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No se encontró ningún micrófono. Conecta uno y pulsa Reintentar.';
  return 'No se pudo acceder al micrófono.';
}

function currentRange() {
  const n = s.ref.phrases.length;
  return s.settings.range === 'full' ? { from: 1, to: n } : { from: s.settings.phraseFrom, to: s.settings.phraseTo };
}

// Con una toma pendiente, `action` solo se ejecuta tras confirmar el descarte en el panel.
function guardPending(action) {
  if (!hasPendingTake()) { action(); return; }
  stopTake();
  stopRefSegment();
  body.innerHTML = `<div class="practice-confirm" role="alert"><p>Tienes una práctica sin enviar. ¿Descartarla?</p>
    <div class="practice-actions"><button type="button" class="btn small" data-discard>Descartar</button>
    <button type="button" class="btn small quiet" data-back>Volver</button></div></div>`;
  body.querySelector('[data-discard]').addEventListener('click', () => {
    if (!s) return;
    s.pending = null;
    s.send = null;
    action();
  });
  body.querySelector('[data-back]').addEventListener('click', () => { if (s && s.result) renderResults(s.result); });
  focusBody();
}

function renderSetup() {
  cancelFlow();
  const { range, phraseFrom, phraseTo } = s.settings;
  const hop = s.ref.hopMs / 1000;
  const options = selected => s.ref.phrases
    .map(p => `<option value="${p.index}"${p.index === selected ? ' selected' : ''}>Frase ${p.index} · ${formatTime(p.start * hop)}</option>`)
    .join('');
  body.innerHTML = `<form class="practice-setup">
    <p class="practice-warning">${GUIDE_WARNING}</p>
    <p class="practice-latency"><span data-latency></span>
      <button type="button" class="btn small quiet" data-calibrate>Calibrar auriculares</button></p>
    <fieldset><legend>Qué cantar</legend>
      <label class="practice-choice"><input type="radio" name="range" value="full"${range === 'full' ? ' checked' : ''}>
        <span><strong>Canción completa</strong></span></label>
      <label class="practice-choice"><input type="radio" name="range" value="phrases"${range === 'phrases' ? ' checked' : ''}>
        <span><strong>Un fragmento</strong></span></label>
      <div class="practice-range" data-range${range === 'phrases' ? '' : ' hidden'}>
        <label>Desde <select name="from">${options(phraseFrom)}</select></label>
        <label>Hasta <select name="to">${options(phraseTo)}</select></label>
      </div>
    </fieldset>
    <button type="submit" class="btn practice-start">Empezar</button>
  </form>`;
  const form = body.querySelector('form');
  form.addEventListener('change', () => {
    const fd = new FormData(form);
    s.settings.range = fd.get('range');
    const from = Number(fd.get('from'));
    let to = Number(fd.get('to'));
    if (to < from) { to = from; form.elements.to.value = String(to); }
    s.settings.phraseFrom = from;
    s.settings.phraseTo = to;
    form.querySelector('[data-range]').hidden = s.settings.range !== 'phrases';
  });
  const lat = effectiveLatency(s.recorder?.context ?? null);
  form.querySelector('[data-latency]').textContent = `Retraso: ${lat.ms} ms (${LATENCY_SOURCE[lat.source]})`;
  form.querySelector('[data-calibrate]').addEventListener('click', () => calibrate());
  form.addEventListener('submit', e => { e.preventDefault(); startTake(); });
  focusBody();
}

async function ensureRecorder(token, retry) {
  if (s.recorder) return true;
  let rec;
  try { rec = await createRecorder(); }
  catch (err) { if (!stale(token)) renderError(micErrorMessage(err), retry); return false; }
  if (stale(token)) { rec.dispose(); return false; }
  s.recorder = rec;
  return true;
}

// Calibrar auriculares: suenan clics, el tenor canta «ta» con cada uno y se mide cuánto llega tarde su voz.
async function calibrate() {
  cancelFlow();
  const token = s.token;
  if (!(await ensureRecorder(token, calibrate))) return;
  const ctx = s.recorder.context;
  await ctx.resume();
  if (stale(token)) return;
  renderCountdown('Calibrar', 'Ponte los auriculares que vas a usar. Canta «ta» a la vez que cada clic.');
  await wait(2500);
  if (stale(token)) return;
  renderCountdown('♪', 'Canta «ta» con cada clic…');
  s.recorder.start();
  // La grabación llega en bloques de 2048 muestras: el origen puede desviarse unos 20–40 ms; se acepta.
  const origin = ctx.currentTime;
  const first = origin + 0.5;
  const clicksMs = [];
  for (let k = 0; k < LATENCY.clickCount; k++) {
    const t = first + (k * LATENCY.clickIntervalMs) / 1000;
    playClickAt(ctx, t, k === 0);
    clicksMs.push(Math.round((t - origin) * 1000));
  }
  await wait(500 + LATENCY.clickCount * LATENCY.clickIntervalMs + 700);
  const { samples, sampleRate } = s.recorder.stop();
  if (stale(token)) return;
  const r = measureLatency(detectOnsets(samples, sampleRate), clicksMs);
  if (!r.ok) {
    body.innerHTML = `<div class="practice-error" role="alert"><p>No te escuché bien. Inténtalo de nuevo, más cerca del micrófono.</p>
      <div class="practice-actions"><button type="button" class="btn small" data-retry>Reintentar</button>
      <button type="button" class="btn small quiet" data-back>Volver</button></div></div>`;
    body.querySelector('[data-retry]').addEventListener('click', calibrate);
    body.querySelector('[data-back]').addEventListener('click', renderSetup);
    focusBody();
    return;
  }
  saveLatency(r.ms);
  body.innerHTML = `<div class="practice-message"><p>Retraso calibrado: ${r.ms} ms.</p>
    <button type="button" class="btn small" data-back>Volver</button></div>`;
  body.querySelector('[data-back]').addEventListener('click', renderSetup);
  focusBody();
}

function renderCountdown(big, hint) {
  body.innerHTML = `<div class="practice-countdown"><p class="practice-countdown__big">${esc(big)}</p><p>${esc(hint)}</p></div>`;
  focusBody();
}

// Codificador para el envío; si no se puede crear, la toma se analiza igual pero no se envía.
function startEncoder() {
  s.encoder = null;
  try {
    const enc = createTakeEncoder(s.recorder.stream, { maxBytes: s.hooks.limits?.audio_bytes });
    enc.start();
    s.encoder = enc;
  } catch { /* sin codificador */ }
}

async function startTake() {
  cancelFlow();
  const token = s.token;
  const { from, to } = currentRange();
  const hop = s.ref.hopMs / 1000;
  const first = s.ref.phrases[from - 1], last = s.ref.phrases[to - 1];
  const startSec = first.start * hop, durSec = (last.end - first.start) * hop;

  if (!(await ensureRecorder(token, startTake))) return;
  const ctx = s.recorder.context;
  await ctx.resume();
  if (stale(token)) return;

  s.audio.pause();
  seekAudio(token, startSec); // la búsqueda termina durante la cuenta atrás
  for (const n of [3, 2, 1]) {
    renderCountdown(String(n), 'La guía empieza al terminar la cuenta');
    await wait(1000);
    if (stale(token)) return;
  }

  renderCountdown('¡Ya!', 'Empieza la guía');
  try { await playGuide(); }
  catch {
    if (stale(token)) return;
    s.audio.pause();
    renderError('No se pudo reproducir la guía.', startTake);
    return;
  }
  if (stale(token)) return;
  // La grabación y el límite de tiempo cuentan desde que la guía suena.
  s.recorder.start();
  startEncoder();
  const limitSec = durSec + 1;
  renderRecording(limitSec, token, { mode: 'guide', from, to });
}

function renderRecording(limitSec, token, take) {
  const live = LIVE_PITCH;
  body.innerHTML = `<div class="practice-recording">
    <p class="practice-rec"><span class="practice-rec__dot" aria-hidden="true"></span>Grabando…</p>
    <div class="practice-meter" aria-hidden="true"><div class="practice-meter__fill"></div></div>
    ${live ? `<div class="practice-live" aria-hidden="true" data-state="none">
      <p class="practice-live__notes">Objetivo: <strong data-live-target>—</strong> · Tú: <strong data-live-user>—</strong> <span data-live-cents></span></p>
      <canvas class="practice-live__track"></canvas>
      <p class="practice-live__state" data-live-state></p>
    </div>` : ''}
    <div class="practice-progress" role="progressbar" aria-label="Progreso de la grabación" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="practice-progress__fill"></div></div>
    <p class="practice-time"><span data-elapsed>0:00</span> / ${formatTime(limitSec)}</p>
    <button type="button" class="btn practice-stop">Detener</button>
  </div>`;
  const meter = body.querySelector('.practice-meter__fill');
  const bar = body.querySelector('.practice-progress');
  const fill = body.querySelector('.practice-progress__fill');
  const elapsedEl = body.querySelector('[data-elapsed]');
  const stopBtn = body.querySelector('.practice-stop');
  const liveEl = live ? body.querySelector('.practice-live') : null;
  let lastLive = 0;
  const endFrame = live ? s.ref.phrases[take.to - 1]?.end ?? Infinity : Infinity; // la guía sigue sonando tras el fragmento
  const lag = effectiveLatency(s.recorder.context).ms;
  const trail = createTrail();
  const startFrame = live ? s.ref.phrases[take.from - 1]?.start ?? 0 : 0;
  let scale = { center: 60, span: TRACK.minSpan };
  const canvas = liveEl?.querySelector('.practice-live__track');
  const updateLive = () => {
    const { samples, sampleRate } = s.recorder.recent(LIVE.windowMs);
    const user = livePitch(samples, sampleRate, s.recorder.level);
    const target = targetFor(s.ref, s.audio.currentTime, user, { lagMs: lag, endFrame });
    const cents = deviationCents(user, target);
    const st = tuningState(cents);
    const te = s.audio.currentTime - lag / 1000;
    trail.push(te, user, target, st.key);
    liveEl.dataset.state = st.key;
    liveEl.querySelector('[data-live-target]').textContent = target == null ? '—' : noteName(target);
    liveEl.querySelector('[data-live-user]').textContent = user == null ? '—' : noteName(user);
    liveEl.querySelector('[data-live-cents]').textContent = cents == null ? '' : `${cents > 0 ? '+' : ''}${cents} cents`;
    liveEl.querySelector('[data-live-state]').textContent = st.text;
  };
  const drawLive = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const te = s.audio.currentTime - lag / 1000;
    const notes = visibleNotes(s.ref, te, endFrame, startFrame);
    scale = stepScale(scale, targetScale(notes, scale));
    drawTrack(g, { width: w, height: h, te, notes, points: trail.points, scale });
  };
  const t0 = performance.now();
  const tick = () => {
    if (stale(token)) return;
    const elapsed = (performance.now() - t0) / 1000;
    meter.style.width = `${Math.min(100, s.recorder.level * 400)}%`;
    const pct = Math.min(100, (elapsed / limitSec) * 100);
    fill.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    elapsedEl.textContent = formatTime(elapsed);
    const now = performance.now();
    if (liveEl) {
      try { // un fallo del indicador no debe congelar la grabación
        if (now - lastLive >= 100) { lastLive = now; updateLive(); }
        drawLive();
      } catch (err) { console.error(err); }
    }
    s.raf = requestAnimationFrame(tick);
  };
  s.raf = requestAnimationFrame(tick);
  const limit = setTimeout(() => finishTake(token, take), limitSec * 1000);
  s.timers.add(limit);
  stopBtn.addEventListener('click', () => finishTake(token, take));
  stopBtn.focus();
}

async function finishTake(token, take) {
  if (stale(token) || s.finished === token) return;
  s.finished = token;
  cancelAnimationFrame(s.raf);
  s.audio.pause();
  const rec = s.recorder.stop();
  const enc = s.encoder;
  s.encoder = null;
  // Nunca se rechaza: un fallo del codificador solo impide el envío.
  const encoded = enc
    ? enc.stop().then(v => ({ ok: true, ...v }), err => ({ ok: false, message: err && err.message === BAD_TAKE ? BAD_TAKE : NO_ENCODER }))
    : Promise.resolve({ ok: false, message: NO_ENCODER });
  s.take = { ...rec, ...take, durationSeconds: rec.samples.length / rec.sampleRate, encoded };
  await analyzeTake(token);
}

async function analyzeTake(token) {
  renderMessage('Analizando tu toma…');
  const { samples, sampleRate, mode, from, to } = s.take;
  let result, encoded;
  try {
    [result, encoded] = await Promise.all([
      runAnalysis({ samples: samples.slice(), sampleRate, refData: s.ref, mode, phraseFrom: from, phraseTo: to }),
      s.take.encoded,
    ]);
  } catch {
    if (!stale(token)) renderError('No se pudo analizar la toma.', () => analyzeTake(s.token));
    return;
  }
  if (stale(token)) return;
  prepareSend(result, encoded);
  renderResults(result);
}

// Decide si la toma se puede enviar y, si es así, la deja pendiente con un id fijo para los reintentos.
function prepareSend(result, encoded) {
  s.result = result;
  s.pending = null;
  s.send = null;
  if (!result.valid) return;
  if (!(result.isFull && result.mode === 'guide')) { s.send = { state: 'fragment' }; return; }
  if (!encoded.ok) { s.send = { state: 'unavailable', message: encoded.message }; return; }
  s.pending = {
    id: crypto.randomUUID(),
    blob: encoded.blob,
    mimeType: encoded.mimeType,
    durationSeconds: s.take.durationSeconds,
    analysis: compactAnalysis(result),
  };
  s.send = { state: 'ready' };
}

function sendStatusMarkup() {
  const st = s.send;
  if (!st) return '';
  if (st.state === 'fragment') return '<p class="practice-send__note">Para enviar a jefatura, canta la canción completa.</p>';
  if (st.state === 'unavailable') return `<p class="practice-send__note">${esc(st.message)}</p>`;
  if (st.state === 'confirm') {
    return `<div class="practice-send__confirm"><p>Jefatura podrá escuchar esta práctica y ver su análisis.</p>
      <div class="practice-actions"><button type="button" class="btn small" data-act="send-confirm">Enviar</button>
      <button type="button" class="btn small quiet" data-act="send-cancel">Cancelar</button></div></div>`;
  }
  if (st.state === 'sending') return '<p class="practice-send__note">Enviando tu práctica…</p>';
  if (st.state === 'sent') return '<p class="practice-send__ok">Práctica enviada. Ya aparece en Mis grabaciones.</p>';
  if (st.state === 'error') {
    return `<div class="practice-send__err" role="alert"><p>${esc(`${st.message} Tu práctica se conserva; pulsa Enviar para reintentar.`)}</p>
      <button type="button" class="btn small" data-act="send-confirm">Enviar</button></div>`;
  }
  return '';
}

// Refresca solo la zona de envío y el botón «Enviar a jefatura», sin tocar la gráfica ni la toma en reproducción.
// `focus`: selector del control que recibe el foco, `false` para no moverlo o, por defecto, el primer botón de la zona.
function updateSend(focus) {
  const area = body.querySelector('[data-send]');
  if (!area) return;
  area.innerHTML = sendStatusMarkup();
  area.hidden = !area.innerHTML;
  const btn = body.querySelector('[data-act="send"]');
  if (btn) btn.hidden = s.send?.state !== 'ready';
  const sending = s.send?.state === 'sending';
  body.querySelectorAll('[data-act="repeat"], [data-act="setup"], [data-act="drill"]').forEach(b => { b.disabled = sending; });
  if (focus === false) return;
  const target = typeof focus === 'string' ? body.querySelector(focus) : area.querySelector('button');
  if (target && !target.hidden) target.focus({ preventScroll: true });
}

async function sendTake() {
  const session = s, take = s.pending;
  if (!take || s.send?.state === 'sending') return;
  s.send = { state: 'sending' };
  updateSend();
  try {
    await session.hooks.send(take);
    if (s !== session) return;
    if (s.pending === take) s.pending = null;
    s.send = { state: 'sent' };
  } catch (err) {
    if (s !== session) return;
    s.send = { state: 'error', message: (err && err.message) || 'No se pudo enviar la práctica.' };
  }
  updateSend();
}

function renderResults(r) {
  if (!r.valid) {
    body.innerHTML = `<div class="practice-error" role="alert">
      <p>No se detectó suficiente voz. Acércate al micrófono o canta más fuerte.</p>
      <div class="practice-actions">
        <button type="button" class="btn small" data-act="repeat">Repetir</button>
        <button type="button" class="btn small quiet" data-act="setup">Cambiar ajustes</button>
      </div></div>`;
  } else {
    body.innerHTML = analysisMarkup(r, {
      interactive: true,
      extra: `<div class="practice-phrase-actions" hidden>
        <button type="button" class="btn small quiet" data-act="listen">Escuchar referencia</button>
        <button type="button" class="btn small" data-act="drill">Practicar esta frase</button>
      </div>
      <div class="practice-send" data-send aria-live="polite" hidden></div>
      <div class="practice-actions">
        <button type="button" class="btn small" data-act="send" hidden>Enviar a jefatura</button>
        <button type="button" class="btn small quiet" data-act="take">Escuchar mi toma</button>
        <button type="button" class="btn small" data-act="repeat">Repetir</button>
        <button type="button" class="btn small quiet" data-act="setup">Cambiar ajustes</button>
      </div>`,
    });
  }
  let selected = null;
  body.firstElementChild.addEventListener('click', e => {
    const phrase = e.target.closest('[data-phrase]');
    if (phrase) {
      selected = Number(phrase.dataset.phrase);
      body.querySelectorAll('[data-phrase]').forEach(b => b.setAttribute('aria-expanded', String(b === phrase)));
      body.querySelector('.practice-phrase-actions').hidden = false;
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'repeat') guardPending(startTake);
    else if (act === 'setup') guardPending(renderSetup);
    else if (act === 'take') toggleTake(btn);
    else if (act === 'listen' && selected) playRefPhrase(selected);
    else if (act === 'drill' && selected) {
      const index = selected;
      guardPending(() => {
        Object.assign(s.settings, { range: 'phrases', phraseFrom: index, phraseTo: index });
        renderSetup();
      });
    }
    else if (act === 'send') { s.send = { state: 'confirm' }; updateSend(); }
    else if (act === 'send-cancel') { s.send = { state: 'ready' }; updateSend('[data-act="send"]'); }
    else if (act === 'send-confirm') sendTake();
  });
  if (r.valid) updateSend(false); // el foco lo coloca focusBody
  focusBody();
}

function toggleTake(btn) {
  if (s.takeSource) { stopTake(); btn.textContent = 'Escuchar mi toma'; return; }
  stopRefSegment();
  const ctx = s.recorder.context;
  const { samples, sampleRate } = s.take;
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(samples, 0);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.onended = () => { if (s && s.takeSource === src) { s.takeSource = null; btn.textContent = 'Escuchar mi toma'; } };
  src.start();
  s.takeSource = src;
  btn.textContent = 'Detener mi toma';
}

function stopTake() {
  if (!s || !s.takeSource) return;
  const src = s.takeSource;
  s.takeSource = null;
  try { src.stop(); } catch { /* ya detenida */ }
}

function playRefPhrase(index) {
  stopRefSegment();
  stopTake();
  const p = s.ref.phrases[index - 1], hop = s.ref.hopMs / 1000;
  const end = p.end * hop;
  const onTime = () => { if (s.audio.currentTime >= end) stopRefSegment(); };
  s.refStop = () => { s.audio.pause(); s.audio.removeEventListener('timeupdate', onTime); s.refStop = null; };
  s.audio.addEventListener('timeupdate', onTime);
  seekAndPlay(s.token, p.start * hop);
}

function stopRefSegment() {
  if (s && s.refStop) s.refStop();
}
