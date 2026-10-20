# Práctica con guía y análisis de la voz · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir «Subir mi práctica» por la práctica con guía del motor de Marco, enviar a jefatura la toma completa con su audio y su análisis real, y permitir a jefatura generar curvas de referencia.

**Architecture:** El motor entra como carpeta de módulos ES `practice/` (copiada de `Tenores-main`) y se expone a `platform.js` (script clásico) mediante `window.tenoresPractice`. El Worker gana una migración aditiva (análisis y nota en `recordings`, tabla `song_references`), validaciones en `server/domain.mjs` y rutas nuevas; las 12 curvas existentes se cargan con una migración de datos generada por script.

**Tech Stack:** JavaScript sin dependencias (módulos ES + script clásico), Web Audio (AudioWorklet), MediaRecorder, Cloudflare Workers + D1 + R2, `node:test` con Node 24.

**Spec:** `docs/superpowers/specs/2026-10-20-practica-con-analisis-design.md`

**Repositorio:** `C:\Users\Marco\Downloads\Compressed\Tenores-plataforma-2026`, rama `feature/practica-con-analisis`. **Motor fuente (`MOTOR`):** `C:\Users\Marco\Downloads\Compressed\Tenores-main\Tenores-main` (rama `main`).

## Global Constraints

- Sin dependencias de ejecución ni bundler; `scripts/build.mjs` publica solo lo que su lista permite.
- CSP de `_headers` sin cambios: `script-src 'self'`, `connect-src 'self' https://res.cloudinary.com …`, `media-src 'self' https: blob:`.
- Mismo origen, cookie de sesión y cabecera `X-CSRF-Token` (como `api()` de `platform.js`); nunca `Authorization: Bearer`.
- El Worker no analiza audio ni curvas: solo valida forma y tamaño y guarda.
- D1: solo migraciones nuevas y aditivas (`0006`, `0007`); no editar `0001`–`0005`. Ninguna sentencia SQL supera 100 KB.
- Límites de `app_limits` (bytes, segundos, envíos diarios, almacenamiento) se aplican igual que hoy.
- Solo se envía una toma **con guía, completa y válida**; las tomas no enviadas no se guardan en ningún sitio.
- Modo «Ponerme a prueba» eliminado de la interfaz; fragmentos solo para practicar.
- Ninguna «similitud 90 %» ni segmentos inventados en ninguna vista.
- Textos en español con tildes. Commits sin `Co-Authored-By` ni atribución de IA.
- Pruebas: `npm test` (= `node --test tests/*.test.mjs`) siempre en verde al terminar cada tarea.

## Review Focus

1. **R2 sin configurar (503 en la reserva)** → el tenor ve el mensaje del servidor y conserva su toma para reintentar → test en Task 6 (cliente).
2. **Jefatura cambia la URL de referencia de una canción con curva** → la canción deja de ofrecer práctica y su curva no se sirve; las grabaciones ya enviadas siguen mostrando su análisis → test en Task 4.
3. **Reintento de reserva con el mismo id tras un fallo de red** → no duplica y acepta el mismo análisis; con otra nota responde 409 → test en Task 4.
4. **Canción larga (160 s)** → el análisis compactado cabe en el límite de 256 KB → test en Task 3.
5. **Referencia fuera de Cloudinary al generar curva** → mensaje claro sin intentar descargar → test en Task 3.

---

### Task 1: Motor de práctica dentro de la plataforma

**Files:**
- Create (copias exactas desde `MOTOR/practice/`): `practice/align.js`, `analysis-client.js`, `analysis-worker.js`, `analyze.js`, `chart.js`, `latency.js`, `live-pitch.js`, `live-track.js`, `pitch.js`, `recorder.js`, `recorder-worklet.js`, `reference.js`, `reference-builder.js`, `score.js`, `scoring-config.js`, `segment.js`, `tips.js`, `tones.js`, `util.js`, `practice.css`
- Create (copias desde `MOTOR/test/`): `tests/helpers/melody.js`, `tests/helpers/synth.js`, `tests/helpers/wav.js`, y `tests/engine-<nombre>.test.mjs` por cada uno de `align, analysis-client, analyze, chart, latency, live-pitch, live-track, pitch, reference-builder, reference, score, segment, tips, util`
- Modify: `practice/recorder.js` (exponer `stream`), `scripts/build.mjs`, `tests/platform.test.mjs` (regresión del paquete)

