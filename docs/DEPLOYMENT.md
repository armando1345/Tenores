# Publicación y operación

## Estado comprobado · 13 de octubre de 2026

La plataforma está publicada en https://tenores.tenores-au-6e09.workers.dev. Frontend y API comparten origen HTTPS. Se usa exclusivamente la cuenta Cloudflare **Tenores**, separada del sitio personal de Armando.

- Worker: tenores. Cuenta: 6e09b3b147d9e2a7234b301a21903494.
- D1: tenores, identificador 6a4ae822-7c3b-4e82-bb99-bd3d0ea333b8. Las cinco migraciones están aplicadas.
- PASSWORDS: Durable Object PasswordHasher; calcula hashes y no almacena las cuentas.
- La lista vigente tiene nueve tenores activos de 2026, incluido Carlos, con PIN únicos de cuatro números. Los PIN se restablecieron de forma privada y sus sesiones anteriores se revocaron. Jefatura conserva su contraseña. No se publican PIN ni hashes reales en GitHub.
- 2026 no contiene ensayos, asistencia, presentaciones ni grabaciones de muestra. También se retiraron esas muestras del entorno local. Los datos de 2025 se compararon antes y después y permanecen idénticos: nueve integrantes, once ensayos y 2400 minutos programados.
- R2 está activado por Armando. El bucket tenores-grabaciones usa Standard, acceso privado y binding RECORDINGS. No tiene r2.dev ni dominios públicos. Se comprobaron PUT, GET, HTTP Range, reintentos y permisos; la muestra temporal y sus sesiones se retiraron.
- GitHub conserva el repositorio armando1345/Tenores. Armando sube las fuentes a plataforma-2026. GitHub Pages y main no se modificaron desde esta configuración. No hay despliegue automático desde GitHub.

Diez comprobaciones en la publicación verificaron HTTPS, D1, los accesos de jefatura y tenor, restricciones de rol, CSRF y datos de ambas temporadas. Se retiraron las sesiones y los eventos temporales de esa verificación. La prueba no creó ensayos ni grabaciones.

## Datos y comportamiento

En producción, D1 guarda usuarios, hashes, sesiones, temporadas, ensayos, asistencia y metadatos de grabaciones. R2 privado guarda los archivos de audio enviados. Antes de Enviar, la toma está únicamente en memoria del navegador. Los respaldos locales y SQL de transferencia están en .local/, fuera de Git y de Static Assets.

`0005_presentations_live_rehearsals.sql` añade presentaciones y la marca `is_live` de ensayos. El ensayo activo conserva estado interno `draft`, permite pendientes y no entra en porcentajes consolidados hasta finalizarse. Solo puede haber uno activo por temporada. Los cambios se guardan con Guardar llegadas y se consultan cada 10 segundos mientras la pestaña está visible; no hay conexión WebSocket. El detalle privado de cada tenor se restringe a su propietario o jefatura. La muestra fija del 90% fue sustituida por el análisis real de la práctica (ver 0006 y 0007).

`0006_practice_analysis.sql` añade el esquema del análisis (curva de referencia por canción y nota/detalle por grabación). `0007_song_references_data.sql` carga las 12 curvas de referencia; se genera con `node scripts/build-reference-migration.mjs <carpeta-de-curvas>`. Ambas deben aplicarse (`pnpm exec wrangler d1 migrations apply tenores`, primero `--local`) antes de publicar el Worker.

Los usuarios conservan mayúsculas y tildes. La API normaliza Unicode sin quitar tildes y compara el acceso sin distinguir mayúsculas. Cambiar un nombre conserva identificador, contraseña e historial si no se indica una contraseña nueva.

La pantalla de acceso muestra Usuario y PIN; al escribir Jefe de cuerda, el campo usa Contraseña y teclado de texto. La edición de integrantes valida cuatro dígitos para tenores y doce caracteres como mínimo para jefatura. Ambos accesos mantienen scrypt con sal individual, cookies privadas, CSRF y los límites de intentos existentes. El nombre interno password_hash se conserva para evitar una migración de datos innecesaria.

El ensayo activo conserva estado interno draft y permite pendientes. No entra en porcentajes consolidados hasta finalizarse; solo puede haber uno activo por temporada. Los cambios se consultan cada diez segundos mientras la pestaña está visible. No hay WebSocket.

La práctica guiada calcula el análisis real en el navegador. D1 conserva la puntuación y el detalle junto a la grabación enviada; las tomas no enviadas no se guardan. El dashboard y el modo avanzado usan puntuaciones reales y muestran — sin análisis. La presentación histórica de 2025 se conserva.

## Actualizaciones del despliegue existente

Usar la configuración actual de wrangler.jsonc: ya contiene la cuenta y D1 correctos. No crear otra base ni ejecutar de nuevo la importación privada. No se necesita BOOTSTRAP_SECRET porque ya existe jefatura.

