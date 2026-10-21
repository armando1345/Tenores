# Pruebas y verificación · 13 de octubre de 2026

## Publicación Cloudflare comprobada

El 13 de octubre se ejecutaron **10 comprobaciones correctas** contra https://tenores.tenores-au-6e09.workers.dev: web HTTPS y cabeceras, D1 conectado, cuentas reales de jefatura y tenor, roles, acceso privado y CSRF. Las sesiones y los eventos temporales de acceso se retiraron al terminar.

Se verificaron ocho integrantes de 2026 sin ensayos ni grabaciones, asistencia vacía y similitud —. El archivo de 2025 conserva nueve integrantes, once ensayos y cuarenta horas; sus datos se compararon exactamente antes y después de retirar las muestras locales y remotas. Después de la activación de R2 por el propietario se ejecutaron ocho comprobaciones adicionales correctas: bucket Standard privado, descripción corta, binding RECORDINGS, reserva/subida/historial, GET y HTTP Range íntegros, permisos del autor/jefatura, rechazo de terceros/invitados, reintentos sin duplicados y CSRF. Se retiraron los bytes sintéticos, metadatos, eventos y sesiones de prueba; las estadísticas previas y 2025 permanecen idénticos. Estas comprobaciones de transporte usan bytes con cabecera WebM de prueba y no certifican decodificación ni micrófono en un dispositivo físico.

La similitud de 2026 permanece vacía hasta una práctica ready; entonces usa el 90% fijo solicitado como demostración. Las pruebas de integración comprueban ambos estados. No existe análisis real de audio.

Los apartados de navegador siguientes documentan revisiones realizadas durante el desarrollo; sus datos ficticios y cifras de pruebas anteriores no describen el estado actual de producción.

## Resultados ejecutados

La actualización a PIN pasa **21 pruebas de unidad/integración** y **12 comprobaciones nativas**. Se verifican cuatro dígitos exactos, ceros iniciales, rechazo de longitud/formato incorrectos, acceso con usuario Unicode, cambio de PIN que revoca sesiones y conservación de la política administrativa. Una revisión de navegador con sesiones independientes comprueba mostrar/ocultar PIN, login de tenor, contraseña de jefatura, cambio de límites del formulario por rol y el titular de Inicio en escritorio/móvil: 80 px para el titular y 36 px para el subtitular en escritorio, sin puntos finales y con Registrar ensayo debajo. La rotación de cuentas reales conserva los datos estadísticos y 2025; las listas de PIN y respaldos permanecen privados.

La revisión más reciente de gestión usa `node scripts/browser-management-check.mjs` contra un servidor **nuevo** `scripts/dev.mjs --test` en el puerto 8789 (`PORT=8789`). Pasan siete recorridos: selector de año centrado; Inicio sin fondos, bordes ni sombras de tarjetas; checklist de canciones persistente y reversión ante fallo; creación/edición/cancelación de canciones; creación e inscripción de integrante; presentación con detalles opcionales y calendario plegable; creación de temporada y revisión móvil sin desbordamiento. No hay errores JavaScript. Toda escritura usa SQLite efímero; no cambia datos de Cloudflare. Capturas en `output/playwright/jefatura-*-lista*`, `jefatura-repertorio-checklist*`, `jefatura-inicio-sin-cajas.png` y `jefatura-presentacion-formulario.png`; resultado `management-result.json`.

Después se comprobaron los botones verdes de añadir/guardar y la selección de fecha para un año nuevo mediante el calendario propio, sin guardar datos. Las veinte pruebas de unidad/integración siguen pasando.

`node --test tests/*.test.mjs`: **20 pruebas pasan, cero fallos**. Incluye subpruebas del mismo Worker con SQLite real y un adaptador local de almacenamiento; no responde mediante un backend de demostración.

