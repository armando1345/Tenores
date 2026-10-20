import { renderChart } from './chart.js';
import { formatTime } from './util.js';

// Marcado del análisis de una toma: el mismo para la pantalla de resultados y para la biblioteca.
export const METRICS = [['pitch', 'Afinación'], ['rhythm', 'Ritmo y entradas', 'No cuenta en la nota'], ['stability', 'Estabilidad']];

export const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const band = v => (v == null ? 'none' : v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad');
const num = v => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—');

function phraseItem(p, interactive) {
  const inner = `Frase ${num(p.index)}<small>${formatTime(p.start)}–${formatTime(p.end)}</small>`;
  const cls = `practice-phrase score--${band(p.pitch)}`;
  return interactive
    ? `<button type="button" class="${cls}" data-phrase="${num(p.index)}" aria-expanded="false">${inner}</button>`
    : `<span class="${cls} practice-phrase--static">${inner}</span>`;
}

// `interactive`: frases como botones (pantalla en vivo). `extra`: HTML añadido al final del bloque.
export function analysisMarkup(r, { interactive = false, extra = '' } = {}) {
  const scores = r.scores || {};
  const tips = Array.isArray(r.tips) ? r.tips : [];
  const phrases = Array.isArray(r.phrases) ? r.phrases : [];
  return `<div class="practice-results">
      <div class="practice-score score--${band(scores.total)}">
        <span class="practice-score__value">${num(scores.total)}</span><span class="practice-score__label">Puntuación</span></div>
      <ul class="practice-metrics">${METRICS.map(([k, label, note]) =>
        `<li class="score--${band(scores[k])}"><span>${label}</span><strong>${num(scores[k])}</strong>${note ? `<small class="practice-metric__note">${note}</small>` : ''}</li>`).join('')}</ul>
      ${tips.length ? `<h3 class="practice-subtitle">Qué mejorar</h3><ul class="practice-tips">${tips.map(t => `<li>${esc(t && typeof t === 'object' ? t.text : t)}</li>`).join('')}</ul>` : ''}
      ${r.curves ? `<div class="practice-chart-wrap">${renderChart(r.curves, phrases)}
        <p class="practice-legend"><span class="legend-ref">Referencia</span><span class="legend-user">Tu voz</span></p></div>` : ''}
      ${phrases.length ? `<h3 class="practice-subtitle">Frases</h3>
      <div class="practice-phrases">${phrases.map(p => phraseItem(p, interactive)).join('')}</div>` : ''}
      ${extra}</div>`;
}