**Interfaces:**
- Produces: los módulos del motor con la misma API que en `MOTOR`; `createRecorder()` devuelve además `stream: MediaStream`.

- [ ] **Step 1:** Crear la rama si no existe (`git checkout feature/practica-con-analisis`) y copiar módulos y pruebas. Las pruebas conservan sus imports `../practice/…` y `./helpers/…`; solo cambia la extensión del archivo de prueba a `.test.mjs` y el prefijo `engine-`.
- [ ] **Step 2:** Run `npm test` → Expected: las pruebas del motor y las 20 existentes pasan.
- [ ] **Step 3: Test que falla** — en `tests/platform.test.mjs`, nueva prueba «El paquete público incluye el motor de práctica»: ejecutar `node scripts/build.mjs` (con `execFileSync(process.execPath, ['scripts/build.mjs'])`) y comprobar que existen `dist/practice/analyze.js`, `dist/practice/recorder-worklet.js`, `dist/practice/practice.css` y que **no** existen `dist/tests`, `dist/server`, `dist/migrations`.
- [ ] **Step 4:** Run `node --test tests/platform.test.mjs` → FAIL (no existe `dist/practice/analyze.js`).
- [ ] **Step 5:** `scripts/build.mjs`: copiar `practice/` completo a `dist/practice` filtrando solo `.js` y `.css`.
- [ ] **Step 6:** `practice/recorder.js`: incluir `stream` en el objeto devuelto por `createRecorder()` (sin otros cambios). Run `npm test` → PASS.
- [ ] **Step 7: Commit** — `feat(practica): motor de análisis de la voz dentro de la plataforma`

---

### Task 2: Esquema y curvas de referencia en D1

**Files:**
- Create: `migrations/0006_practice_analysis.sql`, `scripts/build-reference-migration.mjs`, `migrations/0007_song_references_data.sql` (generado), `tests/fixtures/fum-reference.json` (copia de `MOTOR/assets/pitch/fum.json`)
- Test: `tests/platform.test.mjs`

**Interfaces:**
- Produces: columnas `recordings.analysis TEXT NULL`, `recordings.score INTEGER NULL CHECK(score BETWEEN 0 AND 100)`; tabla `song_references(song_id TEXT PRIMARY KEY REFERENCES songs(id), source TEXT NOT NULL, reference TEXT NOT NULL, created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')))`.
- Produces: `node scripts/build-reference-migration.mjs <carpeta-de-curvas>` escribe `migrations/0007_song_references_data.sql`.

- [ ] **Step 1: Test que falla** — «Las 12 curvas existentes se cargan íntegras»: `LocalD1().migrate()`; `SELECT COUNT(*) FROM song_references` = 12; para cada fila, `JSON.parse(reference)` tiene `phrases.length > 0`, `hopMs === 10` y `source === songs.reference_audio_key` de su canción; la fila de `fum` es `deepEqual` a `MOTOR/assets/pitch/fum.json` leído desde una copia de fixture `tests/fixtures/fum-reference.json` (copiar ese archivo).
- [ ] **Step 2:** Run → FAIL (no existe la tabla).
- [ ] **Step 3:** Escribir `0006` con el esquema de Interfaces.
- [ ] **Step 4:** Escribir el script: por cada `<id>.json` de la carpeta (excepto `index.json`), `INSERT INTO song_references(song_id,source,reference) SELECT id, '<source>', '<trozo1>' FROM songs WHERE legacy_key='<id>' AND reference_audio_key='<source>';` y, para el resto, `UPDATE song_references SET reference = reference || '<trozo>' WHERE song_id=(SELECT id FROM songs WHERE legacy_key='<id>' AND reference_audio_key='<source>');`. Trozos de ≤ 90 000 caracteres, comillas simples escapadas como `''`, JSON minificado con `JSON.stringify`. Cabecera del archivo: comentario «Generado por scripts/build-reference-migration.mjs; no editar a mano.»
- [ ] **Step 5:** Run `node scripts/build-reference-migration.mjs "C:/Users/Marco/Downloads/Compressed/Tenores-main/Tenores-main/assets/pitch"`, luego `npm test` → PASS. Comprobar con un test adicional que ninguna sentencia de `0007` (usar `sqlStatements` de `scripts/sql-statements.mjs`) supera 100 000 bytes.
- [ ] **Step 6: Commit** — `feat(practica): curvas de referencia y análisis de prácticas en D1`

---

### Task 3: Validaciones del servidor y del cliente (puras)