- Hash scrypt con sal distinta por contraseña, verificación y rechazo de contraseñas cortas.
- Usuarios con mayúsculas y tildes: normalización Unicode, acceso con distintas mayúsculas, rechazo de duplicados y cambio de usuario conservando identidad y contraseña.
- Ensayo activo con pendientes, un único activo por temporada, actualización idempotente de llegadas, finalización y progreso privado del propietario. Presentaciones persistentes con fechas validadas, corrección sin duplicados y escritura solo por jefatura.
- Invitado público, bloqueo de subida sin sesión, tenor sin endpoints administrativos, acceso administrativo y protección de origen/CSRF.
- Sesiones expiradas y revocadas.
- 08:00–12:00: 240 minutos a tiempo, cero ausente, 225 a las 08:15, 180 a las 09:00, 205 a las 08:35; mismo tiempo si tardanza justificada o injustificada.
- Llegadas fuera del horario, estados pendientes y fórmula de salida anticipada.
- Borrador persistente excluido de estadísticas; finalización exige estados completos; reenvío no duplica; versión antigua se rechaza; corrección recalcula horas.
- Lista de otra temporada separada; transacción con fallo revierte modificaciones; restricciones SQL y nueve registros históricos conservados.
- Grabaciones sucesivas, lectura exclusiva del propietario/jefatura, manipulación de filtros sin acceso a otro tenor, claves R2 privadas, tamaño/MIME/firma y cuotas.
- Fallo de subida mantiene reserva y permite reintento; fallo de eliminación conserva metadatos para continuar; cierre elimina audio y conserva asistencia.
- Eventos deduplicados y privados, rate limiting en D1.
- Fuentes históricas exactas, controles públicos conservados y ausencia del experimento de coros externos en el frontend publicado.

`wrangler deploy --dry-run --outdir output/worker`: **compilación correcta**, sin publicación. Paquete Worker aproximadamente 47 KiB antes de gzip; frontend sin dependencias de ejecución. Los bindings D1 y Durable Object se validan, y las migraciones también se aplicaron con Wrangler a una base **local**.

`node scripts/runtime-check.mjs`: **12 comprobaciones pasan en workerd/Miniflare**, con bindings nativos D1, Durable Object y R2 locales y efímeros:

1. Creación de hash dentro del Durable Object.
2. Login real con scrypt en el runtime Cloudflare.
3. Sesión D1 y autorización administrativa.
4. Creación administrativa de cuenta con hashing nativo.
5. Usuarios Unicode y unicidad de sus claves en D1 nativo.
6. Ensayo activo con pendientes y progreso privado.
7. Persistencia y permisos de presentaciones.
8. Guardado/corrección transaccional de ensayo y reenvío idempotente.
9. PUT/GET privado en R2.
10. Reproducción mediante Range; GET completo responde 200 y rango responde 206.
11. Cierre de temporada elimina objetos y mantiene minutos e históricos.
12. Temporadas disponibles por tenor, obtenidas de D1 sin perder el historial de integrantes retirados.

Los datos/contraseñas de esas pruebas son ficticios y efímeros. No se conectaron servicios remotos. El resultado detallado se genera en `output/runtime-result.json` y está excluido del sitio y de Git. La medición de tiempo total del escenario no equivale a CPU de producción.

Los casos de `tests/recorder.test.mjs` ejecutan el cliente real con DOM simulado: con curva, la tarjeta ofrece «Practicar con guía» y abre la práctica con la canción y los límites; sin curva se avisa y no se abre; sin soporte de grabación se avisa en la tarjeta; Enviar reserva una sola vez con el análisis y sube el audio con PUT; si la reserva falla (503) se rechaza con el mensaje del servidor y sin PUT; con una toma pendiente, cambiar de canción conserva la canción de la práctica; cerrar sesión cierra la práctica a la fuerza y descarta la toma pendiente. También comprueban que jefatura abre Inicio con dos gráficas y al salir restaura el espacio del tenor, que la biblioteca del tenor muestra solo la temporada 2026 con nota o «Sin análisis» y detalle bajo demanda, y que el reproductor de práctica reproduce, pausa y avanza sin duración WebM. No acceden al micrófono personal. La API de historial también verifica filtros por canción sin cambiar permisos. El resumen administrativo cuenta solo audios `ready` como prácticas enviadas; las reservas pendientes siguen contando para las cuotas de almacenamiento y se comprueba esa distinción durante la integración.

