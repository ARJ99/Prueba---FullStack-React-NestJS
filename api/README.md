# API — Catálogo de cuentas (NestJS)

Backend de la prueba técnica full-stack: un **catálogo jerárquico de cuentas contables** con alta, consulta en árbol y baja, construido con NestJS 12 y TypeScript (ESM).

Este README cubre el paquete `api/` y también el proyecto completo, para que cualquier desarrollador pueda levantarlo, entenderlo y extenderlo.

---

## El proyecto completo

El repositorio es un monorepo de dos paquetes npm independientes, orquestados por scripts de la raíz con `--prefix` (no hay workspaces ni tooling de monorepo):

| Carpeta | Qué hay | Puerto |
|---------|---------|:------:|
| `api/` | API NestJS 12 con el catálogo de cuentas | 3000 |
| `web/` | Front React 19 + Vite: alta de cuentas, árbol expandible y borrado con confirmación | 5173 |

**Cómo se conectan:** el front llama a la API directamente por URL absoluta (sin proxy de Vite); CORS es el mecanismo que los une.

- El front lee la URL base de la variable `VITE_API_URL` (default `http://localhost:3000`); el ejemplo está en `web/.env.example`.
- La API acepta peticiones del origen en `WEB_ORIGIN` (default `http://localhost:5173`).
- Si cambias el puerto del front, cambia `WEB_ORIGIN`, y viceversa.

**Qué hace la aplicación:** un catálogo jerárquico de cuentas contables. El front muestra el árbol del catálogo (nodos expandibles con código, nombre y naturaleza), un formulario para dar de alta cuentas y un borrado de hojas con diálogo de confirmación. Toda operación se refleja en el árbol, que se recarga tras cada alta o baja.

Ambos paquetes comparten el mismo contrato de dominio (`Account`, `AccountTreeNode`, `ErrorKey`): la API lo define en `src/accounts/`, el front lo refleja en `web/src/types.ts` y lo consume a través de `web/src/api.ts` (un wrapper de `fetch` que traduce las respuestas de error a `ApiError`).

### Estructura del front (`web/src/`)

```
api.ts                       # wrapper de fetch + apiUrl(); mapea errores a ApiError
types.ts                     # contrato de dominio (espejo de los tipos de la API)
App.tsx                      # pantalla única: form + árbol + diálogo de borrado
components/
├── CreateAccountForm.tsx    # alta de cuentas con validación por campo
├── AccountTree.tsx          # árbol expandible/colapsable con badge de naturaleza
└── ConfirmDialog.tsx        # confirmación antes de eliminar
hooks/
├── useCatalog.ts            # estado del catálogo: carga, recarga, alta, baja
└── useDeleteFlow.ts         # flujo de borrado: confirmación → eliminación → error
```

## Requisitos

- **Node 22** (ver `.nvmrc`; con `nvm use` queda listo).
- **npm 10 o superior** — con npm 9.2 la instalación falla.

## Cómo correrlo

Desde la raíz del repositorio:

```bash
npm install      # instala la raíz y, vía postinstall, api/ y web/
npm run dev      # API (watch) y front juntos
```

Abre http://localhost:5173. Verás el catálogo: el formulario "Nueva cuenta" arriba y el árbol del catálogo abajo. Si el árbol muestra cuentas, el front está hablando con la API.

Solo el backend (desde `api/`):

```bash
npm install
npm run start:dev    # servidor en modo watch, puerto 3000
```

## Comandos (desde `api/`)

| Comando | Qué hace |
|---------|----------|
| `npm run start:dev` | Servidor en modo watch (puerto 3000) |
| `npm run build` | Compila con `nest build` → `dist/` |
| `npm run start:prod` | Corre lo compilado (`node dist/main`) |
| `npm run lint` | oxlint con reglas type-aware sobre `src/` y `test/` |
| `npm run format` | Prettier (comillas simples, trailing commas) |
| `npm test` | Pruebas unitarias (Vitest): `**/*.spec.ts` |
| `npm run test:e2e` | Pruebas e2e: `**/*.e2e-spec.ts` (supertest) |
| `npm run test:cov` | Cobertura |
| `npm run test:watch` / `test:debug` | Vitest en watch / con inspector |

Un solo archivo: `npm test -- src/accounts/create-account.service.spec.ts`.

---

## Dominio: el catálogo de cuentas

Las cuentas se identifican por un **código numérico cuya longitud define el nivel**:

| Dígitos | Nivel | Ejemplo |
|:-------:|-------|---------|
| 1 | clase | `1` |
| 2 | grupo | `11` |
| 4 | cuenta | `1105` |
| 6 | subcuenta | `110505` |

Reglas de negocio:

