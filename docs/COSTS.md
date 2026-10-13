# Costo objetivo y controles · Verificación 12 de octubre de 2026

No se activaron servicios, tarjetas ni suscripciones. El costo previsto para 7–11 tenores, máximo 15 más jefatura, es **$0 mensual mientras se mantengan las cuotas gratuitas**. Las cuotas son de cuenta/producto y pueden compartirse con otros proyectos. No hay garantía perpetua.

| Recurso | Cuota gratuita verificada | Uso de Tenores |
| --- | --- | --- |
| Workers Free | 100.000 solicitudes/día; 10 ms de CPU por solicitud | API pequeña; estáticos por Static Assets |
| D1 Free | 5 millones de filas leídas/día; 100.000 escritas/día; 5 GB totales | Usuarios, sesiones, temporadas, ensayos y metadatos |
| Durable Objects Free, SQLite-backed | 100.000 solicitudes/día; 13.000 GB-s/día; CPU de 30 s por invocación | Un objeto para scrypt, solo activo al calcular contraseñas |
| R2 Standard | 10 GB-mes; 1 millón de operaciones clase A/mes; 10 millones clase B/mes | Audios privados; requiere suscripción autorizada |

Fuentes oficiales: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [Durable Objects Free](https://developers.cloudflare.com/durable-objects/platform/pricing/), [CPU de Durable Objects](https://developers.cloudflare.com/durable-objects/platform/limits/), [R2 Standard](https://developers.cloudflare.com/r2/pricing/) y [suscripción requerida](https://developers.cloudflare.com/r2/get-started/).

## Supuestos conservadores

Con 15 personas, tres grabaciones semanales de cinco minutos durante 16 semanas, a 64 kbps: 720 archivos × unos 2,4 MB ≈ 1,73 GB. Es una **estimación**, no una medición: Safari/AAC y otros navegadores pueden ignorar el bitrate objetivo. Se cuentan los bytes reales, incluyendo reservas pendientes.

Límites iniciales: 600 segundos, 20.000.000 bytes por archivo, diez reservas por persona/día, 3.000.000.000 bytes por temporada y 8.000.000.000 bytes para todas las temporadas. Los límites de R2 incluyen archivos pendientes; al llegar al umbral una nueva reserva se rechaza antes de escribir a R2. Los audios anteriores no se borran. Jefatura puede reducirlos en la interfaz; no superar los máximos conservadores.

Un solo archivo no reserva 20 MB automáticamente: reserva su tamaño real. Cerrar una temporada requiere exportación opcional, confirmación escrita y lotes reanudables. Archivos de temporadas anteriores siguen contando hasta borrarlos expresamente. Se avisa cuando el uso está cerca del límite.

Controles adicionales: solicitudes limitadas por IP mediante D1, login limitado por IP/usuario antes de calcular scrypt, historial de audios y ensayos paginado de 30 elementos, limpieza de cinco objetos por solicitud, rango de audio privado y eventos de reproducción deduplicados por persona/canción/día. No se escribe continuamente durante una reproducción. Invitados no tienen eventos individuales de actividad.

El hash local de prueba consumió aproximadamente 454 ms de CPU de proceso en Node, según una medición de desarrollo. Eso no mide Cloudflare y rebasa los 10 ms del Worker; por esa razón se delega a un Durable Object Free con margen de CPU mayor. Sin timers, WebSockets ni almacenamiento de contraseñas en ese objeto. Para este grupo, el uso previsto de hashing es muy inferior a su cuota gratuita; verificar métricas en la vista previa antes de lanzamiento.

## Riesgos residuales

R2 cobra uso adicional sobre su cuota; no ofrece aquí un bloqueo financiero global efectivo. **Las alertas de facturación no bloquean cargos.** Los límites internos protegen únicamente este bucket/app; no controlan otros buckets, proyectos, cambios de cuota ni acciones manuales del propietario. No publicar el bucket ni suscribir un plan de pago como solución automática.

Ataques, fallos de proveedor o cambios futuros pueden impedir servicio o agotar cuotas. El plan Free de Workers/D1/Durable Objects rechaza operaciones al superar sus límites, según documentación vigente; al cambiar voluntariamente a Paid cambian las condiciones. El tráfico legítimo esperado es pequeño, pero las consultas de rango y exportaciones también cuentan como operaciones R2.

La duración procede del reloj de MediaRecorder en cliente; el servidor valida el valor declarado y tamaño/MIME/firma básica. Sin decodificación/transcodificación de servidor no puede certificar independientemente duración, mono o bitrate de un cliente modificado. El límite real de bytes, cuotas transaccionales y permisos siguen aplicándose. Las referencias originales y el logo dependen de los alojamientos Cloudinary ya existentes; no se contrató otro servicio.

Revisar cuota y precios al inicio de cada temporada; documentar cualquier cambio antes de habilitarlo. Mantener la cuenta en Free y exportar asistencia/audio antes del relevo. Si falta autorización de R2, operar cuentas y ensayos y dejar grabaciones deshabilitadas con un mensaje claro.