Los casos de `tests/practice-client.test.mjs` prueban las piezas puras del panel de práctica: compactación del análisis (submuestreo, redondeo y tamaño máximo), referencias solo en Cloudinary, elección de MIME y codificador de la toma (64 000 bps, toma vacía o demasiado grande), la vista de la nota de práctica con consejos escapados, cuándo se puede enviar a jefatura (toma inválida, fragmento válido, toma completa en otro modo, navegador sin codificador y toma lista), que un fallo de envío conserva la toma pendiente con el mismo identificador, y el aviso de toma incompleta (`incompleteTake`: 17/17 s no avisa, 11/17 s avisa, 15,4/17 s no avisa, tomas de menos de 2 s nunca avisan). Mientras se envía, cerrar el panel, Repetir, Cambiar ajustes y Practicar esta frase no hacen nada; cerrar sesión sí cierra.

## Navegador comprobado

El flotante de escritorio se amplió a 600 px de ancho y menos de 130 px de alto, con una barra de más de 550 px, controles mayores y tiempos de 12 px. La comprobación existente del flotante pasa sus cinco recorridos: un clic al 60% lleva una pista sintética de 60 segundos a 36 segundos; continúan funcionando teclado, velocidad, loop, volumen y cierre. La versión móvil conserva su ancho completo y avance táctil. Resultado actualizado: `output/playwright/floating-result.json`; captura `flotante-tenores.png`.

El menú de velocidad del reproductor principal se comprobó en 1280 × 900, 390 × 844, 320 × 568, 740 × 360 y 1440 × 400. Sus límites permanecen dentro de la pantalla y todas las velocidades son alcanzables, también al acercar el botón al borde inferior; cambia de dirección cuando falta espacio y admite scroll interno en pantallas bajas. Se verificaron selección de 0.75x/2x, reajuste tras cambiar el ancho, Escape y clic exterior, sin errores JavaScript. Resultado: `output/playwright/inline-speed-result.json`; capturas `velocidad-principal-movil.png` y `velocidad-principal-escritorio.png`. Acceso de invitado contra el servidor efímero, sin grabaciones ni cambios de cuentas.

`node scripts/browser-navigation-check.mjs`: **9 comprobaciones** de la navegación de jefatura en escritorio y móvil (390 × 844). Inicio presenta misión, registro de ensayo, dos gráficas y tabla del equipo; Estadísticas muestra el desglose ampliado sin esos elementos de portada. Las fichas individuales conservan el tenor al cambiar de temporada y muestran únicamente sus temporadas disponibles. El selector de temporada usa el verde de Tenores, centra el año y admite teclado/Escape; ambos desplegables se cierran al clicar fuera. Grabaciones abre una lista de tenores y luego sus prácticas, con mensajes vacíos personalizados y reproductores brandeados. Dos archivos sintéticos enviados por la API aparecen en la biblioteca correcta y no en la de Liam. Presentaciones, integrantes, repertorio y temporadas no muestran la misión ni el registro de ensayo. Resultado: `output/playwright/navigation-result.json`; capturas `jefatura-inicio-separado`, `jefatura-estadisticas-separadas` y `ficha-liam-limpia` (también en móvil). Todos los envíos se realizan contra la base efímera de `scripts/dev.mjs --test`, sin alterar grabaciones reales.

Revisión de la web real con el mismo Worker y adaptadores locales, en navegador Chromium del entorno:

- Pantalla de acceso y entrada con cuenta de prueba; roles y panel integrado.
- Registro de ensayo, lista inicialmente sin marcar, selección tardía, justificación y aparición posterior del campo de hora.
- Resumen con 240 y 205 minutos; confirmación únicamente tras guardado; historial y reapertura para corrección.
- Actualización del panel público existente de 2026 y conservación del repertorio/orden original.
- Ancho móvil de 390 × 844: navegación, campos fecha/hora, estados táctiles, diálogo tardío y resumen. Se corrigió un solapamiento entre controles de cuenta y el botón Aú Aú existente.
- Captura de evidencia en `output/playwright/ensayo-mobile.png` (datos de ensayo únicamente del entorno de prueba).
- Confirmación de práctica y reproductor propio negro/verde comprobados en escritorio y 390 × 844. Una página temporal de prueba utilizó el HTML, CSS y cliente reales, sustituyendo únicamente el micrófono por un flujo sintético de Web Audio; MediaRecorder codificó y reprodujo el audio real. Volver a grabar inició otra toma inmediatamente. No se enviaron esos audios ni se guardaron grabaciones en las cuentas locales. La página temporal se retiró tras la revisión. Capturas: `output/playwright/confirmacion-brandeada.png` y `confirmacion-brandeada-movil.png`; sin errores de consola.
- Biblioteca minimalista comprobada con tres audios en dos canciones, en escritorio y 390 × 844. El reproductor propio reproduce el archivo privado real y pausa el anterior al reproducir otra práctica. Capturas: `output/playwright/mis-grabaciones-minimal.png` y `mis-grabaciones-movil.png`.
- Jefatura abre el dashboard automáticamente al iniciar sesión y al recargar: misión como titular, botón destacado Registrar ensayo, asistencia media, ensayos finalizados, horas programadas y progreso individual. Se comprobó que el botón abre el formulario y enfoca la fecha. No aparecen la portada ni las canciones del coro. Capturas: `output/playwright/dashboard-jefatura-prueba.png` y `dashboard-jefatura-movil.png`.
- Estas dos últimas comprobaciones usan exclusivamente `scripts/dev.mjs --test` en el puerto 8788, con SQLite/R2 efímeros, cuentas de prueba, tres copias de una referencia MP3 pública existente y un ensayo ficticio. No son grabaciones personales ni datos de asistencia reales. Las cuentas y los datos persistentes del puerto 8787 no se modificaron. El servidor temporal se detuvo al terminar; la vista previa normal sigue disponible en 8787.

## Dashboard limpio y registro por pasos

El dashboard conserva el titular de misión y elimina el encabezado pequeño Jefatura · Tenores. Los cuatro indicadores se presentan sin tarjetas ni fondos; la tabla del equipo tampoco tiene recuadro. Registrar ensayo abre una vista dedicada de cuatro pasos: Fecha, Horario, Tenores y Revisar. Anterior conserva los valores. La lista empieza sin marcar, permite marcar Todos a tiempo y exige justificar y registrar la hora de cada llegada tardía. El borrador admite integrantes pendientes; confirmar exige revisar una lista completa. En móvil, las acciones permanecen accesibles al recorrer la lista.

`node scripts/browser-rehearsal-check.mjs`: **9 comprobaciones pasan**, con Chrome instalado y la biblioteca Playwright incluida en el entorno. Debe ejecutarse contra un servidor nuevo `scripts/dev.mjs --test` en 8788; el script fija ese puerto y utiliza solo sus cuentas y su SQLite/R2 efímeros.

- Horario inválido bloqueado; lista inicialmente sin marcar; fecha, horario y tardanzas se conservan al volver atrás.
- Registro con 240/205 minutos; fallo de red permite reintentar con el mismo identificador y sin duplicados.
- Si falla la carga del historial después de un guardado confirmado, se informa que el ensayo se guardó y permite reabrir Ensayos.
- Corrección recalcula a 240/240 minutos sin crear otro ensayo.
- Borrador conserva pendientes sin afectar estadísticas; continuar, marcar a tiempo/ausencia y finalizar produce 360/240 minutos en dos ensayos finalizados.
- Escritorio 1280 × 900 y móvil 390 × 844, sin errores JavaScript. Evidencia en `output/playwright/wizard-result.json`, `dashboard-jefatura-limpio-datos.png`, `dashboard-jefatura-limpio-movil.png` y `ensayo-paso-*.png`. Los nombres y números de estas capturas pertenecen al entorno de prueba.

Las 18 pruebas de unidad e integración también pasan. Las cuentas, los ensayos y los audios persistentes de 8787 no se modificaron durante estas comprobaciones.

## Checklist, menú y cuentas de 2026