**Files:**
- Modify: `server/domain.mjs`
- Create: `practice/compact.js`, `practice/reference-source.js`
- Test: `tests/platform.test.mjs`, `tests/practice-client.test.mjs`

**Interfaces:**
- Produces (servidor): `practiceAnalysis(raw, songId) → { json: string, score: number }`; lanza `HttpError` 400, o 413 si `json.length > 262144`. Exige: objeto; `engineVersion` texto ≤ 20; `mode === 'guide'`; `isFull === true`; `valid === true`; `songId === songId`; `scores.total` entero 0–100; `tips`, `phrases` arrays; `curves.ref` array.
- Produces (servidor): `referencePayload(raw, song) → string` (JSON con `songId = song.id`); 409 «La referencia de la canción cambió; vuelve a generar la curva.» si `raw.source !== song.reference_audio_key`; 400 si `hopMs !== 10`, `midi` vacío, `phrases` vacío o alguna frase sin `start < end`; 413 si supera 163 840 caracteres.
- Produces (cliente): `compactAnalysis(result) → result` con `curves.ref`/`curves.user` submuestreados (factor entero mínimo para que `length ≤ 4000`), valores redondeados a 2 decimales, `null` conservado, `curves.hopMs` multiplicado por el factor; resto de campos idénticos.
- Produces (cliente): `assertCloudinary(url)`: lanza `Error('Para generar la curva, la referencia debe estar en Cloudinary (res.cloudinary.com).')` si el host no es `res.cloudinary.com`.

- [ ] **Step 1: Tests que fallan** — `tests/platform.test.mjs` «Validación del análisis y de la curva»: análisis válido devuelve `score` 83; fallan `mode:'test'`, `isFull:false`, `valid:false`, otra canción, `total:101`, `total:82.5`, cadena demasiado grande (413); `referencePayload` acepta la curva de `tests/fixtures/fum-reference.json` con su `source` y fija `songId`, rechaza `source` distinto (409) y `phrases: []` (400).
- [ ] **Step 2: Tests que fallan** — `tests/practice-client.test.mjs`: `compactAnalysis` con curvas de 16 000 valores deja ≤ 4000 y `hopMs` 40, conserva `null` y `scores`; el JSON de un análisis sintético de 160 s (16 000 valores por curva con dos decimales) compactado mide < 262 144; `assertCloudinary('https://res.cloudinary.com/x.wav')` no lanza y con `https://example.com/x.wav` lanza el mensaje exacto.
- [ ] **Step 3:** Run `npm test` → FAIL (funciones inexistentes).
- [ ] **Step 4:** Implementar en `server/domain.mjs`, `practice/compact.js` y `practice/reference-source.js` con las firmas de Interfaces.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6: Commit** — `feat(practica): validación del análisis y de las curvas`

---

### Task 4: Rutas del Worker

**Files:**
- Modify: `server/worker.mjs`
- Test: `tests/platform.test.mjs` (incluye actualizar las reservas existentes para que envíen análisis)

**Interfaces:**
- Consumes: `practiceAnalysis`, `referencePayload` (Task 3); tablas de Task 2.
- Produces (rutas):
  - `GET /api/public/songs` y `GET /api/admin/songs`: cada canción con `has_reference` (0/1) = existe fila en `song_references` con `source = songs.reference_audio_key`.
  - `GET /api/songs/:id/reference` (sesión; miembro de la temporada o jefatura) → la curva con `songId = id`; 404 «Esta canción aún no tiene curva de referencia.» si no hay fila o `source` no coincide.
  - `POST /api/admin/songs/:id/reference` (jefatura + CSRF, cuerpo ≤ 170 000 bytes) `{ reference }` → `referencePayload`, upsert, `admin_audit` acción `reference_generated`; `{ ok: true }`.
  - `POST /api/recordings/reserve` (cuerpo ≤ 300 000 bytes) exige `analysis`; guarda `analysis` y `score`; con id existente, además de los campos actuales exige el mismo `score` (si no, 409 «Identificador de grabación en uso.»).
  - `GET /api/recordings`: cada item añade `score` y `has_analysis` (0/1); nunca el análisis completo.
  - `GET /api/recordings/:id/analysis` → mismos permisos que el audio; 409 si no está `ready`; 404 «Esta práctica no tiene análisis.» si `analysis` es nulo; devuelve el objeto.
  - `GET /api/admin/practice-scores?season=` → `[{ user_id, average, count }]` con `average = ROUND(AVG(score))` de grabaciones `ready` con nota en esa temporada.
