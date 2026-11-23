# Frontend — Catálogo de cuentas

Interfaz web para administrar el catálogo de cuentas: crear cuentas con código jerárquico (clases, grupos, cuentas y subcuentas), visualizar el catálogo como árbol expandible y eliminar cuentas con confirmación.

Construida con **React 19 + Vite 8 + TypeScript** (modo `strict`). Sin librerías de estado ni de UI: el estado se maneja con hooks propios y los estilos con CSS Modules.

## Requisitos

- Node 22 (ver `.nvmrc` en la raíz del repositorio)
- npm 10+
- La API corriendo y accesible (por defecto `http://localhost:3000`; ver README de la raíz)

## Puesta en marcha

```bash
npm install     # desde la raíz del repositorio (instala también las dependencias de web/)
npm run dev:web # o: npm run dev --prefix web
```

La aplicación queda disponible en `http://localhost:5173`.

## Variables de entorno

| Variable       | Por defecto             | Descripción                                          |
| -------------- | ----------------------- | ---------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:3000` | URL base de la API con la que se comunica el frontend |

Copia `.env.example` a `.env` para personalizarla. Si cambias el puerto de Vite, actualiza `WEB_ORIGIN` en la API (CORS).

## Estructura

```
src/
├── api.ts                        # Cliente HTTP mínimo sobre fetch + ApiError
├── types.ts                      # Modelo del dominio y keys de error de la API
├── App.tsx                       # Pantalla principal (composición)
├── components/
│   ├── CreateAccountForm.tsx     # Alta de cuentas con validación por campo
│   ├── AccountTree.tsx           # Árbol expandible/colapsable del catálogo
│   └── ConfirmDialog.tsx         # Confirmación de eliminación
├── hooks/
│   ├── useCatalog.ts             # Estado del catálogo: árbol, alta y baja
│   └── useDeleteFlow.ts          # Flujo de eliminación con confirmación
└── *.module.css                  # Estilos por componente (CSS Modules)
```

## Arquitectura y decisiones

**Separación de responsabilidades.** Los componentes son de presentación; la comunicación con la API vive en `api.ts` y la lógica de estado en hooks (`useCatalog`, `useDeleteFlow`). `App.tsx` solo compone. Esto mantiene los componentes reutilizables y la lógica testeable de forma aislada.

**Errores como contrato, no como texto.** La API devuelve errores con una `key` estable (`INVALID_CODE`, `DUPLICATE_CODE`, `PARENT_NOT_FOUND`, `HAS_CHILDREN`, …). El frontend los mapea al campo correspondiente de la UI en lugar de mostrar mensajes crudos, así los errores de servidor aparecen junto al input que los causó.

**Validación en dos capas.** El formulario valida localmente (formato y longitud del código: 1, 2, 4 o 6 dígitos; obligatoriedad de nombre; naturaleza solo para clases) y muestra los errores de servidor por campo cuando la API rechaza la operación. La regla de dominio —solo las clases de 1 dígito definen naturaleza, los descendientes la heredan— se refleja deshabilitando el selector y con una nota explicativa.

**Cargas idempotentes.** `useCatalog` numera cada petición de carga y descarta respuestas obsoletas, de modo que la recarga es segura bajo el doble montaje de `StrictMode` y no hay carreras si el usuario recarga mientras hay una petición en vuelo. Tras crear o eliminar se recarga el árbol; si la recarga falla, se conserva el árbol previo y se muestra un error con opción de reintentar.

**Accesibilidad.** El árbol usa `aria-expanded`/`aria-controls` en los nodos con hijos, los errores se anuncian con `role="alert"`, la confirmación de éxito con `role="status"` y los campos relacionan error e input vía `aria-describedby`.

## Scripts

| Comando           | Descripción                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo de Vite (puerto 5173)  |
| `npm run build`   | Type-check con `tsc -b` y build de producción |
| `npm run lint`    | Lint con oxlint                               |
| `npm run preview` | Sirve el build de producción localmente       |