1. **Jerarquía por prefijo**: el padre de una cuenta es el prefijo de su código en el nivel inmediatamente superior (`110505` → `1105` → `11` → `1`). Las clases no tienen padre y son las raíces del árbol.
2. **Naturaleza heredada**: cada cuenta tiene naturaleza `debito` o `credito`. Solo las **clases** la declaran explícitamente en su creación; los niveles inferiores **heredan** la del padre (es un invariante del árbol). Crear una cuenta sin padre existente se rechaza — no hay cuentas huérfanas.
3. **Código único**: no pueden existir dos cuentas con el mismo código.
4. **Borrado solo de hojas**: eliminar una cuenta con hijas se rechaza. La verificación ocurre **antes** de borrar, nunca después.
5. **Validaciones de entrada**: el código debe ser numérico puro con longitud de nivel válida; el nombre es obligatorio (se recortan los espacios de los extremos).

## Arquitectura de `api/`

```
src/
├── main.ts                     # bootstrap: CORS (WEB_ORIGIN) y puerto (PORT)
├── app.module.ts               # módulo raíz: importa AccountsModule
├── app.controller.ts           # endpoint raíz (Hello World de conexión)
└── accounts/                   # módulo del catálogo
    ├── account.ts              # modelo + helpers puros (levelOf, parentCodeOf)
    ├── accounts.controller.ts  # rutas REST + mapeo de errores del dominio
    ├── create-account.service.ts  # caso de uso: alta
    ├── delete-account.service.ts  # caso de uso: baja
    ├── tree.service.ts         # consulta: árbol jerárquico ordenado
    ├── accounts.repository.ts  # persistencia en memoria (Map por código)
    ├── accounts.errors.ts      # errores de dominio con `key` estable
    └── *.spec.ts               # pruebas unitarias de cada servicio
test/
├── accounts.e2e-spec.ts        # e2e del catálogo vía supertest
└── app.e2e-spec.ts
```

La separación es **controlador → casos de uso (servicios) → repositorio**:

- El controlador no conoce reglas de negocio: valida nada, solo traduce errores del dominio a respuestas HTTP.
- Los servicios concentran las reglas y son puros respecto de la infraestructura: dependen del repositorio concreto inyectado, cuya interfaz mínima (`findByCode` / `findAll` / `save` / `delete`) deja la puerta abierta a reemplazarlo por una base de datos real sin tocar los casos de uso.
- Los errores de dominio (`accounts.errors.ts`) cargan una `key` estable (`INVALID_CODE`, `HAS_CHILDREN`, …) que el controlador expone en el cuerpo de error y que la UI usa para ubicar cada error junto al campo que corresponde.
- La persistencia es **en memoria** (`Map`): decisión deliberada del alcance mínimo; los datos se pierden al reiniciar el proceso.

### Convenciones TypeScript

- Paquete **ESM** (`"type": "module"`) con `module: nodenext`: los imports internos relativos usan **extensión `.js`** aunque estén en archivos `.ts` (p. ej. `./account.js`). Mantener este estilo al agregar archivos.
- `strict` activo; decorators habilitados (`emitDecoratorMetadata`, `experimentalDecorators`); target ES2023.
- `tsconfig.build.json` excluye `test/` y `*.spec.ts` de la salida compilada.
- Lint con **oxlint** (no ESLint), type-aware via `oxlint-tsgolint` (`.oxlintrc.json`): `typescript/no-floating-promises` es **error** — nunca dejar promesas sin esperar; `typescript/no-explicit-any` está desactivado.
- Pruebas con **Vitest** (no Jest), con `globals: true`; ambos configs resuelven los aliases de `tsconfig` vía `resolve: { tsconfigPaths: true }`. Los e2e levantan el `AppModule` completo con `Test.createTestingModule`, llaman a la API con `supertest` y deben cerrar con `app.close()` en el teardown.
- Nuevos recursos: `nest g resource <name>` (los imports generados ya salen con estilo `.js`).

## API REST

Base: `http://localhost:3000`

### `GET /` — verificación de conexión

Devuelve `Hello World!`. Es el ping que usa la pantalla del front.

### `POST /accounts` — crear cuenta

```jsonc
// Clase (declara su naturaleza):
{ "code": "1", "name": "Activos", "nature": "debito" }

// Niveles inferiores (heredan la naturaleza del padre):
{ "code": "11", "name": "Activos corrientes" }
```

- `201` con la cuenta creada: `{ "code": "1", "name": "Activos", "nature": "debito" }`
- Errores: `400` (código o nombre inválido, naturaleza faltante), `409` (código duplicado), `404` (padre inexistente).

### `GET /accounts/tree` — catálogo como árbol

```jsonc
[
  {
    "code": "1",
    "name": "Activos",
    "nature": "debito",
    "children": [
      { "code": "11", "name": "Activos corrientes", "nature": "debito", "children": [] }
    ]
  }
]
```

Raíces = clases; hermanos ordenados por código (lexicográfico coincide con el numérico porque todos los códigos del nivel tienen la misma longitud). `200` siempre; catálogo vacío devuelve `[]`.

