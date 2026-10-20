# Práctica con guía y análisis de la voz en la plataforma 2026

Fecha: 2026-10-20 · Repositorio: rama `plataforma-2026` de https://github.com/armando1345/Tenores
Origen del motor: proyecto de Marco (`Tenores-main`), módulos `practice/` y `assets/pitch/`, ya probados en producción.

## Por qué

La plataforma 2026 permite a cada tenor grabar y enviar su práctica a jefatura, pero la «similitud 90 %» y los segmentos
verdes/rojos que muestra son una muestra fija: no se analiza el audio. El motor de práctica de Marco sí analiza la voz
en el navegador (afinación, estabilidad, consejos, gráfica de la voz sobre la referencia), con práctica guiada,
indicador en vivo estilo karaoke y calibración de auriculares. Se trata de unir ambos: el tenor practica con guía, ve su
nota real y envía la toma que elija; jefatura la escucha y ve el mismo análisis.

## Lo que decidió el usuario

| Tema | Decisión |
|---|---|
| Recorrido | El tenor practica con guía, ve su nota; jefatura la revisa. |
| Qué ve jefatura | La nota **y** el audio, con **todo el detalle** que ve el tenor (afinación, estabilidad, consejos, gráfica). |
| Envío | El tenor elige qué toma enviar. Las tomas no enviadas **no existen**: no se guardan ni audio ni nota. |
| «Subir mi práctica» | Se **sustituye** por el flujo de práctica con guía. |
| Modos | Se **elimina** «Ponerme a prueba». Se mantiene practicar **fragmentos**, pero solo se puede enviar la **canción completa con guía**. |
| Canciones nuevas | No se pueden practicar hasta tener curva de referencia. La curva la genera **jefatura** desde el panel, sin tocar código. |
| Referencia | La URL de referencia de una canción es **siempre la voz de tenores aislada**. |
| Entrega | Marco lo sube primero a su GitHub para probar y después abre un pull request a `plataforma-2026`. |

## Objetivos

1. En cada canción con curva, el tenor abre **Practicar**: modo con guía (canción completa o fragmento), indicador en vivo
   estilo karaoke, botón «Calibrar auriculares» y aviso de auriculares; al terminar ve nota, desglose, consejos y gráfica.
2. Tras una toma **completa con guía y válida**, aparecen «Escuchar», «Enviar a jefatura» y «Repetir». Enviar sube el
   audio a R2 por el flujo actual (`reserve` + `PUT`) y guarda el análisis completo asociado a esa grabación.
3. **Grabaciones** (jefatura) y **Mis grabaciones** (tenor) muestran, por cada envío, el reproductor actual más la nota real
   y un detalle desplegable idéntico a la pantalla de resultados del tenor.
4. **Repertorio** muestra si cada canción tiene curva; jefatura puede «Generar curva» (análisis en su navegador, vista
   previa, Guardar). Las 12 canciones actuales llegan con su curva cargada.
5. Se elimina por completo la muestra fija «90 %» y sus segmentos.

## No objetivos

- Historial de intentos no enviados, «Mi progreso» con gráfica de intentos, rachas o comparativas: no existen tomas no enviadas.
- Recalcular la nota en el servidor o verificarla: se guarda la que calculó el navegador del tenor (se acepta que un usuario
  técnico podría falsearla).
- Cambiar asistencia, temporadas, presentaciones, actividad web, encuesta ni la identidad visual.
- Generar curvas automáticamente al guardar una canción o desde audio con coro/instrumentos.
- Analizar retroactivamente las grabaciones ya enviadas.

## Anti-objetivos (sería un fracaso aunque funcione)

- Que el tenor pueda enviar un fragmento, una toma sin guía o una toma inválida.
- Que jefatura vea un análisis distinto del que vio el tenor al enviar.
- Que el audio enviado y el análisis queden desemparejados (audio sin análisis o análisis sin audio por una subida a medias).
- Que se rompa la plataforma cuando R2 no está configurado: practicar y ver la nota deben funcionar; solo «Enviar» informa
  que el almacenamiento está pendiente (mensaje actual del servidor, 503).
- Superar los límites de Cloudflare Free o añadir servicios de pago o dependencias de ejecución.

## Restricciones de la plataforma (no negociables)

- Frontend sin dependencias ni build de bundling; `scripts/build.mjs` copia una **lista explícita** de archivos a `dist/`.
  Todo archivo nuevo del frontend (carpeta del motor, curvas si fueran estáticas) debe añadirse ahí; hoy su filtro de
  `assets/` solo deja pasar imágenes.
- CSP de `_headers`: `script-src 'self'` (cubre módulos ES, Web Worker y AudioWorklet servidos desde el mismo origen),
  `connect-src 'self' https://res.cloudinary.com` (descarga de referencias), `media-src 'self' https: blob:`. No añadir
  orígenes externos.
