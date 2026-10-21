# Tenores · Práctica y jefatura

**Prácticas sin audio · 21 de octubre de 2026:** la interfaz está brandeada y muestra la similitud total como puntuación principal. Debajo explica entonación, estabilidad y ritmo, con énfasis en la entonación. Se envían y guardan exclusivamente resultados reales del motor; jefatura recibe los puntajes, las curvas, las frases y las recomendaciones. Detalles actuales en [docs/PRACTICAS-SOLO-DATOS.md](docs/PRACTICAS-SOLO-DATOS.md).

**Unificación del 20 de octubre de 2026:** se integra la práctica guiada y el análisis real de voz del compañero con el diseño actual, el modo avanzado y los formularios simplificados. La versión recibida de GitHub está conservada en `respaldo-pre-unificacion-2026-10-20`. Detalles y verificación en [docs/INTEGRACION-2026-10-20.md](docs/INTEGRACION-2026-10-20.md).

Ampliación de la web existente en HTML/CSS/JavaScript. Conserva la identidad, referencias propias, letras, descarga, velocidad, repetición, búsqueda, mini reproductor, carta, calendario y encuesta. Retira el experimento de interpretaciones de otros coros y sus enlaces a YouTube.

Frontend y API comparten origen. Producción preparada para Workers Static Assets, D1 y R2 Standard privado. Un Durable Object SQLite-backed calcula las contraseñas con scrypt; evita ejecutar ese cálculo dentro del límite de 10 ms del Worker Free. No hay dependencias de ejecución del frontend, analítica externa ni registro público.