### `DELETE /accounts/:code` — eliminar cuenta

- `204` sin cuerpo si se eliminó.
- `404` si el código no existe, `409` si tiene hijas.

### Cuerpo de error

Toda respuesta de error comparte la misma forma; `key` es estable y la UI la usa para ubicar el error:

```jsonc
{
  "statusCode": 409,
  "key": "DUPLICATE_CODE",
  "message": "Ya existe una cuenta con el código 1."
}
```

| `key` | HTTP | Cuándo |
|-------|:----:|--------|
| `INVALID_CODE` | 400 | El código no es numérico o su longitud no es 1, 2, 4 o 6 |
| `INVALID_NAME` | 400 | Nombre vacío o ausente |
| `NATURE_REQUIRED` | 400 | Clase (1 dígito) sin `nature` `debito`/`credito` |
| `DUPLICATE_CODE` | 409 | Ya existe una cuenta con ese código |
| `PARENT_NOT_FOUND` | 404 | El padre del código no existe |
| `ACCOUNT_NOT_FOUND` | 404 | El código a eliminar no existe |
| `HAS_CHILDREN` | 409 | La cuenta a eliminar tiene hijas |

## El front (`web/`)

React 19 + Vite, sin librerías de estado ni de componentes: el estado del catálogo vive en hooks propios.

**Pantalla única** (`App.tsx`) con tres piezas:

- **`CreateAccountForm`** — alta de cuentas. Valida en el cliente antes de enviar (código numérico de 1/2/4/6 dígitos, nombre obligatorio, naturaleza requerida solo para clases) y muestra el error junto a cada campo. Si la API rechaza, usa la `key` del cuerpo de error para ubicar el mensaje en el campo que corresponde (`INVALID_CODE`/`DUPLICATE_CODE`/`PARENT_NOT_FOUND` → código, `INVALID_NAME` → nombre, `NATURE_REQUIRED` → naturaleza). El campo naturaleza se deshabilita salvo para clases, con una nota que explica la herencia. Tras crear, limpia el formulario y muestra una nota de éxito que desaparece a los 4 segundos.
- **`AccountTree`** — árbol expandible/colapsable. Cada fila muestra código, nombre y un badge de naturaleza (débito/crédito); los nodos con hijas tienen botón de expansión accesible (`aria-expanded`, `aria-controls`). Todo expandido por defecto, y el estado de expansión **sobrevive a las recargas** del árbol: vive en el componente raíz, no en los nodos. Mientras se elimina una cuenta, su botón muestra "Eliminando…" y queda deshabilitado.
- **`ConfirmDialog`** — confirmación antes de eliminar. Mientras la eliminación está en curso el diálogo se queda abierto (botones bloqueados) y se cierra al resolver, con éxito o con error.

**Estado del catálogo** (`useCatalog`): árbol, carga inicial, recarga, alta y baja. Detalles a conocer para extenderlo:

- La carga es **idempotente**: cada petición lleva un número de turno y solo la última actualiza el estado, así que el doble montaje de `StrictMode` no causa condiciones de carrera.
- Si una recarga falla **con datos previos**, el árbol anterior sigue visible junto al mensaje de error y su botón "Reintentar"; no se vuelve al estado de carga.
- Crear o eliminar recarga el árbol al éxito; si la recarga falla, el error aparece en `loadError`, no en la operación.
- Las operaciones exponen su progreso (`creating`, `removingCode`) para deshabilitar botones y evitar envíos duplicados.

**Flujo de borrado** (`useDeleteFlow`): separa pedir confirmación (`requestDelete`) de ejecutarla (`confirmDelete`), expone el error del último intento (p. ej. `HAS_CHILDREN`) para mostrarlo junto al árbol, y lo limpia al reintentar o descartarlo.

Los errores de red o de cuerpo no-JSON (p. ej. proxy caído) caen a `ApiError` con `key: 'UNKNOWN'` y un mensaje genérico, así que ninguna ruta deja de manejarse.

## Configuración

Variables leídas con `process.env` (no hay módulo de configuración):

| Variable | Default | Qué controla |
|----------|---------|--------------|
| `PORT` | `3000` | Puerto de escucha de la API |
| `WEB_ORIGIN` | `http://localhost:5173` | Origen del front aceptado por CORS |

## Decisiones y límite del alcance

- **Persistencia en memoria**: intencional para el alcance mínimo; la interfaz del repositorio está pensada para swap a base de datos sin cambios en los servicios.
- **Contrato compartido a mano**: `web/src/types.ts` duplica los tipos de `api/src/accounts/account.ts` a propósito (paquetes independientes, sin tooling compartido); si cambias el dominio, actualiza ambos.
- **Sin librería de validación** (class-validator, zod): las validaciones viven en los servicios, donde también están las reglas de negocio, y tienen cobertura de pruebas unitarias.