La asistencia es ahora una checklist: la casilla marca A tiempo, desmarcar devuelve a pendiente y el menú ⋯ ofrece Tarde, No asistió y Sin marcar. Las horas y la justificación aparecen únicamente para tardanzas. No se interpreta una casilla sin marcar como ausencia. Las nueve comprobaciones del navegador también pasan con este modelo, incluyendo borrador, reintento y corrección.

Las secciones administrativas se trasladan al menú desplegable; los botones cierran el menú al navegar. El tenor ve únicamente Temporada 2026 en su biblioteca, con una sola opción interna y sin selector visible. Los datos públicos históricos de 2025 se mantienen en su sección original. Una prueba de cliente verifica esta separación; los integrantes retirados de una temporada abierta dejan de aparecer en el equipo actual, pero conservan sus registros y vuelven a estar incluidos en el informe de la temporada cerrada.

Se activaron las ocho identidades existentes de 2026 en la base persistente local, sin crear personas duplicadas. Se comprobaron sus credenciales y se desactivó la cuenta de prueba y su inscripción actual. En esa revisión inicial se conservaron las muestras. Posteriormente, por instrucción del propietario, todos los ensayos y grabaciones de muestra de 2026 se retiraron del entorno local y remoto; las nueve filas históricas de 2025 permanecen idénticas. Hay un respaldo privado previo en .local. Las contraseñas se almacenan como hashes; no se publican listas de credenciales ni scripts con contraseñas reales. El mínimo de tenor se ajustó a ocho caracteres por instrucción del propietario; jefatura mantiene doce y el costo scrypt no cambió. La prueba nativa de Durable Object crea una cuenta con contraseña de ocho caracteres.

La revisión de la web persistente comprobó los ocho nombres, el menú, la biblioteca de 2026 y el inicio de sesión de una cuenta real; no creó ensayos ni grabaciones. Capturas: `output/playwright/asistencia-checklist-real.png`, `asistencia-checklist-movil.png`, `jefatura-sin-barra.png`, `jefatura-menu.png` y `mis-grabaciones-2026.png`. Las casillas de la captura son una vista sin guardar. Las 18 pruebas de unidad/integración, las 8 comprobaciones nativas y las 9 comprobaciones del navegador pasan.

## Antes del lanzamiento: validación pendiente

`scripts/browser-floating-check.mjs` pasó cinco comprobaciones del reproductor flotante con una pista WAV sintética de 60 segundos y respuestas HTTP Range, entrando como invitado: tarjeta de escritorio de 280 px y menos de 110 px de alto, sin ondas ni botones de salto de 10 segundos; pausa, tiempos y desplazamiento por la barra; menú inicial con Velocidad y Loop (icono de repetición), submenú de velocidades, retorno, activación/desactivación de loop y cierre con Escape o clic exterior; velocidad sincronizada con el reproductor principal y volumen funcional. En móvil de 320 y 390 px la barra ocupa todo el ancho y llega al borde inferior; un toque al 75% avanza la pista a 45 segundos, los menús quedan encima del reproductor y la página no tiene desbordamiento horizontal. Abrir la canción conserva las dimensiones del reproductor principal; la X detiene y oculta el flotante. No se grabó ni reprodujo audio personal. Capturas: `output/playwright/flotante-tenores.png`, `flotante-menu-tenores.png`, `flotante-tenores-movil.png`, `flotante-menu-tenores-movil.png`. Resultado detallado en `output/playwright/floating-result.json`.

La revisión más reciente del dashboard usó `scripts/browser-dashboard-check.mjs` sobre una base efímera `--test`: resumen ampliado con gráficos de asistencia y similitud, grupos y observaciones; coincidencia con la referencia pública de 2025 (78.3%, 40 horas, 11 ensayos y sus observaciones); ficha individual con tiempo activo/no asistido, cobertura y puntualidad histórica; revisión de grabaciones con botón separado; ausencia de flechas en nombres, años sin estados y login sin mensaje automático de éxito. Se comprobaron escritorio y móvil, sin errores de JavaScript. Las siete regresiones del cliente también pasan. Las capturas están en `output/playwright/dashboard-ampliado-2025.png`, `dashboard-ampliado-2026.png`, `dashboard-ampliado-movil.png` y `ficha-tenor-ampliada.png`. La muestra fija del 90% de similitud fue sustituida por el análisis real de la práctica; esa revisión es anterior al cambio.

