# Subida a GitHub y conexión de Tenores

Repositorio: https://github.com/armando1345/Tenores

La plataforma está publicada en https://tenores.tenores-au-6e09.workers.dev, la dirección elegida por Armando. Cuentas, ensayos y estadísticas están conectados a D1. R2 privado está conectado y el envío/lectura de grabaciones se comprobó con una muestra temporal. La publicación automática desde GitHub todavía no está configurada.

## Archivos para subir

PARA-SUBIR-A-GITHUB contiene la versión actual de las fuentes: interfaz, servidor, migraciones, configuración, instrucciones y pruebas. Se genera mediante una lista explícita y una comprobación de credenciales. No contiene la base local, hashes reales, grabaciones privadas, tokens, dependencias instaladas ni respaldos.

Las cuentas reales y el historial ya se transfirieron a Cloudflare por un canal privado. Subir el código no copia ni reemplaza esos datos. 2026 comienza vacío y 2025 permanece intacto. Las grabaciones de muestra no se trasladarán.

## Pasos de Armando en GitHub

1. Abre el repositorio y selecciona la rama plataforma-2026, donde ya subiste la versión anterior.
2. Selecciona Add file → Upload files.
3. Arrastra el CONTENIDO de PARA-SUBIR-A-GITHUB: archivos y carpetas, sin la carpeta exterior. index.html y wrangler.jsonc deben quedar en la raíz.
4. Incluye .gitignore y .gitattributes. En Windows, activa Ver → Mostrar → Elementos ocultos. Si el navegador omite alguno, créalo mediante Add file → Create new file y copia su contenido exacto.
5. Escribe Actualizar configuración Cloudflare y confirma Commit changes en plataforma-2026.
6. No subas .local/, output/, dist/, node_modules/, .wrangler/ ni archivos de cuentas o respaldos. No hace falta cambiar Settings → Pages para usar el enlace de Cloudflare.

Si usas el ZIP, extráelo primero: GitHub no descomprime el archivo automáticamente. Codex prepara el paquete y Armando realiza la subida. La rama main y la publicación anterior se conservan durante la verificación.

Fuentes: [subir archivos](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository), [crear ramas](https://docs.github.com/en/pull-requests/how-tos/commit-changes/managing-branches-within-your-repository).

## Cloudflare configurado

La cuenta dedicada Tenores y Wrangler están configurados. Worker, D1, migraciones y contraseñas funcionan. Armando completó la activación de R2; Codex creó tenores-grabaciones en Standard privado, conectó RECORDINGS y verificó subida, lectura por rangos y permisos.

La muestra temporal se retiró después de comprobarla; 2026 permanece sin muestras y 2025 conserva su historial. El siguiente paso del propietario es comprobar una grabación real desde su teléfono y subir las fuentes actualizadas a GitHub. Los excesos de las cuotas de R2 pueden facturarse.

Fuente: [comenzar con R2](https://developers.cloudflare.com/r2/get-started/).

## Responsabilidades y pendientes

| Trabajo | Responsable | Estado |
| --- | --- | --- |
| Subir/actualizar las fuentes de GitHub | Armando | Primera subida hecha; actualización preparada |
| Crear cuenta Tenores y autorizar Wrangler | Armando | Hecho |
| Publicar Worker, configurar D1 y transferir cuentas | Codex | Hecho y comprobado |
| Retirar muestras de 2026 y conservar 2025 | Codex | Hecho y comprobado |
| Aceptar la suscripción de R2 | Armando | Hecho |
| Conectar almacenamiento privado y verificar transporte/permisos | Codex | Hecho; muestras retiradas |
| Conectar despliegues desde GitHub | Codex y Armando | Pendiente de autorización de conexión |
| Probar micrófono y reproducción en teléfonos físicos | Armando y Codex | Pendiente |

No hay que volver a crear D1 ni las cuentas. Tampoco se necesita configurar GitHub Pages para ejecutar la API: la plataforma completa se sirve desde Cloudflare bajo la misma dirección HTTPS.