1. Instalar dependencias con pnpm install --frozen-lockfile.
2. Ejecutar node --test tests/*.test.mjs y node scripts/build.mjs.
3. Para migraciones nuevas, respaldar D1 y probarlas primero con wrangler d1 migrations apply tenores --local. Aplicar --remote únicamente a la cuenta/base comprobadas.
4. Ejecutar pnpm exec wrangler deploy --dry-run --outdir output/worker.
5. Publicar con pnpm exec wrangler deploy usando la autorización de la cuenta Tenores. El build contiene solo archivos públicos permitidos; no incluye SQL, servidor, respaldos ni grabaciones personales.
6. Comprobar la publicación y documentar el resultado. La subida manual a GitHub no provoca este despliegue automáticamente.

Las migraciones usan LF, protegido por .gitattributes. Los triggers usan SELECT RAISE(...) WHERE condición para evitar los problemas de separación de sentencias de D1. Estas restricciones se comprobaron en SQLite local y en D1 remoto.

En una instalación nueva e independiente, crear otra D1, aplicar sus migraciones y activar las identidades mediante transferencia privada o la API. Solo si no existe jefatura se configura un BOOTSTRAP_SECRET aleatorio por entrada interactiva, se crea la cuenta y se retira el secreto. Nunca publicar credenciales en migraciones.

## R2 conectado y comprobado

Armando completó el checkout de R2 y autorizó su configuración. El bucket Standard está conectado al Worker. No se solicitó un cambio a Workers Paid. La cuota incluida no garantiza gratuidad fuera de sus límites.

Configuración aplicada y mantenimiento:

1. Conservar tenores-grabaciones en clase **Standard**, con acceso privado.
2. Mantener desactivados r2.dev, dominios públicos y reglas que eliminen audios completos automáticamente. La regla predeterminada solo cancela subidas multipart incompletas tras siete días; no elimina prácticas enviadas.
3. Conservar r2_buckets con binding RECORDINGS y el nombre del bucket en wrangler.jsonc.
4. En cada cambio de almacenamiento, comprobar subida, lectura privada y acceso exclusivo del tenor/jefatura. El navegador accede a los audios a través del Worker; no recibe credenciales R2.
5. La comprobación remota retiró sus bytes sintéticos, metadatos, actividad y sesiones. 2026 permanece listo para datos reales. Sigue pendiente validar micrófono y reproducción en teléfonos físicos con el propietario.

Fuentes: [activación de R2](https://developers.cloudflare.com/r2/get-started/), [cuotas y precios](https://developers.cloudflare.com/r2/pricing/).

## Seguridad y operación

scrypt usa N=32768, r=8, p=3, sal aleatoria de 16 bytes y comparación constante. La API delega hashing al Durable Object; el Worker normal no intenta ejecutarlo bajo sus 10 ms. El objeto serializa operaciones para limitar memoria simultánea. La prueba local del runtime ha de verificarse con login válido y creación/restablecimiento de cuentas; la observación real de CPU y cuota del plan requiere vista previa en Cloudflare. Nunca reducir el costo del hash como arreglo de un fallo.

Sesiones: token aleatorio de 256 bits; D1 conserva su SHA-256, no el token; revocación y vencimiento de siete días. Cookies HttpOnly/Secure/SameSite=Strict en HTTPS. Toda escritura exige mismo origen, y las rutas autenticadas además exigen el token CSRF de sesión. Al cambiar contraseña o desactivar usuario se revocan sesiones.

Los límites de grabación configurables viven en `app_limits` y se gestionan desde jefatura. Los triggers D1 cuentan reservas y archivos de todas las temporadas antes de permitir una nueva subida; por tanto dos solicitudes concurrentes no exceden el cupo. Una reserva fallida continúa ocupando cuota hasta que se reintenta o se cierra la temporada. R2 y D1 no tienen una transacción conjunta: la metadata reservada y las claves deterministas permiten recuperar esos fallos sin archivos sin trazabilidad.

La subida toma una reserva temporal después de leer el cuerpo para impedir que un envío lento escriba tras el comienzo del cierre. Un PUT que termina durante el cierre elimina su objeto; si esa eliminación falla, la reserva permanece para reanudar limpieza. El cierre espera reservas/subidas recientes y procesa cinco audios por solicitud. Nunca descuenta almacenamiento antes de confirmar el borrado del proveedor.

El resumen limpia lotes pequeños de sesiones vencidas y contadores de abuso caducados. No hay un servicio externo ni tareas continuas. Al inicio de temporada revisar almacenamiento, cuotas compartidas con otros proyectos y estado de las referencias externas existentes.

## Reversión y respaldo

Antes de migraciones posteriores, exportar D1, por ejemplo `pnpm exec wrangler d1 export tenores --remote --output respaldo-tenores.sql`, guardando el resultado fuera del sitio público y de Git. Los respaldos incluyen hashes y datos privados: tratarlos como información sensible. Verificar Time Travel y su retención vigente en la cuenta; no sustituye la exportación deliberada.

Para retirar el nuevo frontend local, restaurar `index.html`, `styles.css` y `app.js` desde `backups/pre-platform/`. Los nuevos archivos quedan sin enlazar. Para producción, volver a la versión anterior del Worker o a la publicación previa identificada; no borrar D1 ni R2 para revertir la interfaz. Guardar también el commit/configuración de la versión nueva antes de revertir.

Si se cambia el frontend público a Workers, comprobar los enlaces de la encuesta y recuerdos y conservar una ruta de regreso al alojamiento previo. Una eliminación de audio confirmada no tiene reversión automática: descargar y comprobar el archivo antes de cerrar la temporada.