- API en el mismo origen, sesión por cookie y token CSRF que entrega `GET /api/session`; las escrituras exigen ese token
  como ya hace `platform.js`. Nada de `Authorization: Bearer`.
- Worker Free (10 ms de CPU por petición): el servidor no analiza audio ni curvas; solo valida tamaño/forma y guarda.
- D1: cambios solo mediante una migración nueva y aditiva (`migrations/0006_*.sql`); no tocar las anteriores.
- Límites existentes de grabación (`app_limits`: bytes, segundos, envíos diarios, almacenamiento) se aplican igual.
- Pruebas con `node --test tests/*.test.mjs` (Node 24) y el estilo de pruebas existente (Worker con SQLite local);
  las pruebas de los módulos del motor que se traigan vienen con sus tests.
- Textos en español con tildes. Commits sin coautorías.

## Cómo encaja (decisiones de Marco y mías)

**Motor como módulos aparte.** El motor se copia como carpeta de módulos ES (p. ej. `practice/`) casi sin cambios
(pitch, align, score, reference, analysis-worker, recorder + worklet, live-pitch, live-track, latency, chart, tones,
scoring-config, util) y `index.html` la carga con `<script type="module">`. `platform.js` sigue siendo script clásico; la
comunicación entre ambos es por una interfaz pequeña en `window` o eventos del DOM (a elección del constructor), sin
reescribir `platform.js` en módulos. *Mi decisión:* minimiza el riesgo sobre el código de Armando.

**Se sustituye `buildRecorder` de `platform.js`.** Donde hoy aparece «Subir mi práctica» (debajo de la voz de tenores de
cada canción, solo con sesión iniciada) se monta el panel de práctica. Sin sesión, la práctica no aparece (igual que hoy
el botón de subir). La confirmación actual (aviso de que jefatura podrá escucharlo, conservar la vista previa si falla,
aviso al abandonar la página con una toma sin enviar) se mantiene en el nuevo flujo.

**Audio que se envía.** El análisis usa el PCM del AudioWorklet; el archivo que se sube debe estar comprimido como hoy.
*Mi decisión:* durante la toma con guía se graba en paralelo con `MediaRecorder` sobre el mismo `MediaStream` (mismo
MIME y preferencias Opus/AAC que el código actual y que `sniffAudio`/`recordingMetadata` del servidor aceptan). La
duración enviada es la de esa toma. Si el navegador no soporta `MediaRecorder`, se puede practicar y ver la nota, pero
«Enviar» explica que este navegador no puede enviar audio.

**Análisis guardado.** Se guarda el objeto de resultado del motor tal como lo vio el tenor (versión del motor, nota total,
afinación, estabilidad, ritmo informativo, frases, consejos, curvas para la gráfica), como JSON en D1 asociado a la
grabación. El servidor valida: JSON bien formado, tamaño máximo (orientativo ≤ 256 KB; se pueden submuestrear las curvas
de la gráfica para entrar), `isFull = true`, modo con guía, `valid = true`, canción coincidente con la grabación, y nota
en 0–100. El análisis se envía en la **reserva** (antes del `PUT` del audio) y la grabación solo pasa a `ready` cuando el
audio está en R2, como hoy; así no hay análisis visible sin audio. Un reintento de reserva con el mismo id debe aceptar el
mismo análisis (idempotencia actual).

**Curvas de referencia en D1.** Tabla nueva (p. ej. `song_references`) con la curva JSON por canción (mismo formato que
`assets/pitch/<id>.json`: `hopMs`, curva midi, `notes`, `phrases`), la URL de referencia con la que se generó y la fecha.
Si jefatura cambia la URL de referencia de una canción, la curva deja de valer (se borra o se ignora por no coincidir la
URL) y la canción deja de ofrecer práctica hasta regenerarla. Las prácticas enviadas antes conservan su análisis.
La migración carga las 12 curvas actuales emparejando por `songs.legacy_key` (`fum`, `adeste`, `dona`… coinciden con
los nombres de archivo de `assets/pitch/`). Rutas: lectura de la curva para usuarios con sesión miembros de la temporada;
escritura solo jefatura (CSRF), con validación de forma y tamaño (las actuales ocupan 26–102 KB) y registro en
`admin_audit`.

**Generar curva (jefatura).** En Repertorio, por canción: estado «Con curva» / «Sin curva» y botón «Generar curva».
Reutiliza la lógica de `tools/build-pitch.js` del proyecto de Marco: descarga la referencia (Cloudinary, permitido por
CSP), decodifica, detecta afinación, segmenta notas y frases, muestra la vista previa (gráfica de la curva) y «Guardar».
Si la descarga o la decodificación fallan, mensaje claro y nada guardado.

