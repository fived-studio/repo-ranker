# Repo Ranker

A dashboard for ranking your GitHub repositories by 14-day traffic, clones, stars, and recent activity. Built as a pnpm monorepo with a React frontend and an Express API server.

## Demo

![Repo Ranker demo](./docs/demo.gif)

> An [`mp4`](./docs/demo.mp4) version is also available for higher-quality playback.

## Workspace layout

```
apps/
  api-server/    Express 5 + Pino API proxying the GitHub REST API with a small in-memory cache.
  repo-rank/     Vite + React frontend (shadcn/ui + Tailwind v4 + TanStack Query + Wouter + Recharts).
packages/
  api-spec/          OpenAPI spec — source of truth for the API contract.
  api-zod/           Generated Zod schemas (Orval).
  api-client-react/  Generated React Query hooks (Orval).
  db/                Drizzle ORM schema (reserved for future persistence).
```

## Requirements

- Node.js 24+
- pnpm 9+
- A GitHub personal access token with `public_repo` (and `repo` if you want private repos and traffic stats).

## Setup

```bash
pnpm install
```

API server environment variables:

| Variable          | Required | Notes                                                               |
| ----------------- | -------- | ------------------------------------------------------------------- |
| `PORT`            | yes      | Port to bind the API server.                                        |
| `API_KEY`         | yes      | Shared secret expected in the `x-api-key` header on every API call. |
| `GITHUB_TOKEN`    | yes      | Personal access token used to call the GitHub REST API.             |
| `GITHUB_USERNAME` | yes      | GitHub login whose repositories you want to rank.                   |
| `LOG_LEVEL`       | no       | Pino log level (defaults to `info`).                                |
| `NODE_ENV`        | no       | `production` disables pretty-printed logs.                          |

Frontend variables (read by Vite):

| Variable    | Required | Notes                                                              |
| ----------- | -------- | ------------------------------------------------------------------ |
| `PORT`      | no       | Dev/preview port (defaults to 5173).                               |
| `BASE_PATH` | no       | Base path when served behind a sub-path (default `/`).             |

## Run

```bash
# API server (build + start)
pnpm --filter @repo-ranker/api-server run dev

# Frontend dev server
pnpm --filter @repo-ranker/repo-rank run dev
```

## Build & typecheck

```bash
pnpm run build       # typecheck + build everything
pnpm run typecheck   # typecheck-only
```

## Regenerate API client

The OpenAPI spec lives at `packages/api-spec/openapi.yaml`. After editing it:

```bash
pnpm --filter @repo-ranker/api-spec run codegen
```

## Architecture notes

- The API server caches per-repo traffic in-memory for 5 minutes and the user profile for 1 hour. Restarting drops the cache.
- The frontend talks to `/api/*` through TanStack Query. Every API response is validated server-side against the generated Zod schemas.
- Tailwind theming is dark-only; the palette lives in `apps/repo-rank/src/index.css`.

## Contributing

This repo follows the [FiveD Studio contribution guide](https://github.com/fived-studio/.github/blob/main/CONTRIBUTING.md). For repo-specific notes (codegen, workspace layout), see the sections above.

## License

[MIT](./LICENSE)
