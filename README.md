# Tenores · Práctica y jefatura

Ampliación de la web existente en HTML/CSS/JavaScript. Conserva la identidad, referencias propias, letras, descarga, velocidad, repetición, búsqueda, mini reproductor, carta, calendario y encuesta. Retira el experimento de interpretaciones de otros coros y sus enlaces a YouTube.

Frontend y API comparten origen. Producción preparada para Workers Static Assets, D1 y R2 Standard privado. Un Durable Object SQLite-backed calcula las contraseñas con scrypt; evita ejecutar ese cálculo dentro del límite de 10 ms del Worker Free. No hay dependencias de ejecución del frontend, analítica externa ni registro público.

**Estado:** código y pruebas locales; no publicado. Falta configurar una cuenta Cloudflare Free, identificador D1, secreto de configuración inicial y, si se autoriza su suscripción, bucket R2. No se activó facturación ni se modificó un alojamiento público. Android/iPhone físicos y métricas de producción requieren validación antes del lanzamiento.

Repositorio previsto: https://github.com/armando1345/Tenores. La subida de esta versión se prepara en una rama separada, `plataforma-2026`. La guía para Armando, la separación de responsabilidades y las opciones para conservar GitHub Pages están en [docs/SUBIDA-GITHUB.md](docs/SUBIDA-GITHUB.md). Las cuentas reales y los audios locales se transfieren por separado y nunca forman parte de la subida del código.

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

No usar `--remote` en pruebas. La configuración R2 está comentada para impedir su activación accidental. Las instrucciones de publicación y de reversión están en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Manual de jefatura

1. Entrar con la cuenta administrativa `Jefe de cuerda`. Las cuentas reales ya existen en la base local; su transferencia privada a producción se realizará al conectar Cloudflare. En una instalación nueva sin transferencia, la configuración inicial usa una clave temporal y deja de permitir crear jefatura cuando existe una cuenta administrativa; después se retira ese secreto.
2. En **Integrantes**, seleccionar **Editar** para asignar o restablecer el acceso. Los tenores admiten contraseñas de al menos 8 caracteres; jefatura, al menos 12. Los ocho integrantes de 2026 tienen acceso en la base local. Las migraciones públicas importan sus identidades sin contraseñas ni acceso activo, hasta la transferencia o activación privada.
3. Usar la casilla **Inscrito en [año]** para asignar o retirar a esa persona de la temporada seleccionada. Una misma identidad puede pertenecer a distintos años. Desmarcar inscripción afecta futuros ensayos; los ensayos existentes conservan su lista.
4. Para dar de baja una cuenta, desmarcar **Acceso activo** y guardar. Sus sesiones se revocan; no se borra asistencia. Para restablecer contraseña, editar la cuenta y escribir una nueva. El campo vacío conserva la actual; la contraseña nunca se muestra. La jefatura actual no puede desactivarse desde este panel.
5. Jefatura puede cambiar o restablecer contraseñas desde **Integrantes → Editar**, también la de su propia cuenta. Después de cambiar la contraseña de jefatura, recargar e iniciar sesión de nuevo; se revocan las sesiones anteriores. Entregar acceso a la siguiente jefatura por un canal privado y cambiar la contraseña al hacer el relevo; no enviarla en el repositorio.
6. Pulsar **Registrar ensayo**, elegir fecha, inicio y cierre y continuar con integrantes. Solo se cargan tenores activos e inscritos en la temporada elegida. Todos comienzan **Sin marcar**. Elegir **A tiempo**, **Tarde** o **No llegó**. En **Tarde**, elegir Justificada/Injustificada y luego la hora de llegada.
7. Revisar el resumen. **Guardar borrador** conserva pendientes en D1. **Finalizar registro** exige todos los estados. El servidor vuelve a validar y calcula los minutos; la interfaz confirma únicamente después de guardarlos.
8. Desde **Estadísticas → Información por ensayo**, continuar borradores o **Ver / corregir** ensayos anteriores. En **Inicio**, Registrar ensayo cambia a Ensayo activo mientras se guardan llegadas; los pendientes no cuentan como ausencias. Guardar una corrección reemplaza el registro vigente, recalcula estadísticas y deja bitácora. Si otra persona corrigió primero, volver a abrir el ensayo. No editar SQL.
9. En **Repertorio**, añadir o editar título, URL HTTPS de la referencia de tenores y letra. Desactivar una canción la oculta del repertorio activo sin eliminar grabaciones anteriores. Las canciones de 2026 actualizan las tarjetas públicas existentes; otras temporadas se consultan en el espacio privado.
10. En **Grabaciones**, escuchar audios de los integrantes; los tenores solo ven los propios en **Mis grabaciones**. Las opciones personales **Mis grabaciones** y **Salir** están en el menú desplegable, sin nombre de cuenta ni botón de contraseña en la parte superior. Jefatura también accede a su panel desde el menú. Cada envío es independiente y se organiza por canción y fecha. Debajo de la voz de tenores de cada canción, pulsar **Subir mi práctica**, grabar y **Detener**. Revisar el audio y confirmar con **Enviar**; la confirmación informa que jefatura podrá escucharlo. El acceso con onda de audio **Mis grabaciones** junto al reproductor abre el historial de esa canción; el del menú abre la biblioteca completa. Si la subida falla, la vista previa se conserva para reintentar; al recargar se pierde una grabación todavía no enviada. El navegador avisa antes de abandonar.
11. **Actividad web** contiene accesos, último acceso, días activos y actividad por canción. Las reproducciones se deduplican por persona/canción/día y representan inicios, no escuchas completas ni horas practicadas. El número exacto de audios almacenados se consulta en Grabaciones/Resumen. Estas métricas no son públicas.
12. En **Temporadas**, crear el año con sus fechas, seleccionar la nueva temporada, inscribir integrantes y añadir repertorio. No se copian ausencias retroactivamente ni se recrean personas.
13. Para liberar audios, seleccionar la temporada y **Exportar audios**. Descargar el manifiesto y **cada archivo** mediante los enlaces; comprobar las descargas antes del borrado. Esta exportación ofrece archivos individuales, sin servicio externo ni ZIP en servidor.
14. Escribir exactamente `ELIMINAR AUDIOS [año]` para confirmar el cierre. Luego pulsar **Continuar eliminación** las veces necesarias. Cada solicitud elimina hasta cinco objetos. Se puede volver más tarde y continuar; las subidas recientes esperan al menos 15 minutos. Asistencia, horas y bitácoras se conservan. Un cambio de año nunca borra audios por sí solo.
15. En **Estadísticas → Configuración de grabaciones**, reducir tamaño, duración, envíos diarios o almacenamiento. El servidor impide superar máximos conservadores; avisa al 80% y bloquea reservas sobre el umbral. No borra archivos para obtener espacio.

## Datos históricos y estadísticas

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