**Estado al 13 de octubre de 2026:** publicado en [Tenores](https://tenores.tenores-au-6e09.workers.dev), en la cuenta Cloudflare Tenores. D1 contiene las cuentas reales y el historial de 2025. Se comprobaron los accesos de jefatura y tenor. Los ensayos, la asistencia, las presentaciones y las grabaciones de muestra de 2026 se retiraron; 2025 se conserva intacto. R2 Standard privado está activado y conectado: se comprobaron subida, lectura y permisos con un archivo sintético temporal, retirado al terminar. Android/iPhone físicos y métricas de producción requieren validación antes del lanzamiento completo.

Repositorio: https://github.com/armando1345/Tenores. Armando sube las fuentes a la rama `plataforma-2026`; todavía no hay publicación automática desde GitHub. La dirección elegida para la plataforma es la de Cloudflare. La guía y la separación de responsabilidades están en [docs/SUBIDA-GITHUB.md](docs/SUBIDA-GITHUB.md). Las cuentas se transfirieron por un canal privado y nunca forman parte de la subida del código. Las grabaciones de muestra no se trasladarán a producción.

## Ejecutar y probar

Se necesita Node.js 24 o posterior. Estas operaciones no requieren Cloudflare ni dependencias externas:

```powershell
node scripts/build.mjs
node --test tests/*.test.mjs
node scripts/dev.mjs
```

Abrir `http://127.0.0.1:8787`. El servidor usa el mismo Worker con adaptadores locales SQLite/archivos; no simula respuestas exitosas del backend. Los datos de desarrollo se guardan en `.local/`, excluida de Git y de Static Assets. La clave inicial local se genera en `.local/setup-key.txt`; no es una credencial de producción. Para pruebas aisladas puede usarse `node scripts/dev.mjs --test`: crea únicamente credenciales de prueba en memoria, nunca las usar en un despliegue público.

Wrangler es una dependencia **de desarrollo**, con resolución conservada en `pnpm-lock.yaml`. Para comprobar el runtime Cloudflare:

```powershell
pnpm install --frozen-lockfile
pnpm exec wrangler d1 migrations apply tenores --local
pnpm exec wrangler dev --local
```

No usar `--remote` para desarrollo: wrangler.jsonc está conectado a los recursos reales. Las comprobaciones remotas controladas deben retirar únicamente sus propias muestras y conservar datos reales. Las instrucciones de publicación y de reversión están en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Manual de jefatura

1. Entrar con la cuenta administrativa `Jefe de cuerda`. Las cuentas reales ya existen en D1 y en la base local. La publicación actual no necesita configuración inicial. En una instalación nueva sin transferencia, la configuración inicial usa una clave temporal y deja de permitir crear jefatura cuando existe una cuenta administrativa; después se retira ese secreto.
2. En **Integrantes**, usar **Añadir nuevo integrante** para crear una cuenta o **Editar** para asignar/restablecer el acceso. El formulario aparece solo al solicitarlo y puede cancelarse. Los tenores usan usuario y PIN de exactamente cuatro números; jefatura mantiene contraseña de al menos doce caracteres. La lista vigente de 2026 tiene nueve tenores activos, incluido Carlos. Las migraciones públicas importan identidades sin credenciales ni acceso activo; la activación se realiza por separado, de forma privada. No incluir PIN reales en código ni archivos públicos.
3. Usar la casilla **Inscrito en [año]** para asignar o retirar a esa persona de la temporada seleccionada. Una misma identidad puede pertenecer a distintos años. Desmarcar inscripción afecta futuros ensayos; los ensayos existentes conservan su lista.
4. Para dar de baja una cuenta, desmarcar **Acceso activo** y guardar. Sus sesiones se revocan; no se borra asistencia. Para restablecer contraseña, editar la cuenta y escribir una nueva. El campo vacío conserva la actual; la contraseña nunca se muestra. La jefatura actual no puede desactivarse desde este panel.
5. Jefatura puede cambiar o restablecer contraseñas desde **Integrantes → Editar**, también la de su propia cuenta. Después de cambiar la contraseña de jefatura, recargar e iniciar sesión de nuevo; se revocan las sesiones anteriores. Entregar acceso a la siguiente jefatura por un canal privado y cambiar la contraseña al hacer el relevo; no enviarla en el repositorio.
6. Pulsar **Registrar ensayo**, elegir fecha, inicio y cierre y continuar con integrantes. Solo se cargan tenores activos e inscritos en la temporada elegida. Todos comienzan **Sin marcar**. Elegir **A tiempo**, **Tarde** o **No llegó**. En **Tarde**, elegir Justificada/Injustificada y luego la hora de llegada.
7. Revisar el resumen. **Guardar borrador** conserva pendientes en D1. **Finalizar registro** exige todos los estados. El servidor vuelve a validar y calcula los minutos; la interfaz confirma únicamente después de guardarlos.
8. Desde **Estadísticas → Información por ensayo**, continuar borradores o **Ver / corregir** ensayos anteriores. En **Inicio**, Registrar ensayo cambia a Ensayo activo mientras se guardan llegadas; los pendientes no cuentan como ausencias. Guardar una corrección reemplaza el registro vigente, recalcula estadísticas y deja bitácora. Si otra persona corrigió primero, volver a abrir el ensayo. No editar SQL.
9. En **Repertorio**, añadir o editar título, URL HTTPS de la referencia de tenores y letra. Desactivar una canción la oculta del repertorio activo sin eliminar grabaciones anteriores. Las canciones de 2026 actualizan las tarjetas públicas existentes; otras temporadas se consultan en el espacio privado. Cada canción muestra **Con curva** o **Sin curva**: la curva de referencia es la que guía y puntúa la práctica. **Generar curva** analiza en el navegador la referencia (solo funciona con referencias alojadas en res.cloudinary.com), muestra una vista previa y se guarda con **Guardar curva**. Cambiar la URL de la referencia invalida la curva y hay que generarla de nuevo; sin curva, la canción no se puede practicar.
10. Pulsar la tarjeta **Subir mi práctica**, seguir los pasos de auriculares y elección de canción completa o fragmento, y después comenzar la prueba con la guía. El primer paso muestra únicamente las indicaciones de auriculares y los botones Ajustar sincronización y Siguiente. Avanzar o volver atrás no inicia la grabación. **Similitud total** aparece en grande sobre el desglose de **Entonación**, **Estabilidad** y **Ritmo y entradas**. Cada medida tiene una explicación; entonación recibe énfasis especial. La gráfica aparece siempre visible justo debajo de Escucha y compara, sin sección de recomendaciones; el repaso de frases sigue siendo desplegable. Solo la prueba completa válida permite **Enviar resultados**, la única acción verde principal. La revisión ofrece dos pistas apiladas para escuchar la referencia o la toma, sin reproducirlas a la vez. El audio permanece temporalmente en memoria y nunca se envía ni guarda. **Volver a grabar** regresa a la preparación sin activar inmediatamente la grabación. Los resultados enviados se consultan en **Mis resultados**; jefatura accede a **Resultados → tenor → Ver análisis completo**.
11. **Actividad web** contiene accesos, días activos y envíos de resultados. Las reproducciones representan inicios, no escuchas completas ni horas practicadas. Las métricas web son privadas.
12. **Añadir temporada** permite crear y seleccionar años, inscribir integrantes, añadir repertorio y exportar los resultados en JSON. El cierre conserva los resultados y la asistencia.
13. En **Presentaciones → Registrar presentación**, solo la fecha es obligatoria. Se puede reservar el día sin nombre, lugar ni horarios; el equipo verá los detalles desconocidos como **Por confirmar**. **Editar** permite completarlos después sin duplicar la presentación. La fecha debe pertenecer a la temporada activa; una hora escrita debe tener formato HH:MM válido.
14. **Modo avanzado**, arriba a la derecha en lugar de Aú Aú, abre la exploración privada inspirada en los controles de YouTube Studio. Seleccionar tenores, comparar grupos A/B, cambiar métricas y consultar barras, evolución o cruce de variables. El período y la canción se aplican con su botón; la canción filtra prácticas y días con escucha, no asistencia ni accesos. Las gráficas, la tabla y el CSV comparten la selección. Los porcentajes del grupo usan numeradores y denominadores sumados, no la media simple de porcentajes individuales. Sin denominador se muestra —. En teléfono, desplegar **Filtros y variables** para modificar la selección.
15. El modo avanzado usa los totales originales de 2025, sin inventar fechas ni evolución; las métricas web se registran desde 2026. La nota de práctica usa los resultados reales del motor de análisis; los audios anteriores sin análisis no cuentan como cero. **Vistas guardadas** conserva solo filtros en este navegador y para esta cuenta; no almacena datos personales de mediciones ni credenciales. **Exportar CSV** genera el detalle seleccionado para uso privado.

Las comprobaciones de esta ampliación están en `tests/advanced.test.mjs` (ponderación, filtros, zona horaria, históricos, privacidad y presentaciones parciales), `scripts/runtime-check.mjs` (D1/workerd real con recursos efímeros) y `scripts/browser-advanced-check.mjs` (Chrome sobre `--test` en puerto 8789). Las pruebas del navegador no deben apuntarse a producción ni a la base local persistente.
## Datos históricos y estadísticas

Sin pruebas enviadas se muestra `—`. La similitud total y la entonación usan el análisis real del motor del compañero, en puntos de 0 a 100; no hay una muestra fija del 90%.

2025 permanece como archivo exacto, con nueve integrantes, 11 ensayos y 2400 minutos programados. Algunos minutos son decimales; no se inventaron ensayos ni llegadas. Una copia verificable vive en `docs/historical-2025.json`, otra en D1 `legacy_attendance` y la original en `backups/pre-platform/`.

**Asistencia pública = minutos efectivos / minutos programados**, la definición que ya utilizaba la web. Cobertura de ensayos es un indicador distinto. Para nuevos registros el denominador individual incluye exclusivamente ensayos en cuya lista estaba esa persona. Sin registros se muestra como falta de datos, nunca como ausencia. Los promedios nuevos incluyen personas con registros finalizados; una ausencia explícita sí aporta cero. Justificar una tardanza no recupera tiempo. La categoría individual de justificación nueva no sale de la API pública. Borradores excluidos.

El modelo ya contiene `departure_at` para salidas anticipadas; por ahora no tiene control visual. La API aplica `MAX(0, MIN(cierre,salida) - MAX(inicio,llegada))` y conserva esa información al corregir un registro.

## Archivos y mantenimiento

- [Auditoría y conservación](docs/AUDIT.md).
- [Despliegue y recuperación](docs/DEPLOYMENT.md).
- [Cuotas, costo previsto y riesgos residuales](docs/COSTS.md).
- [Pruebas y comprobaciones pendientes](docs/TESTING.md).
- `server/`: API, reglas de negocio y contraseñas.
- `migrations/`: esquema, importación de datos existentes y restricciones aditivas.
- `scripts/build.mjs`: lista permitida de archivos públicos; nunca publica servidor, SQL, copias ni secretos.
- `backups/pre-platform/`: fuentes anteriores para reversión. No contiene los nuevos enlaces eliminados en la experiencia pública.

No cambiar secretos ni usuarios mediante el frontend fuera de los formularios de jefatura. Respaldar D1 y exportar audios antes de un relevo o una migración. Revisar cuotas y condiciones de Cloudflare al inicio de cada temporada. El objetivo recurrente es $0 con este grupo y los límites internos; no existe garantía de gratuidad perpetua.

