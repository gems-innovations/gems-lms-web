# GEMS LMS Web

Frontend Angular 22 del LMS: estudiantes, panel docente y administración por institución. Consume la API a través del gateway.

## Desarrollo local

Requisitos: Node.js 24, npm y el backend en ejecución. Desde gems-lms-api ejecutar `./dev-up.sh --seed` en Git Bash (Windows) o Bash, después de configurar su `.env`.

```bash
npm ci
npm start
```

Abrir http://localhost:4200. API predeterminada: http://localhost:8080/api/v1. Las cuentas están en `../gems-lms-api/docs/integracion-front-back.md`; la contraseña es `DEV_PASSWORD` del `.env` local del backend.

Las librerías shared, auth, education, instructor y admin se consumen desde dist. Después de editar una librería, compilarla y reiniciar el servidor:

```bash
npx ng build education
npx ng serve main --port 4200
```

Si cambiaron dependencias entre librerías, usar `npm run build:all`.

## Pruebas

Las suites verifican contratos HTTP, sesión, permisos de navegación, contraseñas, grupos, rutas, reseñas y archivos. Requieren Chrome instalado.

```bash
npm run test:ci
```

La validación de GitHub ejecuta automáticamente instalación reproducible, auditoría de
dependencias de producción, compilación de librerías, todas las pruebas unitarias y build PWA/SSR
en cada cambio dirigido a `develop`, `qa` o `main`.

Si Chrome no se detecta, definir CHROME_BIN. Ejemplo en PowerShell:

```powershell
$env:CHROME_BIN = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:ci
```

Para iterar ejecutar solo el proyecto afectado:

```bash
npx ng test auth --watch=false --browsers=ChromeHeadless
```

Las pruebas de navegador cubren reportes, perfil, navegación rápida, preferencias,
onboarding y accesibilidad para administrador, docente y estudiante. Las pruebas públicas
funcionan sin credenciales; para los recorridos autenticados definir `E2E_ADMIN_EMAIL`,
`E2E_INSTRUCTOR_EMAIL`, `E2E_STUDENT_EMAIL` y `E2E_ADMIN_PASSWORD`:

```bash
npm run test:e2e
```

## Catálogo visual

Storybook documenta los componentes compartidos y ejecuta revisiones de accesibilidad
durante el desarrollo:

```bash
npm run storybook
npm run build:storybook
```

## Producción

```bash
npm run build:all
npx ng build main --configuration production
```

Salida: dist/main/browser y dist/main/server. Ejemplo de ejecución SSR en PowerShell:

La carga inicial se controla con un presupuesto de 650 kB sin comprimir y 800 kB como
límite de error. La medición actual es cercana a 642 kB (164 kB estimados por red). Excel,
PDF, gráficas y las pantallas de cada rol permanecen en fragmentos diferidos; revisar este
presupuesto cuando una dependencia pase al paquete inicial.

```powershell
$env:API_BASE_URL = 'https://api.example.com/api/v1'
$env:NG_ALLOWED_HOSTS = 'lms.example.com,localhost'
$env:PORT = '4000'
npm run serve:ssr:main
```

NG_ALLOWED_HOSTS admite nombres separados por comas, sin protocolo ni puerto. Configurar el proxy para conservar un host admitido. El backend debe permitir el origen público del frontend en CORS_ALLOWED_ORIGINS y usarlo como FRONTEND_URL para los correos.

El servidor entrega /config.js desde API_BASE_URL, antes de iniciar la aplicación. Esta URL es pública; el archivo no debe contener secretos. Para servir únicamente la salida estática, editar dist/main/browser/config.js:

```javascript
globalThis.API_BASE_URL = 'https://api.example.com/api/v1';
```

Servir config.js sin caché y las rutas de la aplicación con retorno a index.html. Cambiar la URL no requiere recompilar las librerías. Sin configuración se conserva la API local.

La compilación de producción también genera una PWA instalable. El service worker guarda el
cascarón visual y recursos estáticos, pero nunca respuestas de `/api`, para evitar conservar
datos privados en caché. La aplicación avisa cuando no hay conexión y cuando una versión nueva
está lista. Servir `ngsw-worker.js`, `ngsw.json` y `manifest.webmanifest` desde el mismo origen y
con HTTPS (localhost funciona durante pruebas). El servidor SSR ya aplica caché inmutable solo a
archivos versionados, fuerza revalidación del service worker y añade CSP, protección contra marcos,
política de permisos y otras cabeceras de seguridad.

## Acceso y servicios externos

Las cuentas las crea el administrador de la institución; el registro público está cerrado. El cambio de contraseña temporal y la recuperación están conectados a la API. En desarrollo, el backend entrega los correos a Mailpit; en producción se configura un proveedor SMTP real. Los tokens nunca se escriben en registros.

El backend guarda archivos en FILES_DIR, que necesita almacenamiento persistente en producción. Consultar `../gems-lms-api/docs/integracion-front-back.md` para el estado de integración y las revisiones pendientes.
