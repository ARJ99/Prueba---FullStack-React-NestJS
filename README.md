# Catálogo de cuentas

Aplicación **full-stack** para administrar un catálogo contable jerárquico: crear cuentas, verlas como árbol y eliminarlas. El código es la identidad y define la jerarquía por su longitud — 1 dígito: clase, 2: grupo, 4: cuenta, 6: subcuenta — y el padre de cada cuenta es su prefijo en el nivel inmediatamente superior (`110505` → `1105` → `11` → `1`).

**Qué puede hacer un usuario de la app:**

- Crear cuentas desde un formulario, en cualquier nivel (clase → grupo → cuenta → subcuenta).
- Explorar el catálogo como árbol expandible, ordenado por código.
- Eliminar cuentas, con confirmación, siempre que no tengan hijas.

**Stack:** NestJS 12 (API) + React 19 con Vite (front) + TypeScript en los dos lados. Sin base de datos: repositorio en memoria.

| Carpeta | Qué es | Puerto |
|---------|--------|:------:|
| `api/` | API REST (NestJS 12, TypeScript ESM) | 3000 |
| `web/` | Frontend (React 19 + Vite) | 5173 |

Los dos paquetes son independientes (`api/` y `web/`, cada uno con su propio `package.json`) y se comunican por HTTP con CORS: el front llama a la API por URL absoluta, sin proxy de Vite. La raíz solo orquesta con scripts.

## Cómo correrlo

Requisitos: **Node 22** (`.nvmrc`) y **npm 10+** (con npm 9.2 la instalación falla).

```bash
npm install     # instala la raíz, api/ y web/ (postinstall)
npm run dev     # levanta API (:3000) y web (:5173) a la vez
```

Abrir http://localhost:5173.

**Variables de entorno (opcionales):**

| Variable | Dónde | Por defecto | Para qué |
|----------|-------|-------------|----------|
| `VITE_API_URL` | `web/` | `http://localhost:3000` | URL base de la API que consume el front (ver `web/.env.example`) |
| `WEB_ORIGIN` | `api/` | `http://localhost:5173` | Origen CORS permitido |
| `PORT` | `api/` | `3000` | Puerto de la API |

> Si cambia el puerto del front, cambiar `WEB_ORIGIN`: la conexión entre ambos pasa por CORS, no por un proxy de desarrollo.

**Scripts desde la raíz** (operan sobre los dos paquetes vía `--prefix`):

| Script | Qué hace |
|--------|----------|
| `npm run dev` | API y front juntos, en modo watch |
| `npm run dev:api` / `npm run dev:web` | Solo uno de los dos |
| `npm run build` | Compila los dos |
| `npm test` | Pruebas unitarias de la API (Vitest) |
| `npm run test:e2e --prefix api` | Pruebas e2e de la API (supertest) |
| `npm run lint` | oxlint en los dos paquetes |

También se puede trabajar en cada paquete por separado: `npm run dev` dentro de `api/` o de `web/` hace lo mismo que sus equivalentes de la raíz.

---

## Backend (`api/`)

### Qué es

API REST con NestJS 12 y TypeScript ESM (`"type": "module"`; los imports internos usan extensión `.js`). Expone tres endpoints para el catálogo y valida todas las reglas del dominio del lado del servidor.

### Estructura

```
api/src/
├── main.ts                     # Bootstrap: CORS (WEB_ORIGIN) y puerto (PORT)
├── app.module.ts               # Módulo raíz: importa AccountsModule
└── accounts/                   # Todo el dominio del catálogo vive aquí
    ├── account.ts              # Modelo + reglas puras del dominio (levelOf, parentCodeOf)
    ├── accounts.controller.ts  # Capa HTTP: traduce requests/responses, sin lógica
    ├── create-account.service.ts   # Caso de uso: crear cuenta (validación + herencia de naturaleza)
    ├── tree.service.ts             # Caso de uso: construir el árbol jerárquico
    ├── delete-account.service.ts   # Caso de uso: eliminar (solo hojas)
    ├── accounts.repository.ts  # Interfaz + implementación en memoria
    ├── accounts.errors.ts      # Errores del dominio con `key` estable
    ├── accounts.module.ts      # Módulo de Nest: wiring de dependencias
    └── *.spec.ts               # Pruebas unitarias de cada pieza (Vitest)
```

### Cómo está organizado

El controlador es una capa delgada: solo traduce HTTP. Toda la lógica vive en **casos de uso separados** (`CreateAccountService`, `TreeService`, `DeleteAccountService`), que dependen de una **interfaz mínima de repositorio** (`findByCode` / `findAll` / `save` / `delete`) con implementación en memoria. Así cada regla se prueba unitariamente sin HTTP y la persistencia es enchufable: reemplazarla por una base de datos real toca una sola clase.

