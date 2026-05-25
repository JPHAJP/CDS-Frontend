# Plan de Desarrollo Frontend CDS

## Alcance
Frontend React + TypeScript + Vite para Casa del Sol en `CDS-Frontend`, compatible con `CDS-Backend`.

## Contrato API
Base URL por defecto: `http://localhost:8000`.

Autenticacion por cookies httpOnly, con `withCredentials: true`. Las mutaciones autenticadas envian `x-csrf-token` desde la cookie `cds_csrf`.

Endpoints cubiertos:
- `GET /health`
- `GET /auth/csrf`
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/status`
- `GET /profile`
- `GET /qr/current`
- `POST /qr/scan`
- `GET /public/qr/current`
- `GET /admin/stats`
- `GET /admin/users/pending`
- `GET /admin/users/search`
- `POST /admin/users/:id/authorize`
- `POST /admin/users/:id/reject`
- `POST /admin/users/:id/unauthorize`
- `POST /admin/users/:id/reauthorize`
- `GET /admin/access-logs`
- `GET /admin/users-inside`
- `POST /admin/users/:id/manual-exit`

## Checklist
- [x] Inicializar Vite + React + TypeScript.
- [x] Configurar Tailwind, Router, Query, Axios y CSRF.
- [x] Implementar login, registro, pendiente, perfil y dashboard.
- [x] Implementar escaneo QR, kiosko publico y QR admin.
- [x] Implementar panel admin con pendientes, busqueda, autorizaciones, logs y usuarios dentro.
- [x] Validar build y lint.

## Criterios de Aceptacion
- No se guarda JWT en `localStorage`.
- La app usa cookies y CSRF para mutaciones.
- Las pantallas estan en español.
- La app compila con `npm run build`.
- El lint no reporta errores criticos.