**Vista de grabaciones.** Cada elemento de Grabaciones/Mis grabaciones muestra la nota total junto al reproductor actual y
un «Ver detalle» que despliega el mismo resultado que vio el tenor (reutilizando el renderizado del motor). Las
grabaciones anteriores a este cambio (sin análisis) se muestran con «Sin análisis», sin inventar nota. Se elimina la
muestra fija «90 %» del dashboard de jefatura y de la confirmación; si el dashboard necesita un indicador de similitud, se
calcula con las notas reales enviadas o se retira (decisión del constructor, sin datos inventados).

**Lo que sale del motor de Marco.** «Ponerme a prueba» (modo `test`) se quita de la interfaz. No se traen el login por PIN,
el panel de administración, asistencia, gestión de canciones ni «Mi progreso» de su proyecto. `config.js` deja de
resolver una API externa: todo va al mismo origen.

**Detalles técnicos ya comprobados (decisiones mías tras la revisión).**
- Las 12 curvas de `assets/pitch/` tienen en `source` exactamente la misma URL que `songs.reference_audio_key` de su
  `legacy_key`: la invalidación por URL funciona desde el primer día. Todas son de la temporada 2026.
- `adeste.json` ocupa 101 KB y D1 admite como máximo 100 KB por sentencia: la migración carga las curvas en trozos
  (p. ej. `INSERT` + `UPDATE … SET curve = curve || ?`) o en una forma compacta equivalente; las 12 deben quedar íntegras.
- `body()` del Worker limita hoy los cuerpos a 32 KB: las rutas de reserva con análisis y de guardar curva aceptan un
  límite propio mayor (≈ 256 KB y ≈ 160 KB); el resto de rutas conserva 32 KB.
- «Generar curva» solo puede descargar de `res.cloudinary.com` (CSP). Si la URL de referencia es de otro dominio, el botón
  explica que la referencia debe estar en Cloudinary para generar la curva; no se amplía la CSP.
- La lista de grabaciones devuelve solo la nota (y si tiene análisis); «Ver detalle» pide el análisis completo de esa
  grabación con una ruta propia, con los mismos permisos que su audio.
- El motor ya trae `practice/reference-builder.js` (`referenceFromUrl`) para generar curvas: se reutiliza.

## Comportamiento detallado

**Panel de práctica (tenor con sesión, canción con curva):**
1. Preparación: qué cantar (canción completa / fragmento con frases desde–hasta), aviso de auriculares, «Retraso: N ms
   (calibrado/automático/estimado)» y «Calibrar auriculares». Sin elección de modo: siempre con guía.
2. Toma: cuenta atrás, guía sonando, indicador en vivo (pista karaoke) y «Detener», como en el motor actual.
3. Resultado: nota, desglose, consejos y gráfica. Si la toma es completa y válida: «Escuchar», «Enviar a jefatura» y
   «Repetir». Si es fragmento: «Repetir» y una nota de que para enviar hay que cantar la canción completa. Si no es válida
   (poca voz): el mensaje actual del motor y «Repetir», sin enviar.
4. Enviar: confirmación («Jefatura podrá escuchar esta práctica»), subida con progreso, y al terminar «Enviada» con acceso
   a Mis grabaciones. Si falla, la toma (audio + análisis) se conserva para reintentar con el mismo id; si el servidor
   responde 503 por almacenamiento pendiente, se informa sin perder la toma.
5. Repetir o cambiar de canción con una toma sin enviar pide confirmación; recargar la página la pierde (aviso
   `beforeunload` actual).

**Canción sin curva:** el panel muestra «Esta canción aún no tiene curva de referencia; jefatura debe generarla.» sin
botón de práctica.

## Pruebas esperadas

- Worker (SQLite local, estilo de `tests/platform.test.mjs`): reserva con análisis válido; rechazo de fragmento, de
  modo distinto de guía, de toma inválida, de canción distinta, de JSON demasiado grande o mal formado; reintento
  idempotente; el análisis solo es visible con la grabación `ready`; permisos (tenor ve solo los suyos, jefatura todos);
  curvas: lectura por miembro, escritura solo jefatura con CSRF, invalidación al cambiar la URL de referencia, migración
  carga 12 curvas emparejadas por `legacy_key`.
- Motor: sus pruebas existentes pasan dentro de la plataforma.
- Cliente (estilo `tests/recorder.test.mjs`): «Enviar» solo tras toma completa con guía y válida; fallo de subida
  conserva la toma; 503 sin R2 se informa; no queda rastro del «90 %».
- Navegador (Chrome, micrófono simulado como en el proyecto de Marco): toma completa → enviar → aparece en Grabaciones
  con el mismo detalle; generar curva desde Repertorio; móvil 390 px.

## Pendiente fuera del código

- Probar en teléfonos reales (Android/iPhone) y con auriculares Bluetooth.
- Despliegue de prueba en la cuenta de Cloudflare de Marco (Worker + D1 + R2) antes del pull request; requiere activar R2.
- Pasos de GitHub para subir a su repositorio y abrir el pull request a `plataforma-2026`.
