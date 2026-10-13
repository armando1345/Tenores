# Encuesta de Tenores · Coro Ancalmo

Página estática de cinco pasos. Las respuestas se envían desde GitHub Pages a una aplicación web de Google Apps Script, que añade una fila a Google Sheets. No se pide nombre ni correo.

## 1. Preparar Google Sheets

1. Crea una hoja de cálculo nueva en tu cuenta de Google, por ejemplo **Encuesta Tenores Ancalmo 2026**.
2. Copia el ID de la URL. En `https://docs.google.com/spreadsheets/d/ID_DE_LA_HOJA/edit`, el ID es la parte entre `/d/` y `/edit`.
3. En la hoja, abre **Extensiones → Apps Script**.
4. Sustituye el contenido de `Código.gs` por el contenido de [`AppsScript.gs`](./AppsScript.gs).
5. Cambia `PEGA_AQUI_EL_ID_DE_TU_HOJA` por el ID de la hoja.
6. Guarda el proyecto. En el selector de funciones, elige `prepararHoja` y pulsa **Ejecutar**. Autoriza el acceso a tu hoja cuando Google lo solicite. Esto crea la pestaña **Respuestas Tenores** con los encabezados.

## 2. Publicar Apps Script

1. En Apps Script, selecciona **Implementar → Nueva implementación**.
2. Elige **Aplicación web**.
3. Configura **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier usuario**. Los visitantes podrán enviar respuestas sin entrar a tu cuenta; la hoja no se comparte con ellos.
4. Pulsa **Implementar** y copia la URL que termina en `/exec`.
5. Pega esa URL entre las comillas de [`config.js`](./config.js):

   ```js
   window.TENORES_ENCUESTA_ENDPOINT = 'https://script.google.com/macros/s/TU_ID/exec';
   ```

Si cambias el código de Apps Script después, crea una **nueva versión** en **Implementar → Administrar implementaciones** para que la URL `/exec` use esos cambios.

## 3. Publicar la encuesta en GitHub Pages

Sube la carpeta `encuesta` junto al sitio existente y publica la rama que contiene los archivos. La dirección será algo como `https://TU_USUARIO.github.io/TU_REPOSITORIO/encuesta/`. Si este repositorio se publica desde una carpeta `docs`, copia `encuesta` dentro de `docs`. Mantén `index.html`, `styles.css`, `encuesta.js` y `config.js` juntos.

La página muestra un error claro si falta la URL de Apps Script. No muestra «respuesta recibida» hasta que Apps Script confirma el guardado. Si se reintenta un envío que ya llegó, el ID de envío evita duplicarlo.

## 4. Probar antes de compartir el enlace

1. Abre la URL pública de GitHub Pages y responde una vez con datos de prueba.
2. Comprueba que aparece la confirmación y una fila nueva en la pestaña **Respuestas Tenores**.
3. Borra esa fila de prueba antes de enviar el enlace a los tenores.

**Flujo:** tenor → formulario de GitHub Pages → Apps Script → Google Sheets → confirmación en el formulario. La aplicación web de Apps Script es pública para aceptar respuestas; conserva la hoja como privada y comparte el enlace de la encuesta solo con el equipo.