- `body()` acepta el límite por llamada (ya tiene parámetro `max`); el resto de rutas sigue en 32 768.

- [ ] **Step 1:** En la prueba de integración existente, añadir un helper `analysisFor(songId, total = 80)` que construya un análisis válido mínimo y usarlo en todas las reservas actuales. Run → FAIL hasta implementar (la reserva aún ignora el análisis, pero las aserciones nuevas fallan).
- [ ] **Step 2: Tests que fallan** — subprueba «Prácticas con análisis y curvas»:
  - reserva sin `analysis` → 400; con fragmento (`isFull:false`) → 400; válida → 201; reintento idéntico → 200 mismo id; mismo id con `total` distinto → 409;
  - antes del `PUT`, `GET /api/recordings/:id/analysis` → 409; tras el `PUT` → 200 y `scores.total` 80; el otro tenor → 404; jefatura → 200;
  - `GET /api/recordings` devuelve `score: 80`, `has_analysis: 1` y ningún campo `analysis`;
  - una grabación insertada por SQL sin análisis (anterior al cambio) → lista con `score: null`, `has_analysis: 0`, y `/analysis` → 404;
  - `GET /api/songs/<fum>/reference` (tenor) → 200 con `songId` = id de la canción; tras `POST /api/admin/songs` cambiando su `reference_audio_key` → 404 y `has_reference: 0` en `/api/public/songs`; las grabaciones ya enviadas de esa canción siguen devolviendo su análisis;
  - `POST /api/admin/songs/:id/reference` como tenor → 403; como jefatura con `source` antiguo → 409; con el nuevo `source` → 200 y vuelve `has_reference: 1`;
  - `GET /api/admin/practice-scores` → `[{ user_id: <tenor>, average: 80, count: 1 }]`.
- [ ] **Step 3:** Run `npm test` → FAIL.
- [ ] **Step 4:** Implementar las rutas de Interfaces.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6: Commit** — `feat(practica): rutas de curvas y prácticas con análisis`

---

### Task 5: Cliente de práctica (módulos)

**Files:**
- Create: `practice/encoder.js`, `practice/result-view.js`, `practice/bridge.js`, y `practice/practice-ui.js` adaptado desde `MOTOR/practice/practice-ui.js`
- Modify: `practice/practice.css` (estilos nuevos al final)
- Test: `tests/practice-client.test.mjs`

**Interfaces:**
- Consumes: motor (Task 1), `compactAnalysis`, `assertCloudinary` (Task 3).
- Produces:
  - `encoder.js`: `MIME_TYPES = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/webm']`; `pickMimeType(isSupported) → string` (primero soportado o `''`); `createTakeEncoder(stream, { maxBytes, Recorder = globalThis.MediaRecorder }) → { start(), stop(): Promise<{ blob, mimeType }> }` con `audioBitsPerSecond: 64000`, `start(1000)`; `stop()` rechaza con `Error('La grabación está vacía o supera el tamaño máximo. Vuelve a grabar.')` si el blob está vacío o supera `maxBytes`.
  - `result-view.js`: `analysisMarkup(result) → string` (HTML de nota, desglose con «No cuenta en la nota» en ritmo, consejos, gráfica `renderChart` y lista de frases sin botones); misma apariencia que la pantalla de resultados.
  - `practice-ui.js`: `openPractice(song, hooks)`, `closePractice()`, `hasPendingTake() → boolean`. `song = { id, title, track }`; `hooks = { loadReference(): Promise<ref>, send(take): Promise<void>, limits: { audio_bytes, audio_seconds } }`; `take = { id: uuid, blob, mimeType, durationSeconds, analysis }` (`analysis` ya compactado).
  - `bridge.js`: asigna `window.tenoresPractice = { isSupported, open: openPractice, close: closePractice, hasPendingTake, analysisMarkup, generateReference(song) → Promise<ref>, referencePreviewMarkup(ref) → string }` y emite `document.dispatchEvent(new Event('tenores-practice-ready'))`. `generateReference` llama a `assertCloudinary` y luego a `referenceFromUrl(song.id, song.reference_audio_key)`. `isSupported()` = `isRecordingSupported() && !!window.MediaRecorder`.

