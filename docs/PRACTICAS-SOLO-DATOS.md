# Prácticas: resultados sin audio · 21 de octubre de 2026

Esta versión sustituye el envío de grabaciones descrito en los documentos anteriores.

- La tarjeta con micrófono y borde discontinuo vuelve a decir **Subir mi práctica**. Abre la preparación de la prueba guiada.
- Preparación, calibración, grabación y resultados comparten la identidad visual de Tenores. **Entonación** es el resultado principal; **Similitud total**, **Estabilidad** y **Ritmo y entradas** son puntajes de 0 a 100. El ritmo continúa siendo informativo y no forma parte del total. No se ha modificado el cálculo del motor del compañero.
- El micrófono se procesa en memoria en el navegador. Se puede escuchar la toma temporalmente durante la revisión; se descarta al cerrar o reemplazar la prueba. No se codifica, no se sube y no se guarda en el servidor.
- **Enviar resultados** envía JSON a `POST /api/practice-results`: identificador estable, canción, temporada, duración y análisis compactado. Solo se admiten pruebas completas y válidas. Los reintentos no generan otra prueba. Las rutas anteriores de reserva, subida y reproducción de grabaciones devuelven 410.
- D1 guarda `practice_results`: análisis completo, similitud total, autor, canción, temporada y fecha. `GET /api/practice-results` devuelve el historial y los cuatro puntajes; `GET /api/practice-results/:id/analysis` devuelve curvas, recomendaciones y resultados por frase. Solo el autor y jefatura pueden consultar el análisis.
- **Mis resultados** reemplaza la biblioteca personal de audios. **Resultados** en jefatura permite elegir un tenor, consultar sus puntajes y desplegar el mismo análisis que vio el integrante, sin reproductor de grabaciones.
- Las medias generales y el modo avanzado leen estos resultados. Entonación, estabilidad y ritmo se pueden analizar por tenor, grupo, canción y período. Se ponderan por las pruebas con la métrica disponible; un valor ausente se representa con —, mientras que cero sigue siendo cero.
- La migración `0008_practice_results_without_audio.sql` copia íntegros los análisis anteriores antes de retirar los archivos de R2. No elimina personas, inscripciones ni asistencia de 2025. Los audios antiguos sin análisis no crean puntajes ficticios. La retirada física de archivos se ejecuta como mantenimiento verificado, sin exponer una ruta pública de borrado.
- El bucket R2 queda vacío; su binding se conserva para compatibilidad con herramientas de mantenimiento antiguas. Las pistas de referencia del repertorio se mantienen: no son grabaciones de usuarios.
- **Añadir temporada** exporta JSON con resultados y permite cerrar la temporada conservando resultados y asistencia.

Verificación: tests de API/autorización/idempotencia y métricas, runtime real workerd/D1/R2 efímero sin objetos de audio, y recorrido de navegador con voz sintética, sin `MediaRecorder`, revisión por jefatura y diseño móvil. Las pruebas sintéticas no escriben resultados en producción.
