// 1. Crea una hoja de Google Sheets y copia el ID de su URL.
// 2. Reemplaza este valor antes de desplegar la aplicación web.
const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_HOJA';
const SHEET_NAME = 'Respuestas Tenores';
const HEADERS = [
  'Fecha y hora',
  'ID de envío',
  'Dos prioridades',
  'Preparación realista',
  'Dificultades',
  'Claridad del objetivo (1-5)',
  'Apoyo necesario'
];
const PRIORITIES = [
  'Constancia en los ensayos',
  'Preparación individual',
  'Calidad vocal',
  'Puntualidad',
  'Escucha y unidad al cantar',
  'Apoyo entre compañeros'
];
const PREPARATION = [
  'Cambiar parte de mi música habitual por las canciones que ensayamos',
  'Practicar 20 minutos diarios por mi cuenta',
  'Practicar 40 minutos diarios por mi cuenta',
  'Practicar más de una hora al día por mi cuenta'
];

// Ejecuta esta función una vez desde el editor para crear los encabezados
// y autorizar el acceso del script a la hoja.
function prepararHoja() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function doGet() {
  return HtmlService.createHtmlOutput('Encuesta de Tenores: endpoint activo. Abre el formulario para enviar una respuesta.');
}

function doPost(e) {
  const data = e && e.parameter ? e.parameter : {};
  const nonce = String(data.nonce || '').slice(0, 100);
  try {
    // Campo trampa: los navegadores normales lo envían vacío.
    if (data.website) return reply_(nonce, true);
    if (!/^[A-Za-z0-9-]{10,100}$/.test(nonce)) throw new Error('ID de envío inválido');

    const priorities = JSON.parse(String(data.q1 || '[]'));
    const preparation = String(data.q2 || '');
    const difficulties = String(data.q3 || '').trim();
    const clarity = String(data.q4 || '');
    const support = String(data.q5 || '').trim();
    if (!Array.isArray(priorities) || priorities.length !== 2 || new Set(priorities).size !== 2 || priorities.some(item => !PRIORITIES.includes(item))) throw new Error('Prioridades inválidas');
    if (!PREPARATION.includes(preparation)) throw new Error('Preparación inválida');
    if (!difficulties || difficulties.length > 600) throw new Error('Dificultades inválidas');
    if (!/^[1-5]$/.test(clarity)) throw new Error('Escala inválida');
    if (!support || support.length > 600) throw new Error('Apoyo inválido');

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = prepararHoja();
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const existing = sheet.getRange(2, 2, lastRow - 1, 1).createTextFinder(nonce).matchEntireCell(true).findNext();
        if (existing) return reply_(nonce, true);
      }
      sheet.appendRow([
        new Date(),
        nonce,
        safeCell_(priorities.join(' · ')),
        safeCell_(preparation),
        safeCell_(difficulties),
        Number(clarity),
        safeCell_(support)
      ]);
    } finally {
      lock.releaseLock();
    }
    return reply_(nonce, true);
  } catch (error) {
    console.error(error);
    return reply_(nonce, false);
  }
}

// Impide que una respuesta escrita por un visitante se interprete como fórmula.
function safeCell_(value) {
  const text = String(value);
  return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
}

// El formulario de GitHub Pages envía a un iframe oculto. Esta respuesta
// confirma al navegador que Google Sheets guardó efectivamente la fila.
function reply_(nonce, ok) {
  const message = JSON.stringify({ type: 'TENORES_ENCUESTA_RESULT', nonce: nonce, ok: ok }).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage(' + message + ', "*");</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