Comportamiento de `practice-ui.js` respecto a `MOTOR` (lo demás no cambia):
- Sin selector de modo; siempre `mode: 'guide'`. Sin `save-status.js` ni `config.js`; `LIVE_PITCH` pasa a constante local `true`.
- La referencia llega por `hooks.loadReference()`; sin `assets/pitch`.
- Al empezar la grabación (`s.recorder.start()`), arranca `createTakeEncoder(s.recorder.stream, { maxBytes: hooks.limits.audio_bytes })`; al terminar la toma se detiene; `durationSeconds = samples.length / sampleRate`.
- Resultado válido y `isFull`: botones «Enviar a jefatura», «Escuchar mi toma», «Repetir», «Cambiar ajustes». Fragmento: sin «Enviar» y el texto «Para enviar a jefatura, canta la canción completa.». Inválido: mensaje actual sin «Enviar».
- «Enviar a jefatura» → confirmación en el panel «Jefatura podrá escuchar esta práctica y ver su análisis.» con «Enviar» / «Cancelar» → «Enviando tu práctica…» → éxito «Práctica enviada. Ya aparece en Mis grabaciones.» (la toma deja de estar pendiente); error → `${err.message} Tu práctica se conserva; pulsa Enviar para reintentar.` con el mismo `id`.
- Toma enviable sin enviar = pendiente. Repetir, cerrar el panel o cambiar ajustes con toma pendiente muestran en el panel «Tienes una práctica sin enviar. ¿Descartarla?» con «Descartar» / «Volver». `beforeunload` avisa mientras haya pendiente.
- Si el codificador no está disponible o falla, se ve la nota pero «Enviar» se sustituye por «Este navegador no puede enviar audio.».

- [ ] **Step 1: Tests que fallan** (`tests/practice-client.test.mjs`): `pickMimeType` respeta el orden de `MIME_TYPES` y devuelve `''` sin soporte; `createTakeEncoder` con un `Recorder` simulado devuelve el blob con su MIME, usa 64 000 bps y rechaza con el mensaje exacto si está vacío o supera `maxBytes`; `analysisMarkup` contiene la nota total, «No cuenta en la nota», cada consejo escapado y un `<svg`, y no contiene «90%».
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar `encoder.js` y `result-view.js` (`practice-ui.js` reutiliza `analysisMarkup` para su pantalla de resultados). Run → PASS.
- [ ] **Step 4:** Adaptar `practice-ui.js` y escribir `bridge.js` según el comportamiento descrito. Run `node --check practice/practice-ui.js practice/bridge.js` y `npm test` → sin errores, PASS.
- [ ] **Step 5: Commit** — `feat(practica): panel de práctica con guía y envío a jefatura`

---

### Task 6: Integración en la plataforma

**Files:**
- Modify: `platform.js`, `platform.css`, `index.html`, `tests/recorder.test.mjs`, `scripts/browser-live-check.mjs`, `scripts/browser-rehearsal-check.mjs`
- Test: `tests/recorder.test.mjs`

**Interfaces:**
- Consumes: `window.tenoresPractice` (Task 5); rutas de Task 4.

Cambios:
- `index.html`: tras `platform.js`, `<link rel="stylesheet" href="practice/practice.css">` en el `<head>` y `<script type="module" src="practice/bridge.js"></script>`.
- `buildRecorder(root, song)` se sustituye por un lanzador en `#practiceCard`: si `song.has_reference` y `tenoresPractice.isSupported()`, botón «Practicar con guía» que llama a `tenoresPractice.open({ id: song.id, title: song.title, track: song.reference_audio_key }, { loadReference: () => api('/api/songs/'+song.id+'/reference'), send: take => sendPractice(song, take), limits })`; sin curva: «Esta canción aún no tiene curva de referencia; jefatura debe generarla.»; sin soporte: «Tu navegador no permite grabar.». Si `tenoresPractice` aún no existe, se monta al recibir `tenores-practice-ready`.
- `sendPractice(song, take)`: `reserve` con `{ id: take.id, song_id, season_id, duration_seconds, file_size, mime_type: take.blob.type.toLowerCase() o take.mimeType, analysis: take.analysis }` y, si no está `ready`, `PUT` del blob (flujo actual). Los errores se propagan con el mensaje del servidor.
- `mainRecorder` y el bloqueo de cambio de canción usan `tenoresPractice.hasPendingTake()` en lugar de `blob/recorder/isUploading`. Se eliminan `recorder`, `stream`, `blob`, `blobUrl`, `recordedSeconds`, `discard`, `releaseMedia` y el marcado `similarity-*` si quedan sin uso. `bindPracticePlayer` y `practicePlayerMarkup` se conservan para la biblioteca.
- Biblioteca de grabaciones: cada elemento muestra `Nota: N` (o «Sin análisis» si `has_analysis` es 0) y, con análisis, un botón «Ver detalle» que pide `/api/recordings/:id/analysis` una sola vez y despliega `tenoresPractice.analysisMarkup(...)` debajo del reproductor.
- Repertorio (jefatura): cada fila muestra «Con curva» o «Sin curva» y el botón «Generar curva» → `tenoresPractice.generateReference(song)` con estado «Descargando y analizando…» → vista previa (`referencePreviewMarkup`) con «Guardar curva» → `POST /api/admin/songs/:id/reference` → recarga la lista. Errores con su mensaje. El botón «Practicar» de cada fila abre el mismo lanzador que la tarjeta.
- Dashboard de jefatura: «Similitud del equipo / 90 %» pasa a «Nota de práctica del equipo» con la media de `average` de `/api/admin/practice-scores` (o «—» y «Aún no hay prácticas enviadas.»); la columna «Porcentaje de similitud» pasa a «Nota de práctica» con `average` del tenor o «—».
- `platform.css`: eliminar reglas `.similarity-*` sin uso; estilos del lanzador y del detalle al final.

