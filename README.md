# Catálogo de cuentas

Módulo full-stack para administrar un catálogo contable jerárquico: crear cuentas, verlas como árbol y eliminarlas. El código es la identidad y define la jerarquía por su longitud — 1 dígito: clase, 2: grupo, 4: cuenta, 6: subcuenta — y el padre de cada cuenta es su prefijo en el nivel inmediatamente superior (`110505` → `1105` → `11` → `1`).

| Carpeta | Qué hay | Puerto |
|---------|---------|:------:|
| `api/` | API NestJS 12 con TypeScript ESM | 3000 |
| `web/` | Frontend React 19 + Vite | 5173 |

## Cómo correrlo

Requisitos: **Node 22** (`.nvmrc`) y **npm 10+** (con npm 9.2 la instalación falla).

```bash
npm install     # instala la raíz, api/ y web/ (postinstall)
npm run dev     # levanta API (:3000) y web (:5173) a la vez
```

Abrir http://localhost:5173. Otras variables (opcionales, con valores por defecto): `VITE_API_URL` en el front (`http://localhost:3000`, ver `web/.env.example`) y `WEB_ORIGIN` en la API (`http://localhost:5173`). Si cambia el puerto del front, cambiar `WEB_ORIGIN`, porque la conexión entre ambos pasa por CORS.

| Script | Qué hace |
|--------|----------|
| `npm run dev` | API y front juntos, en modo watch |
| `npm run dev:api` / `npm run dev:web` | Solo uno de los dos |
| `npm run build` | Compila los dos |
| `npm test` | Pruebas unitarias de la API (Vitest) |
| `npm run test:e2e --prefix api` | Pruebas e2e de la API (supertest) |
| `npm run lint` | oxlint en los dos paquetes |

## Decisiones

### Backend

- **Módulo `src/accounts` con casos de uso separados del controlador.** El controlador (`AccountsController`) solo traduce HTTP; la lógica vive en `CreateAccountService`, `TreeService` y `DeleteAccountService`. Así cada regla se prueba unitariamente sin HTTP, y el controlador queda como capa delgada de mapeo.
- **Jerarquía como funciones puras (`levelOf`, `parentCodeOf`).** La longitud del código define el nivel y el padre es un prefijo del código: la regla central del catálogo queda en funciones sin dependencias, fáciles de probar y reutilizadas por creación, árbol y borrado.
- **Repositorio en memoria detrás de una interfaz mínima** (`findByCode` / `findAll` / `save` / `delete`). El alcance no pide base de datos; la interfaz mantiene los casos de uso testeables y deja la persistencia enchufable: reemplazarla por un repositorio real toca una sola clase.
- **Errores del dominio con `key` estable en la respuesta** (`{ statusCode, key, message }`, p. ej. `DUPLICATE_CODE`). La UI puede ubicar cada error junto al campo que corresponde sin parsear texto de mensajes; el mensaje humano queda como complemento, no como contrato.
- **Mapeo error → HTTP por semántica:** datos inválidos → 400, conflicto con el estado del catálogo (código duplicado, cuenta con hijas) → 409, código inexistente (padre o cuenta a eliminar) → 404.
- **Naturaleza (`debito`/`credito`) obligatoria en clases y heredada del padre al crear.** El invariante contable "todo descendiente comparte la naturaleza de su clase" se cumple por construcción, sin verificaciones posteriores.
- **Árbol construido en memoria, ordenado por código y defensivo:** las raíces son las clases y, si existiera una cuenta huérfana (estado imposible si creación y borrado validan), no se cuelga de ningún árbol.

### Frontend

- **Sin librería de estado ni de fetching: un solo hook (`useCatalog`) es dueño del estado del servidor** (árbol, carga, error, recarga, crear, eliminar). Es un único recurso de servidor con invalidación trivial; TanStack Query no aportaría suficiente para justificar la dependencia. Menos dependencias y una fuente de estado clara.
- **CSS Modules (nativo en Vite) en lugar de librería de componentes.** Estilos con alcance por componente y costo de runtime cero; para la escala de esta UI, una librería solo agregaría peso.
- **Árbol con expandir/colapsar por nodo** (expandido por defecto), botón de eliminar por nodo conectado a un flujo de confirmación (`useDeleteFlow` + modal `ConfirmDialog`), y formulario de alta con validación en el cliente que replica las reglas de la API; los errores de la API se mapean **por `key` al campo correspondiente**.
- **Estados explícitos en todo el flujo:** carga, error con reintento, catálogo vacío y operaciones en curso. Ninguna pantalla en blanco ni acciones silenciosas.

## API

| Método y ruta | Cuerpo | Respuestas |
|---------------|--------|------------|
| `POST /accounts` | `{ code, name, nature? }` — `nature` solo para clases (código de 1 dígito); el resto hereda la del padre | `201` creada · `400` datos inválidos · `404` padre inexistente · `409` código duplicado |
| `GET /accounts/tree` | — | `200` árbol anidado (`{ code, name, nature, children[] }`) |
| `DELETE /accounts/:code` | — | `204` eliminada · `404` no existe · `409` tiene cuentas hijas |

Cuerpo de error: `{ statusCode, key, message }`.

| `key` | Significado |
|-------|-------------|
| `INVALID_CODE` | El código debe ser numérico con longitud válida (1, 2, 4 o 6 dígitos) |
| `INVALID_NAME` | El nombre es obligatorio |
| `NATURE_REQUIRED` | Las clases requieren `nature`: `debito` o `credito` |
| `DUPLICATE_CODE` | Ya existe una cuenta con ese código |
| `PARENT_NOT_FOUND` | El padre del código no existe |
| `ACCOUNT_NOT_FOUND` | La cuenta a eliminar no existe |
| `HAS_CHILDREN` | La cuenta tiene hijas y no puede eliminarse |

## Pruebas

```bash
npm test                        # unitarias de la API (Vitest)
npm run test:e2e --prefix api   # e2e de la API (supertest)
```

29 unitarias + 14 e2e. Las unitarias cubren las reglas del dominio (validación de código y nombre, naturaleza obligatoria y heredada, unicidad, árbol, borrado solo de hojas) y las e2e recorren cada endpoint verificando los códigos de estado y las `key` de error de la tabla anterior.

## Qué quedó afuera

- **Persistencia real (base de datos):** el alcance no la pedía; el repositorio en memoria mantiene la puerta abierta.
- **Regla "solo las cuentas hoja aceptan movimientos":** requiere un módulo de movimientos que no existe aún; hoy el catálogo solo valida estructura (hojas al eliminar).
- **Edición/renombrado de cuentas:** solo alta, consulta y baja.
- **Autenticación y autorización.**
- **i18n:** la UI es solo en español.
- **Pruebas automatizadas del frontend** (la cobertura de pruebas está en la API).
- **CI.**

## Con más tiempo

- **Reemplazar el repositorio por una base de datos real** — con la interfaz actual es un cambio de una clase, más su prueba.
- **Módulo de movimientos** que aplique la regla de solo hojas con asientos.
- **Más operaciones del catálogo:** renombrar, mover, y una vista de lista plana con filtros y paginación.
- **Pruebas del frontend** con Vitest + Testing Library.
- **Auditoría de accesibilidad** del árbol y los diálogos.
- **Pipeline de CI** (lint, pruebas y build en cada PR).
