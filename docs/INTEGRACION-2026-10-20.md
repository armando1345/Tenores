# Unificación de Tenores

Se conserva el diseño publicado de Tenores y se incorpora el trabajo de práctica guiada y análisis de voz de GitHub.

- Versión de GitHub recibida: `f997db681dd94bc7a77eb857b2cd1abc072d0f99` (incluye el trabajo de Marco).
- Base común usada para la combinación: `b7ef9029b6d8ac9a9add620a79aa3be46979c2c2`.
- Respaldo remoto: [respaldo-pre-unificacion-2026-10-20](https://github.com/armando1345/Tenores/tree/respaldo-pre-unificacion-2026-10-20), verificado contra la versión recibida. No actualizar esa rama con la unificación.
- Worker anterior para reversión: `72e6f5ac-e37b-48a8-ac13-b5f0e292e53a`.

Los 28 archivos de `practice/` se conservan sin cambios funcionales respecto a la versión recibida. También se conservan las pruebas, el diseño y el plan del compañero en `docs/superpowers/`. La integración mantiene el modo avanzado, la identidad visual, los PIN, el reproductor flotante, las listas de gestión y las presentaciones que solo requieren fecha.

Las migraciones 0006 y 0007 añaden análisis por grabación y las doce curvas de referencia; no sustituyen las cuentas ni los registros anteriores. Antes de aplicarlas se verificó una restauración privada de D1: conserva las 14 identidades, los vínculos de temporada, la grabación existente y los nueve agregados de 2025. Las grabaciones previas sin análisis siguen disponibles y no reciben una puntuación inventada.

El modo avanzado usa ahora notas reales de prácticas enviadas con análisis, en lugar de 90% de muestra. Los grupos se calculan a partir de la suma de puntuaciones y el número de prácticas; los audios sin análisis no entran en el denominador. Se mantienen el verde oficial para la primera métrica y el verde lima para la segunda.

Validación: pruebas del motor y plataforma, runtime nativo workerd/D1/R2 con recursos efímeros, comprobación de integridad de las doce curvas y recorrido completo en Chrome con micrófono sintético: práctica guiada, análisis, envío y coincidencia del resultado del tenor con el de jefatura y las estadísticas. Una prueba opcional de Fum Fum Fum requiere un WAV local no incluido en el repositorio; no equivale a una validación con teléfonos físicos.

El código unificado debe quedar en `plataforma-2026`. La conexión automática con Cloudflare se configura únicamente después de sincronizar esa rama, apuntando al Worker existente `tenores` y conservando los bindings DB, RECORDINGS y PASSWORDS. El acceso de Cloudflare a GitHub puede requerir la autorización del propietario. No guardar tokens ni copias de D1 en el repositorio.
