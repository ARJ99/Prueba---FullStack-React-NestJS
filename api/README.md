# API — Catálogo de cuentas contables

Servicio REST para gestionar un **catálogo jerárquico de cuentas contables**: alta de cuentas, consulta del catálogo como árbol y baja de cuentas hoja.

- **Stack:** NestJS 12 + TypeScript (ESM, `module: nodenext`)
- **Puerto:** `3000` (configurable con `PORT`)
- **Pruebas:** Vitest (unitarias + e2e con supertest)
- **Estado:** sin base de datos — persistencia en memoria (ver [Decisiones de diseño](#decisiones-de-diseño))

---

## Requisitos

- **Node 22** (ver `.nvmrc`; con `nvm use` queda listo).
- **npm 10 o superior** — con npm 9.2 la instalación falla.

## Instalación y ejecución

Desde esta carpeta (`api/`):

```bash
npm install
npm run start:dev    # servidor en modo watch en el puerto 3000
```

> El repositorio es un monorepo de dos paquetes npm independientes orquestado por scripts de la raíz con `--prefix` (sin workspaces). Desde la raíz, `npm install` instala ambos paquetes (vía `postinstall`) y `npm run dev` levanta esta API junto al resto de la aplicación.

Una vez levantada, la API expone `http://localhost:3000/accounts`. Para verificar que responde:

```bash
curl http://localhost:3000/accounts/tree   # devuelve [] con el catálogo vacío
```

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run start:dev` | Servidor en modo watch (puerto 3000) |
| `npm run build` | Compila con `nest build` → `dist/` |
| `npm run start:prod` | Corre lo compilado (`node dist/main`) |
| `npm run lint` | oxlint con reglas type-aware sobre `src/` y `test/` |
| `npm run format` | Prettier (comillas simples, trailing commas) |
| `npm test` | Pruebas unitarias (Vitest): `**/*.spec.ts` |
| `npm run test:e2e` | Pruebas e2e: `test/*.e2e-spec.ts` (supertest) |
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

## Arquitectura

```
src/
├── main.ts                     # bootstrap: CORS (WEB_ORIGIN) y puerto (PORT)
├── app.module.ts               # módulo raíz: importa AccountsModule
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
└── accounts.e2e-spec.ts        # e2e del catálogo vía supertest
```

La separación es **controlador → casos de uso (servicios) → repositorio**:

- El controlador no conoce reglas de negocio: no valida nada, solo traduce errores del dominio a respuestas HTTP.
- Los servicios concentran las reglas y son puros respecto de la infraestructura: dependen del repositorio concreto inyectado, cuya interfaz mínima (`findByCode` / `findAll` / `save` / `delete`) deja la puerta abierta a reemplazarlo por una base de datos real sin tocar los casos de uso.
- Los errores de dominio (`accounts.errors.ts`) cargan una `key` estable (`INVALID_CODE`, `HAS_CHILDREN`, …) que el controlador expone en el cuerpo de error para que cualquier cliente la consuma.
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

Toda respuesta de error comparte la misma forma; `key` es estable y los clientes la usan para ubicar el error:

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

## Configuración

Variables leídas con `process.env` (no hay módulo de configuración):

| Variable | Default | Qué controla |
|----------|---------|--------------|
| `PORT` | `3000` | Puerto de escucha de la API |
| `WEB_ORIGIN` | `http://localhost:5173` | Origen HTTP aceptado por CORS |

> `WEB_ORIGIN` debe coincidir con el origen desde el que se consume la API; de lo contrario, el navegador bloqueará las peticiones por CORS. Las peticiones sin navegador (curl, Postman) no se ven afectadas.

## Decisiones y límite del alcance

- **Persistencia en memoria**: intencional para el alcance mínimo; la interfaz del repositorio está pensada para swap a base de datos sin cambios en los servicios.
- **Sin librería de validación** (class-validator, zod): las validaciones viven en los servicios, donde también están las reglas de negocio, y tienen cobertura de pruebas unitarias.
