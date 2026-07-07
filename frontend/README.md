# Novus RA Intelligence — Frontend

Single-page app for the Novus RA Intelligence platform. It talks to the Django
REST API (JWT auth) exposed by the `backend/` service.

## Stack

- **React 19** + **Vite** (dev server, build).
- **TypeScript** in strict mode.
- **Tailwind CSS v4** (`@tailwindcss/vite`) for styling.
- **shadcn/ui** (Radix primitives, Lucide icons, Geist font) for components —
  vendored under `src/components/ui/`.
- **ESLint** (flat config, `typescript-eslint` + `react-hooks`) + **Prettier**.

## Scripts

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the Vite dev server.                      |
| `npm run build`        | Type-check (`tsc -b`) and build for production. |
| `npm run lint`         | Run ESLint.                                     |
| `npm run format`       | Format the codebase with Prettier.              |
| `npm run format:check` | Check formatting without writing (used by CI).  |
| `npm run preview`      | Preview the production build locally.           |

## Conventions

- **Structure by feature**, not by file type. Each feature owns its slice:

  ```
  src/
    features/<feature>/
      components/   # feature-specific components
      hooks/        # data/state hooks (own the logic)
      api/          # calls to the backend
      types/        # feature types
    components/ui/  # shadcn/ui primitives (vendored)
    lib/            # shared helpers (e.g. cn())
  ```

- **Path alias:** import from `@/...` (maps to `src/...`).
- **SOLID for components:** hooks own data/state, components render; extend via
  composition and small typed props; inject dependencies (data fetching, auth)
  via hooks/context rather than hardcoding them inside a component.
- **Adding a shadcn component:** `npx shadcn@latest add <component>` (run
  Prettier afterwards so the vendored file matches our style).