- [ ] **Step 1: Tests que fallan** — sustituir las pruebas de `buildRecorder` de `tests/recorder.test.mjs` (las que pulsan `record-start`, `record-send`, `record-again`) por, con un `window.tenoresPractice` simulado en el contexto VM:
  - canción con `has_reference: 1` → la tarjeta contiene «Practicar con guía» y al pulsarlo `open` recibe `{ id, title, track }` y `hooks.limits`;
  - canción con `has_reference: 0` → texto exacto «Esta canción aún no tiene curva de referencia; jefatura debe generarla.» y `open` no se llama;
  - `hooks.send(take)` hace una sola reserva con `analysis` y luego un `PUT` con el blob; si la reserva responde 503 la promesa rechaza con el mensaje del servidor y no hay `PUT`;
  - con `hasPendingTake()` verdadero, navegar a otra canción mantiene la canción pendiente (comportamiento actual de `mainRecorder`);
  - ningún HTML generado contiene «90%».
  Conservar las pruebas que no dependen de `buildRecorder` (reproductor, Inicio de jefatura, biblioteca 2026), ajustando la biblioteca para comprobar «Nota: 80» y «Sin análisis».
- [ ] **Step 2:** Run `node --test tests/recorder.test.mjs` → FAIL.
- [ ] **Step 3:** Implementar los cambios de la lista.
- [ ] **Step 4:** Actualizar `scripts/browser-live-check.mjs` (flujo «Practicar con guía» en lugar de «Subir mi práctica» y sin aserciones de 90 %) y `scripts/browser-rehearsal-check.mjs` (cabecera `['Tenor','Asistencia','Nota de práctica','Última sesión']`). Estos scripts dependen de Playwright y no forman parte de `npm test`.
- [ ] **Step 5:** Run `npm test` y `node scripts/build.mjs` → PASS y build correcto.
- [ ] **Step 6: Commit** — `feat(practica): práctica con guía, notas reales y curvas en la plataforma`

---

### Task 7: Documentación y prueba en Chrome

**Files:**
- Modify: `README.md` (manual de jefatura: puntos 9 y 10; sección de práctica), `docs/TESTING.md`, `docs/DEPLOYMENT.md` (aplicar `0006` y `0007`)

- [ ] **Step 1:** Actualizar la documentación: «Subir mi práctica» → «Practicar con guía» y «Enviar a jefatura»; Repertorio con «Generar curva»; Grabaciones con nota y «Ver detalle»; se retira la muestra fija; migraciones nuevas en el despliegue.
- [ ] **Step 2: Prueba en Chrome (controlador)** con `node scripts/dev.mjs --test` (puerto 8788, datos efímeros) y micrófono simulado (la propia referencia como micrófono):
  - tenor: «Practicar con guía» en `#fum` → toma completa → nota → «Enviar a jefatura» → aparece en Mis grabaciones con su nota y «Ver detalle» igual al resultado;
  - fragmento → sin «Enviar»; cerrar con toma pendiente → pregunta;
  - jefatura: Grabaciones del tenor con la misma nota y detalle; dashboard con la nota media; Repertorio: cambiar la URL de una canción → «Sin curva» → «Generar curva» → vista previa → «Guardar curva» → «Con curva»;
  - móvil 390 px; consola sin errores.
- [ ] **Step 3: Commit** — `docs: práctica con guía y análisis en la plataforma`