Las reglas centrales del catálogo son **funciones puras** (`levelOf`, `parentCodeOf` en `account.ts`): la longitud del código define el nivel y el padre es un prefijo. Creación, árbol y borrado las reutilizan.

Invariantes que el backend garantiza por construcción:

- **Unicidad del código** y **existencia del padre** al crear.
- **Naturaleza (`debito`/`credito`)** obligatoria en clases y heredada del padre en el resto — todo descendiente comparte la naturaleza de su clase.
- **Solo se eliminan hojas** (cuentas sin hijas).

### API

| Método y ruta | Cuerpo | Respuestas |
|---------------|--------|------------|
| `POST /accounts` | `{ code, name, nature? }` — `nature` solo para clases (código de 1 dígito); el resto hereda la del padre | `201` creada · `400` datos inválidos · `404` padre inexistente · `409` código duplicado |
| `GET /accounts/tree` | — | `200` árbol anidado (`{ code, name, nature, children[] }`) |
| `DELETE /accounts/:code` | — | `204` eliminada · `404` no existe · `409` tiene cuentas hijas |

Cuerpo de error: `{ statusCode, key, message }`. La `key` es el contrato estable; el mensaje humano es complemento.

| `key` | Significado |
|-------|-------------|
| `INVALID_CODE` | El código debe ser numérico con longitud válida (1, 2, 4 o 6 dígitos) |
| `INVALID_NAME` | El nombre es obligatorio |
| `NATURE_REQUIRED` | Las clases requieren `nature`: `debito` o `credito` |
| `DUPLICATE_CODE` | Ya existe una cuenta con ese código |
| `PARENT_NOT_FOUND` | El padre del código no existe |
| `ACCOUNT_NOT_FOUND` | La cuenta a eliminar no existe |
| `HAS_CHILDREN` | La cuenta tiene hijas y no puede eliminarse |

Mapeo error → HTTP por semántica: datos inválidos → 400, conflicto con el estado del catálogo (duplicado, cuenta con hijas) → 409, código inexistente → 404.

---

## Frontend (`web/`)

### Qué es

SPA con React 19 + Vite, sin router ni librerías de estado, fetching o componentes: la escala de la UI no las justifica. Consume la API directamente por `VITE_API_URL`.

### Estructura

```
web/src/
├── main.tsx                    # Bootstrap de React
├── App.tsx                     # Pantalla única: compone el catálogo
├── api.ts                      # Único punto de contacto con la API (apiUrl(ruta))
├── types.ts                    # Tipos compartidos con el contrato de la API
├── hooks/
│   ├── useCatalog.ts           # Dueño del estado del servidor: árbol, crear, eliminar, recarga
│   └── useDeleteFlow.ts        # Flujo de confirmación de borrado
└── components/
    ├── AccountTree.tsx         # Árbol expandible/colapsable, con eliminar por nodo
    ├── CreateAccountForm.tsx   # Alta con validación en cliente que replica las reglas de la API
    └── ConfirmDialog.tsx       # Modal de confirmación
```

Cada componente tiene su `*.module.css` — CSS Modules nativo en Vite.

### Cómo está organizado

- **Un solo hook dueño del estado** (`useCatalog`): árbol, carga, error, recarga, crear y eliminar. Es un único recurso de servidor con invalidación trivial; no hace falta TanStack Query.
- **Validación duplicada a propósito:** el formulario valida en el cliente lo mismo que la API (`INVALID_CODE`, `INVALID_NAME`, `NATURE_REQUIRED`) y mapea los errores de la API **por `key` al campo correspondiente**, sin parsear mensajes.
- **Estados explícitos en todo el flujo:** carga, error con reintento, catálogo vacío y operaciones en curso. Ninguna pantalla en blanco ni acciones silenciosas.
- **Árbol con expandir/colapsar por nodo** (expandido por defecto), botón de eliminar por nodo conectado a un flujo de confirmación (`useDeleteFlow` + modal `ConfirmDialog`).

### Contrato con la API

`api.ts` construye las URLs con `apiUrl(ruta)` sobre `VITE_API_URL` y no hay más capa de fetching: los hooks hacen `fetch` directo contra los tres endpoints de la tabla de la sección backend y tipan las respuestas con `types.ts`.

---

## Pruebas

```bash
npm test                        # unitarias de la API (Vitest)
npm run test:e2e --prefix api   # e2e de la API (supertest)
```

29 unitarias + 14 e2e. Las unitarias cubren las reglas del dominio (validación de código y nombre, naturaleza obligatoria y heredada, unicidad, árbol, borrado solo de hojas) y las e2e recorren cada endpoint verificando los códigos de estado y las `key` de error de la tabla anterior.

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