La ampliación más reciente pasó **14 recorridos de navegador** en `scripts/browser-rehearsal-check.mjs` y **3 comprobaciones adicionales** en `scripts/browser-live-check.mjs`, usando exclusivamente `--test` en 8788: calendario y reloj propios, pendientes que permiten continuar, ensayo activo persistente que abre directamente llegadas, cierre sin duplicados, tabla y ficha individual, registro/corrección de presentaciones y consulta desde la cuenta de tenor. Dos contextos independientes confirman que una llegada guardada aparece en Mi progreso en menos de 10 segundos. Chrome grabó audio sintético y mostró 90%, duración y segmentos verdes/rojos; Volver a grabar regresó al botón sin abrir otra toma. Se revisaron capturas de escritorio y móvil. El 90% y los segmentos son una muestra visual fija solicitada; no existe detección ni resultados analizados almacenados.

No se grabó voz personal ni se accedió al micrófono real del propietario durante estas pruebas. Falta comprobar **grabación y reproducción de una vista previa en dispositivos físicos**; la comprobación sintética certifica el flujo en Chromium local, y los ensayos de R2 utilizan bytes de prueba. No presentar este estado como compatibilidad Android/iPhone certificada.

Práctica con guía y análisis: `npm test` ejecuta 143 pruebas (142 pasan, 1 se omite por falta de un WAV local) que cubren el análisis y la puntuación, la pista y la calibración de auriculares, la generación y el guardado de curvas, el envío con análisis, la nota en Grabaciones/Mis grabaciones y la nota media del dashboard. La comprobación en Chrome del flujo completo está pendiente de registrar aquí. Si la grabación dura menos del 90% del tiempo real (visto en Chrome con auriculares Bluetooth, cuando el AudioContext del grabador va a ~0,66×), la toma no se analiza y se avisa de que el audio llegó incompleto; la prueba real con auriculares Bluetooth sigue pendiente.

En Android/Chrome, iPhone/Safari y escritorio:

1. Abrir la vista previa HTTPS; conceder micrófono, grabar, detener, reproducir y volver a grabar.
2. Confirmar MIME nativo real, preferencia Opus/mono y fallback AAC sin cambiar extensiones. Medir tamaño/duración en metadatos; el bitrate objetivo puede variar.
3. Probar permisos denegados, micrófono ausente/desconectado, llamada entrante, cambio de app y navegador incompatible.
4. Cortar red durante subida, recuperar y reintentar con la misma vista previa; comprobar que existe un solo archivo/registro disponible.
5. Reabrir grabaciones antiguas y dos fechas distintas; comprobar el avance/búsqueda del reproductor en Safari.
6. Probar límites con un archivo cercano a 20 MB y grabación de diez minutos; comprobar memoria y CPU de Worker en métricas reales.
7. Práctica con guía: en dispositivos reales, probar la toma completa y el fragmento, el envío solo de la toma completa, el aviso al cerrar con una toma pendiente y la descarga al salir de la cuenta; con auriculares Bluetooth, usar **Calibrar auriculares** y comprobar que la nota no depende del retraso.
8. Verificar invitado, dos cuentas distintas de tenor, desactivación/restablecimiento y privacidad después de cierre de sesión.
8. En una temporada de prueba remota, exportar archivos, verificar descargas, confirmar cierre y continuar lotes tras una interrupción. Nunca usar datos reales para una prueba de borrado.
9. Comprobar que la cuenta permanece Free, el bucket es Standard y privado, las cuotas se comparten como se esperaba y no hay nuevos productos facturables.

La plataforma está publicada con D1 y autenticación comprobados. R2 está conectado y el transporte privado de archivos está comprobado. Falta validar micrófono y reproducción en teléfonos físicos. GitHub Pages permanece disponible como publicación anterior. Las pruebas de funcionamiento no certifican cuotas ni facturación de la cuenta.

