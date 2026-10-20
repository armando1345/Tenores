import { openPractice, closePractice, hasPendingTake } from './practice-ui.js';
import { analysisMarkup } from './result-view.js';
import { isRecordingSupported } from './recorder.js';
import { referenceFromUrl } from './reference-builder.js';
import { assertCloudinary } from './reference-source.js';
import { renderChart } from './chart.js';
import { formatTime } from './util.js';

// Punto de entrada de la práctica para platform.js (script clásico): expone la API en window.
function isSupported() {
  try { return isRecordingSupported() && !!window.MediaRecorder; } catch { return false; }
}

async function generateReference(song) {
  assertCloudinary(song.reference_audio_key);
  return referenceFromUrl(song.id, song.reference_audio_key);
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Vista previa de una curva recién generada, antes de guardarla.
function referencePreviewMarkup(ref) {
  const hop = ref.hopMs / 1000;
  const phrases = ref.phrases.map(p => ({ index: p.index, start: p.start * hop, end: p.end * hop, pitch: null }));
  const chart = renderChart({ ref: ref.midi, user: null, hopMs: ref.hopMs, startSec: 0 }, phrases);
  return `<div class="practice-ref-preview">
    <p class="practice-ref-preview__meta">${plural(ref.phrases.length, 'frase', 'frases')} · ${plural(ref.notes.length, 'nota', 'notas')} · ${formatTime(ref.frameCount * hop)}</p>
    <div class="practice-chart-wrap">${chart}
      <p class="practice-legend"><span class="legend-ref">Referencia</span></p></div></div>`;
}

window.tenoresPractice = {
  isSupported,
  open: openPractice,
  close: closePractice,
  hasPendingTake,
  analysisMarkup,
  generateReference,
  referencePreviewMarkup,
};
document.dispatchEvent(new Event('tenores-practice-ready'));
