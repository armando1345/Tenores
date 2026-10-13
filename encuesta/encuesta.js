(() => {
  'use strict';

  const steps = [...document.querySelectorAll('.step')];
  const card = document.querySelector('.survey-card');
  const success = document.getElementById('success');
  const error = document.getElementById('form-error');
  const backButton = document.getElementById('back-button');
  const nextButton = document.getElementById('next-button');
  const sendButton = document.getElementById('send-button');
  const progress = document.querySelector('.progress-track');
  const progressFill = document.getElementById('progress-fill');
  const stepCount = document.getElementById('step-count');
  const questionLabels = [
    'Dos cosas que nos acercarán a la meta',
    'Preparación durante cuatro semanas',
    'Dificultades para prepararte',
    'Claridad del objetivo de la temporada',
    'Apoyo que necesitas'
  ];
  let currentStep = 0;
  let submissionId = '';
  let pendingTimer = null;
  let submitting = false;
  let transportForm = null;

  const selected = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);

  function answers() {
    return {
      q1: selected('q1'),
      q2: selected('q2')[0] || '',
      q3: document.getElementById('q3').value.trim(),
      q4: selected('q4')[0] || '',
      q5: document.getElementById('q5').value.trim()
    };
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    error.textContent = '';
    error.hidden = true;
  }

  function updateReview() {
    const a = answers();
    const values = [a.q1.join(' · '), a.q2, a.q3, `${a.q4} de 5`, a.q5];
    const list = document.getElementById('review-list');
    list.replaceChildren();
    questionLabels.forEach((label, index) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = values[index];
      row.append(term, description);
      list.append(row);
    });
  }

  function showStep(index) {
    currentStep = index;
    clearError();
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
    const isReview = index === 5;
    stepCount.textContent = isReview ? 'REVISIÓN FINAL' : `PREGUNTA ${String(index + 1).padStart(2, '0')} / 05`;
    progress.setAttribute('aria-valuenow', String(Math.min(index + 1, 5)));
    progressFill.style.width = `${Math.min((index + 1) * 20, 100)}%`;
    backButton.hidden = index === 0;
    nextButton.hidden = isReview;
    sendButton.hidden = !isReview;
    if (isReview) updateReview();
    steps[index].querySelector('h2').focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 790px)').matches) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateStep(index) {
    const a = answers();
    if (index === 0 && a.q1.length !== 2) return 'Elige exactamente dos cosas para continuar.';
    if (index === 1 && !a.q2) return 'Elige la preparación que puedes mantener.';
    if (index === 2 && !a.q3) return 'Escribe tu respuesta. Si no prevés dificultades, puedes poner «Ninguna».';
    if (index === 3 && !a.q4) return 'Marca un número del 1 al 5.';
    if (index === 4 && !a.q5) return 'Cuéntanos qué apoyo necesitas. Si no necesitas algo específico, puedes indicarlo.';
    return '';
  }

  document.querySelectorAll('input[name="q1"]').forEach(input => {
    input.addEventListener('change', () => {
      const count = selected('q1').length;
      if (count > 2) {
        input.checked = false;
        showError('Puedes elegir solo dos opciones. Desmarca una si quieres cambiarla.');
      } else clearError();
      document.getElementById('q1-count').textContent = `${selected('q1').length} de 2 elegidas`;
    });
  });

  ['q3', 'q5'].forEach(id => {
    const field = document.getElementById(id);
    const count = document.getElementById(`${id}-count`);
    field.addEventListener('input', () => { count.textContent = String(field.value.length); clearError(); });
  });
  document.querySelectorAll('input[name="q2"], input[name="q4"]').forEach(input => input.addEventListener('change', clearError));

  nextButton.addEventListener('click', () => {
    const message = validateStep(currentStep);
    if (message) { showError(message); return; }
    showStep(currentStep + 1);
  });
  backButton.addEventListener('click', () => { if (currentStep > 0 && !submitting) showStep(currentStep - 1); });

  function stopSubmitting() {
    submitting = false;
    transportForm?.remove();
    transportForm = null;
    sendButton.disabled = false;
    sendButton.innerHTML = 'Enviar respuestas <span aria-hidden="true">→</span>';
    clearTimeout(pendingTimer);
  }

  window.addEventListener('message', event => {
    const data = event.data;
    if (!submitting || !data || data.type !== 'TENORES_ENCUESTA_RESULT' || data.nonce !== submissionId) return;
    let host;
    try { host = new URL(event.origin).hostname; } catch { return; }
    if (host !== 'script.google.com' && host !== 'script.googleusercontent.com' && !host.endsWith('.googleusercontent.com')) return;
    stopSubmitting();
    if (!data.ok) { showError('No pudimos guardar tu respuesta. Inténtalo de nuevo.'); return; }
    card.hidden = true;
    success.hidden = false;
    success.querySelector('h2').focus({ preventScroll: true });
  });

  sendButton.addEventListener('click', () => {
    if (submitting) return;
    const endpoint = String(window.TENORES_ENCUESTA_ENDPOINT || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint)) {
      showError('La encuesta todavía no está conectada a Google Sheets. Configura la URL de Apps Script antes de compartirla.');
      return;
    }
    for (let index = 0; index < 5; index++) {
      const message = validateStep(index);
      if (message) { showStep(index); showError(message); return; }
    }

    const a = answers();
    submissionId ||= (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const payload = { nonce: submissionId, q1: JSON.stringify(a.q1), q2: a.q2, q3: a.q3, q4: a.q4, q5: a.q5, website: '' };
    transportForm?.remove();
    const transport = document.createElement('form');
    transport.method = 'POST';
    transport.action = endpoint;
    transport.target = 'response-frame';
    transport.hidden = true;
    Object.entries(payload).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      transport.append(input);
    });
    document.body.append(transport);
    transportForm = transport;
    submitting = true;
    clearError();
    sendButton.disabled = true;
    sendButton.textContent = 'Enviando…';
    pendingTimer = setTimeout(() => {
      if (!submitting) return;
      stopSubmitting();
      showError('No recibimos confirmación de Google Sheets. Puedes volver a intentarlo; no se duplicará tu respuesta.');
    }, 45000);
    transport.submit();
  });
})();
