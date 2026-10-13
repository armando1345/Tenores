# Auditoría previa a modificaciones · 12 de octubre de 2026

La carpeta contiene `index.html`, `styles.css`, `app.js`, ilustraciones y referencias locales en `audios-tenores`. No contiene `.git`, dependencias, backend, credenciales ni manifiestos de alojamiento. `encuesta/README.md` describe GitHub Pages y Apps Script/Sheets; es una indicación documental, no evidencia de un despliegue activo ni de una URL pública. No se modificó la encuesta ni su servicio.

Identidad: negro `#000000`, verde `#0ffc7e`, texto `#f5f8f5`, tipografía de sistema, contenedor de 1080 px, tarjetas oscuras y bordes redondeados. Logo SVG en Cloudinary. Se conservan reproductor propio, descarga, velocidad, repetición, mini reproductor, búsqueda, letras y tamaño de texto, carta de despedida y calendario de presentaciones.

Repertorio: 12 entradas en `SONGS`; referencias públicas de Cloudinary. El experimento `CHOIR_RECORDINGS`, su función `renderChoir`, tarjeta HTML y CSS se retiran. No hay otros enlaces de YouTube en los archivos principales.

Asistencia: `TEAM_OVERVIEW` y `TENOR_MEMBERS_DATA` son agregados de 2025: nueve personas, 11 ensayos y 2400 minutos programados. Algunos minutos son decimales; no existen filas de ensayo ni llegadas. Las copias exactas permanecen en el frontend y `docs/historical-2025.json`; D1 recibe una tabla separada `legacy_attendance`. No se reconstruyen ensayos ni se convierten esos valores a minutos enteros.

2026 contiene ocho nombres existentes (Liam, Marco, Santiago, Diego, Rodrigo, Héctor, Leonel y Mario), sin ensayos ni horas. Se importan esas identidades con UUID permanente y acceso desactivado; no se inventan personas ni contraseñas. Nombres compartidos entre años conservan una identidad; nuevas personas con el mismo nombre deberán crearse por separado desde jefatura.

Definición existente: asistencia significa proporción del tiempo presencial, no porcentaje de ensayos asistidos. Nuevos registros mantienen minutos efectivos / minutos programados. El denominador individual incluye los ensayos en cuya lista fue inscrita esa persona; incorporar a alguien después no crea ausencias retroactivas. Borradores excluidos. El panel sigue mostrando cobertura de ensayos por separado. La categoría de justificación de nuevas tardanzas es privada. Los porcentajes históricos ya publicados se conservan como archivo existente.

Arquitectura preparada: Workers Static Assets + D1 y R2 privado por un mismo origen. El cálculo de scrypt se delega a un único Durable Object SQLite-backed del plan Free, porque supera el límite de CPU del Worker normal. Ese objeto no conserva datos; usuarios y sesiones siguen en D1. GitHub Pages por sí solo no ejecuta una API; mantenerlo como frontend autenticado requeriría cookies entre sitios y otra política CORS. Se prepara una vista previa del mismo frontend en Workers, sin cambiar el alojamiento vigente. La elección final requiere identificar ese alojamiento y validar el entorno gratuito; no se publicó ni migró nada.

Reversión: `backups/pre-platform/` contiene las tres fuentes originales. No se empaqueta ni publica. Se puede restaurar únicamente esos archivos para retirar la interfaz nueva. D1 usa migraciones aditivas y no se borra la base para volver al frontend anterior. Respaldar D1 antes de cada nueva migración. Los borrados de audios confirmados no son reversibles sin exportación previa.
