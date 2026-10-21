import { renderChart } from './chart.js';
import { formatTime } from './util.js';

// Marcado del análisis de una toma: el mismo para la pantalla de resultados y para la biblioteca.
export const METRICS = [['stability', 'Estabilidad'], ['rhythm', 'Ritmo y entradas', 'No cuenta en la nota total']];

export const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const band = v => (v == null ? 'none' : v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad');
const num = v => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—');

function phraseItem(p, interactive) {
  const inner = `Frase ${num(p.index)}<small>${formatTime(p.start)}–${formatTime(p.end)}</small><small class="practice-phrase-score">Entonación ${num(p.pitch)} · Estabilidad ${num(p.stability)} · Ritmo ${num(p.rhythm)}</small>`;
  const cls = `practice-phrase score--${band(p.pitch)}`;
  return interactive
    ? `<button type="button" class="${cls}" data-phrase="${num(p.index)}" aria-pressed="false">${inner}</button>`
    : `<span class="${cls} practice-phrase--static">${inner}</span>`;
}

// `interactive`: frases como botones (pantalla en vivo). `extra`: HTML añadido al final del bloque.
export function analysisMarkup(r, { interactive = false, extra = '', reviewing = false, phraseActions = '' } = {}) {
  const scores = r.scores || {};
  const tips = Array.isArray(r.tips) ? r.tips : [];
  const phrases = Array.isArray(r.phrases) ? r.phrases : [];
  return `<div class="practice-results">
      <div class="practice-result-heading"><p class="practice-eyebrow">Resultados de la prueba</p><p class="practice-result-scale">Escala de 0 a 100 puntos</p></div>
      <div class="practice-result-lead">
        <div class="practice-intonation score--${band(scores.pitch)}"><span class="practice-score__label">Entonación</span><strong class="practice-intonation__value">${num(scores.pitch)}</strong><span class="practice-result-unit">puntos</span></div>
        <div class="practice-score score--${band(scores.total)}"><span class="practice-score__label">Similitud total</span><span class="practice-score__value">${num(scores.total)}</span><span class="practice-result-unit">puntos</span><small>Entonación y estabilidad</small></div>
      </div>
      <ul class="practice-metrics">${METRICS.map(([k, label, note]) =>
        `<li class="score--${band(scores[k])}"><span>${label}</span><strong>${num(scores[k])}</strong>${note ? `<small class="practice-metric__note">${note}</small>` : ''}</li>`).join('')}</ul>
      ${tips.length ? `<h3 class="practice-subtitle">Qué mejorar</h3><ul class="practice-tips">${tips.map(t => `<li>${esc(t && typeof t === 'object' ? t.text : t)}</li>`).join('')}</ul>` : ''}
      ${r.curves ? `<div class="practice-chart-wrap">${renderChart(r.curves, phrases)}
        <p class="practice-legend"><span class="legend-ref">Referencia</span><span class="legend-user">${reviewing?'Voz del tenor':'Tu voz'}</span></p></div>` : ''}
      ${phrases.length ? (interactive ? `<details class="practice-fragment-review"><summary><span><strong>Repasar un fragmento</strong><small>Escucha la referencia y practica una parte concreta</small></span><span class="practice-fragment-count">${phrases.length} ${phrases.length===1?'frase':'frases'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="practice-fragment-content"><p class="practice-fragment-hint">Elige la frase que quieres repasar</p><div class="practice-phrases">${phrases.map(p => phraseItem(p, true)).join('')}</div>${phraseActions}</div></details>` : `<h3 class="practice-subtitle">Frases</h3><div class="practice-phrases">${phrases.map(p => phraseItem(p, false)).join('')}</div>`) : ''}
      ${extra}</div>`;
}
