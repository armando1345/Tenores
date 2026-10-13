# Subida a GitHub y conexión de Tenores

Repositorio: https://github.com/armando1345/Tenores

El repositorio es público y tiene GitHub Pages habilitado. Su rama predeterminada es `main`. Los archivos revisados en la raíz son la versión anterior: `index.html`, `app.js`, `styles.css` y `assets/`. No se ha cambiado el repositorio ni su publicación. Todavía falta confirmar la dirección pública efectiva y la fuente de publicación en Settings → Pages.

## Lo que está listo

La carpeta `PARA-SUBIR-A-GITHUB` contiene las fuentes de la plataforma: interfaz, servidor, migraciones, instrucciones y pruebas. Se genera con una lista explícita de archivos permitidos. No contiene la base local, hashes de las cuentas reales, grabaciones privadas, claves, dependencias instaladas ni respaldos. Los datos públicos agregados de 2025 y los nombres del repertorio sí forman parte de la plataforma.

Las cuentas reales y su historial siguen en esta computadora. No se transfieren al subir el código. Antes de crear recursos remotos se preparó un respaldo privado de SQLite y los audios dentro de `.local/respaldo-publicacion-*`. La base se copia con la API de respaldo de SQLite, incluso si la vista previa está encendida. Ese respaldo no se sube a GitHub.

## Tus pasos ahora: subir las fuentes sin reemplazar main

1. Abre https://github.com/armando1345/Tenores.
2. Haz clic en el selector que dice `main`, encima de los archivos.
3. Escribe `plataforma-2026` y elige **Create branch: plataforma-2026 from main**. Si ya existe, selecciónala.
4. Comprueba que el selector indique `plataforma-2026`.
5. Selecciona **Add file → Upload files**.
6. Abre la carpeta `PARA-SUBIR-A-GITHUB` en tu computadora. Arrastra su CONTENIDO a GitHub: los archivos sueltos y las carpetas, no la carpeta exterior. `index.html` y `wrangler.jsonc` deben quedar en la raíz del repositorio.
7. En Windows, activa **Ver → Mostrar → Elementos ocultos** si no ves `.gitignore`, e inclúyelo. Si el navegador omite ese archivo, créalo desde **Add file → Create new file** copiando el contenido del `.gitignore` preparado.
8. Como mensaje escribe `Preparar plataforma Tenores 2026`. Confirma que se guardará en `plataforma-2026` y pulsa **Commit changes**.
9. Comprueba que aparezcan `platform.js`, `platform.css`, `server/`, `migrations/`, `scripts/`, `docs/`, `tests/`, `package.json` y `wrangler.jsonc`, además de la interfaz.

Esta subida conserva los archivos de `main`. En esta etapa no combines la rama con `main` ni cambies Settings → Pages: primero conectaremos y probaremos el servidor. Si Pages estuviera configurado para publicar otra rama, confírmalo antes de modificar su configuración.

GitHub no descomprime un ZIP para convertirlo en una web. Si recibes también un archivo ZIP del paquete, extráelo y sube los archivos que contiene.

Fuentes: [crear ramas](https://docs.github.com/en/pull-requests/how-tos/commit-changes/managing-branches-within-your-repository), [subir archivos](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

## Tus pasos de Cloudflare

Recomendación: una cuenta de Cloudflare dedicada a **Tenores**, con sus recursos y facturación separados de los demás proyectos. Una cuenta de Cloudflare es un espacio de proyectos; un mismo usuario puede administrar varias cuentas. Puedes conservar tu acceso personal de Armando y administrar una cuenta adicional llamada Tenores. Si la cuenta pertenece al equipo, también puede crearse con su correo institucional e invitar a Armando como miembro.

1. Crea o selecciona la cuenta dedicada a Tenores y comprueba su nombre.
2. Inicia sesión. El acceso, la verificación del correo y la autenticación adicional los completas tú.
3. Cuando configuremos el servidor, autoriza el acceso de Wrangler a esa cuenta. Las contraseñas y los tokens se introducen en el flujo de autorización, no en el chat ni en el repositorio.
4. Para usar R2, revisaremos las condiciones y completarás tú la activación de la suscripción. Aún no se ha activado R2 ni ningún plan de pago.

Fuentes: [cuentas y perfiles](https://developers.cloudflare.com/fundamentals/concepts/accounts-and-zones/), [crear una cuenta](https://developers.cloudflare.com/fundamentals/account/create-account/), [miembros y permisos](https://developers.cloudflare.com/fundamentals/manage-members/).

## Lo que configura Codex después

| Trabajo | Responsable |
| --- | --- |
| Subir estos archivos a la rama de GitHub | Armando |
| Elegir/crear la cuenta dedicada e iniciar sesión | Armando |
| Configurar Worker y componente de contraseñas | Codex, con el acceso autorizado |
| Crear D1, aplicar el esquema y transferir cuentas e historial por un canal privado | Codex |
| Aceptar las condiciones de suscripción de R2 | Armando |
| Crear almacenamiento privado, transferir audios y conectar permisos | Codex |
| Preparar publicación de prueba y conexión con GitHub | Codex |
| Probar acceso y grabación desde teléfonos reales | Armando y Codex |
| Conectar la dirección definitiva tras comprobar la plataforma | Codex |

## GitHub Pages y la dirección actual

El repositorio puede seguir siendo el mismo. La dirección pública requiere decidir cómo conectar la web con el servidor:

- **Dominio propio:** podemos estudiar mantener GitHub Pages para la interfaz y dirigir `/api/*` al Worker mediante Cloudflare. Eso requiere controlar el dominio y configurar sus DNS y rutas. Se probará antes de cambiar la publicación.
- **Dirección `github.io`:** subir archivos no conecta la API. El código actual usa cookies y `/api/` en la misma dirección de la web. Mantener la aplicación completa en esa URL requiere adaptar y probar la autenticación entre servicios; no basta con pegar una URL de Cloudflare. La alternativa preparada es servir toda la plataforma desde Workers y conservar GitHub como repositorio.

La configuración incluida todavía tiene `REEMPLAZAR_ID_D1` y el binding de R2 comentado. No está lista para publicarse como plataforma funcional hasta sustituirlos y probar la conexión. No tienes que editar esos archivos: esa parte la hará Codex.

Fuente de las rutas con dominio propio: [Cloudflare Workers Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/).
