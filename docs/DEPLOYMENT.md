# Preparación y publicación

No se realizó despliegue. Esta carpeta no tiene `.git`, remoto GitHub ni evidencia verificable de la URL publicada. La encuesta documenta GitHub Pages, pero no confirma el alojamiento actual. Antes de cambiar dominio o enlaces, identificar esa publicación y conservarla operativa durante una vista previa de Workers.

## Estado de los datos y GitHub Pages

La vista previa normal usa `.local/tenores.sqlite` para usuarios, hashes, sesiones, asistencia, temporadas y metadatos de grabaciones, y `.local/recordings/` para archivos de audio. La cuenta de jefatura y las ocho cuentas de tenor de 2026 están activadas en esa base local; no están creadas todavía en una base remota. No se borraron los registros de la cuenta de prueba al desactivarla. Antes de Enviar, la toma existe únicamente en memoria del navegador.

La configuración de producción espera Cloudflare D1 y R2 privado detrás del Worker. `database_id` sigue sin configurar y `r2_buckets` está comentado; por tanto todavía no hay almacenamiento remoto conectado. El Durable Object calcula hashes, pero no guarda las cuentas.

Los usuarios conservan mayúsculas y tildes al mostrarse. La migración `0004_username_key.sql` añade una clave única para comparar accesos sin distinguir mayúsculas; la API normaliza Unicode sin quitar tildes. Actualizar un usuario conserva su identificador, contraseña e historial si no se indica una contraseña nueva.

`0005_presentations_live_rehearsals.sql` añade presentaciones y la marca `is_live` de ensayos. El ensayo activo conserva estado interno `draft`, permite pendientes y no entra en porcentajes consolidados hasta finalizarse. Solo puede haber uno activo por temporada. Los cambios se guardan con Guardar llegadas y se consultan cada 10 segundos mientras la pestaña está visible; no hay conexión WebSocket. El detalle privado de cada tenor se restringe a su propietario o jefatura. La muestra fija del 90% fue sustituida por el análisis real de la práctica (ver 0006 y 0007).

`0006_practice_analysis.sql` añade el esquema del análisis (curva de referencia por canción y nota/detalle por grabación). `0007_song_references_data.sql` carga las 12 curvas de referencia; se genera con `node scripts/build-reference-migration.mjs <carpeta-de-curvas>`. Ambas deben aplicarse (`pnpm exec wrangler d1 migrations apply tenores`, primero `--local`) antes de publicar el Worker.

GitHub Pages publica archivos estáticos, no ejecuta esta API. Las peticiones actuales a `/api/` usan el mismo origen y cookies de sesión; subir el frontend a Pages por sí solo no habilita login, registro de ensayos ni guardado de audios. La opción preparada es publicar frontend y API juntos en Workers. Mantener el frontend en GitHub Pages requeriría definir y probar otra integración de dominio, rutas y sesiones antes de habilitar el acceso privado.

Publicar solo archivos públicos del build; excluir `.local/`, sus respaldos y sus grabaciones. Para llevar las cuentas reales a producción se necesita una transferencia privada de los datos o activar sus identidades en la API remota una vez configurada. No poner contraseñas ni hashes de cuentas reales en migraciones públicas ni en JavaScript.

## Recursos y configuración

Usar una cuenta **Workers Free** y un proyecto independiente de vista previa. No subir a Workers Paid ni aceptar una suscripción facturable automáticamente. D1 y el Durable Object SQLite-backed están disponibles en Free; R2 requiere un proceso de suscripción separado y autorización explícita.

1. Guardar las fuentes actuales y crear un repositorio GitHub si el propietario lo decide. La implementación no ha creado ni modificado repositorios remotos. No publicar `.local`, `.dev.vars`, `.wrangler`, `node_modules` ni credenciales. `backups/pre-platform` puede guardarse en el repositorio privado o como respaldo local; el build no la publica.
2. Instalar dependencias de desarrollo con `pnpm install --frozen-lockfile`. Ejecutar pruebas y `node scripts/build.mjs`.
3. Iniciar sesión en Cloudflare con `pnpm exec wrangler login`. Crear D1 con `pnpm exec wrangler d1 create tenores` y sustituir `REEMPLAZAR_ID_D1` en `wrangler.jsonc` por el identificador devuelto. Conservar `binding: DB`.
4. La configuración define `PASSWORDS → PasswordHasher` y una migración `new_sqlite_classes`. Este Durable Object **solo calcula hashes** mediante un binding privado; no almacena usuarios, contraseñas, sesiones ni bitácoras. No ofrece una ruta HTTP pública. SQLite-backed se elige porque es el backend compatible con Free, aunque esta clase no necesita guardar datos.
5. Aplicar primero a una base local: `pnpm exec wrangler d1 migrations apply tenores --local` (incluye `0006` y `0007`; en remoto, aplicarlas antes de publicar el Worker). Para la base nueva de vista previa, aplicar `--remote` únicamente después de confirmar que es la base correcta. Las migraciones conservan los agregados de 2025; no generan ensayos históricos ficticios.
6. Generar un secreto aleatorio de 32 bytes para `BOOTSTRAP_SECRET` y establecerlo con `pnpm exec wrangler secret put BOOTSTRAP_SECRET` por entrada interactiva. No pasarlo como argumento, escribirlo en Git ni enviarlo en mensajes públicos. Para el runtime local de Wrangler usar `.dev.vars`, excluido del build y de Git. No reutilizar claves ni contraseñas de las pruebas.
7. Antes de publicar: `pnpm exec wrangler deploy --dry-run --outdir output/worker`. Este comando compila sin publicar. El build contiene únicamente HTML/CSS/JS públicos, imágenes y la encuesta. Las referencias propias siguen en sus URLs Cloudinary existentes; no se duplica toda la carpeta de audios en Static Assets.
8. Publicar la vista previa con `pnpm exec wrangler deploy` cuando estén confirmados los recursos Free y los bindings correctos. No asociar todavía el dominio público actual. Mantener frontend y API bajo el mismo origen HTTPS; no añadir CORS para acceder desde GitHub Pages.
9. En la vista previa, abrir **Configuración inicial de jefatura**, introducir la clave temporal y establecer la contraseña de `Jefe de cuerda`. El endpoint deja de permitir creación cuando existe una cuenta administrativa. Eliminar luego el secreto con `pnpm exec wrangler secret delete BOOTSTRAP_SECRET`.
10. Activar las cuentas existentes e inscribir las nuevas usando el panel. Probar acceso como invitado, tenor y jefatura antes de compartir el enlace.

## R2 pendiente de autorización

La integración funciona sin un bucket público y no necesita tokens S3 en el navegador. Hasta configurar `RECORDINGS`, las rutas de subida responden con error explícito; no simulan guardado. Cuentas, ensayos y estadísticas pueden utilizarse sin R2.

**No activar R2 ni completar su checkout sin autorización.** Cloudflare exige una suscripción para usar R2, aun con cuota gratuita. Si se autoriza:

1. Crear `tenores-grabaciones` en clase **Standard**; nunca Infrequent Access.
2. Desactivar acceso público, `r2.dev`, dominio público y reglas de ciclo de vida que borren objetos automáticamente.
3. Descomentar `r2_buckets` en `wrangler.jsonc` con `binding: RECORDINGS` y el nombre correcto.
4. Probar primero con R2 local. No utilizar `--remote` para desarrollo de grabaciones.
5. Publicar esa configuración y validar un audio por dispositivo real. Las claves de objeto nunca se devuelven al cliente; GET/Range pasa por la autorización del Worker. API y medios privados usan `Cache-Control: no-store`.

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
