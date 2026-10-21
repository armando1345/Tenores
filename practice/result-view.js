import { renderChart } from './chart.js';
import { formatTime } from './util.js';

// Marcado del análisis de una toma: el mismo para la pantalla de resultados y para la biblioteca.
export const METRICS = [
  ['pitch', 'Entonación', 'Qué tanto coinciden tus notas con la referencia'],
  ['stability', 'Estabilidad', 'Qué tan firme mantienes cada nota'],
  ['rhythm', 'Ritmo y entradas', 'Si empiezas las notas en el momento de la referencia'],
];

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
export function analysisMarkup(r, { interactive = false, extra = '', reviewing = false, phraseActions = '', reviewTracks = '' } = {}) {
  const scores = r.scores || {};
  const tips = Array.isArray(r.tips) ? r.tips : [];
  const phrases = Array.isArray(r.phrases) ? r.phrases : [];
  const chart = r.curves?.ref?.length ? `<div class="practice-chart-wrap">${renderChart(r.curves, phrases)}<div class="practice-chart-times" aria-hidden="true"><span>${formatTime(r.curves.startSec||0)}</span><span>${formatTime((r.curves.startSec||0)+(r.curves.ref.length-1)*r.curves.hopMs/1000)}</span></div><p class="practice-legend"><span class="legend-ref">Referencia</span><span class="legend-user">${reviewing?'Voz del tenor':'Tu voz'}</span></p></div>` : '';
  return `<div class="practice-results">
      <div class="practice-result-heading"><p class="practice-eyebrow">Resultados de la prueba</p></div>
      <div class="practice-result-lead">
        <div class="practice-score practice-overall score--${band(scores.total)}"><span class="practice-score__label">Similitud total</span><div class="practice-overall-number"><span class="practice-score__value">${num(scores.total)}</span><span class="practice-result-unit">/ 100<span>puntos</span></span></div><p class="practice-overall-description">${reviewing?'Qué tanto se parece la prueba a la referencia':'Qué tanto se parece tu prueba a la referencia'}</p></div>
      </div>
      <ul class="practice-metrics" aria-label="Desglose de la puntuación">${METRICS.map(([k, label, description]) =>
        `<li class="practice-metric--${k} score--${band(scores[k])}"><span>${label}</span><strong${k==='pitch'?' class="practice-intonation__value"':''}>${num(scores[k])}</strong><small class="practice-metric__description">${scores[k]==null?'Sin datos suficientes para esta medida':description}</small>${k==='rhythm'?'<small class="practice-metric__note">Informativo · No cuenta en la nota total</small>':''}</li>`).join('')}</ul>
      ${reviewTracks}
      ${tips.length ? `<h3 class="practice-subtitle">Para la próxima práctica</h3><ul class="practice-tips">${tips.map(t => `<li>${esc(t && typeof t === 'object' ? t.text : t)}</li>`).join('')}</ul>` : ''}
      ${chart ? (interactive?`<details class="practice-voice-detail"><summary><span><strong>Comparar la voz con la referencia</strong><small>Ve en qué partes coinciden y en cuáles hay diferencias</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>${chart}<p class="practice-chart-help">La línea verde es tu voz y la blanca es la referencia. Cuanto más se acercan, más parecidas son las notas.</p></details>`:`<h3 class="practice-subtitle">Comparación con la referencia</h3>${chart}`) : ''}
      ${phrases.length ? (interactive ? `<details class="practice-fragment-review"><summary><span><strong>Repasar un fragmento</strong><small>Escucha la referencia y practica una parte concreta</small></span><span class="practice-fragment-count">${phrases.length} ${phrases.length===1?'frase':'frases'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="practice-fragment-content"><p class="practice-fragment-hint">Elige la frase que quieres repasar</p><div class="practice-phrases">${phrases.map(p => phraseItem(p, true)).join('')}</div>${phraseActions}</div></details>` : `<h3 class="practice-subtitle">Frases</h3><div class="practice-phrases">${phrases.map(p => phraseItem(p, false)).join('')}</div>`) : ''}
      ${extra}</div>`;
}
