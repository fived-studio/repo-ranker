<div align="center">

# Repo Ranker

**A dashboard that ranks your GitHub repos by real traffic.**

14-day views, clones, stars, forks, and activity — pulled live from the
GitHub Traffic API, cached, and surfaced in a single sortable view. Built
for the [FiveD Studio](https://fived-studio.github.io) team to see at a
glance which of their repos people are actually using.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&labelColor=050507&logo=typescript&logoColor=fff)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&labelColor=050507&logo=nodedotjs&logoColor=fff)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-workspaces-f69220?style=flat-square&labelColor=050507&logo=pnpm&logoColor=fff)](https://pnpm.io)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&labelColor=050507&logo=react&logoColor=61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&labelColor=050507&logo=vite&logoColor=fff)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-5-000?style=flat-square&labelColor=050507&logo=express&logoColor=fff)](https://expressjs.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06b6d4?style=flat-square&labelColor=050507&logo=tailwindcss&logoColor=fff)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-00d992?style=flat-square&labelColor=050507)](./LICENSE)

</div>

---

![Repo Ranker demo](./docs/demo.gif)

> Higher-quality [`mp4`](./docs/demo.mp4) is also available.

## What it does

The frontend asks the API server for the traffic stats of every repo owned
by a configured GitHub user, sorts them by the metric you pick, and lets
you drill into per-repo views/clones series, top referrers, and top paths.

```
GitHub REST API ─► api-server (cache 5m/1h, Zod-validated)
                                       │
                                       ▼
                              repo-rank (React + TanStack Query)
```

The API server is a thin, rate-limited proxy in front of the GitHub Traffic
API — every response is shape-checked against the Zod schemas generated from
[`packages/api-spec/openapi.yaml`](./packages/api-spec/openapi.yaml).

## Highlights

- **One source of truth.** The OpenAPI spec drives both the server-side Zod validators and the typed React Query hooks via [Orval](https://orval.dev) — server and client can't drift.
- **Cheap on the rate-limit.** In-memory cache holds traffic data 5 min and the user profile 1 h. Bounded fan-out (concurrency 8) when fetching per-repo traffic.
- **Secret stays server-side.** Vite dev proxy auto-injects the `x-api-key` header so the shared secret never reaches the browser.
- **Dark by default.** Tailwind v4 + shadcn/ui, single-palette dark theme, Recharts for the traffic series.

## Quick start

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env
$EDITOR .env                  # fill in GITHUB_TOKEN, GITHUB_USERNAME, API_KEY
```

Then run the two apps in separate terminals:

```bash
# API on http://localhost:8080  (auto-loads ../../.env)
pnpm --filter @repo-ranker/api-server run dev

# Web on http://localhost:5173  (proxies /api → :8080, injects x-api-key)
pnpm --filter @repo-ranker/repo-rank   run dev
```

Smoke-test the API directly:

```bash
curl -H "x-api-key: $API_KEY" http://localhost:8080/api/healthz
curl -H "x-api-key: $API_KEY" http://localhost:8080/api/me
```

## API

| Method | Path                                | Auth   | Description                                          |
| ------ | ----------------------------------- | ------ | ---------------------------------------------------- |
| `GET`  | `/api/healthz`                      | —      | Liveness probe.                                      |
| `GET`  | `/api/me`                           | x-api-key | Configured GitHub user profile.                   |
| `GET`  | `/api/repos`                        | x-api-key | Owned repos + 14-day views/clones + totals.       |
| `GET`  | `/api/repos/:owner/:repo/traffic`   | x-api-key | Per-repo views/clones series, top referrers, paths. |

All endpoints behind a 30 req/min rate limiter. Spec: [`openapi.yaml`](./packages/api-spec/openapi.yaml).

## Configuration

### API server

| Variable          | Required | Notes                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------- |
| `PORT`            | yes      | Port to bind the API server (`.env.example` defaults to 8080).        |
| `API_KEY`         | yes      | Shared secret for the `x-api-key` header. Use `openssl rand -hex 32`. |
| `GITHUB_TOKEN`    | yes      | PAT with `public_repo` (or `repo` for private + private traffic).     |
| `GITHUB_USERNAME` | yes      | GitHub login whose repositories to rank.                              |
| `LOG_LEVEL`       | no       | Pino level. Defaults to `info`.                                       |
| `NODE_ENV`        | no       | `production` disables pretty-printed logs.                            |

### Web

| Variable    | Required | Notes                                                |
| ----------- | -------- | ---------------------------------------------------- |
| `PORT`      | no       | Dev/preview port (defaults to 5173).                 |
| `BASE_PATH` | no       | Base path when served behind a sub-path (default `/`). |
| `API_URL`   | no       | Override proxy target (default `http://localhost:8080`). |

## Workspace layout

```
apps/
  api-server/    Express 5 + Pino API proxying the GitHub REST API.
  repo-rank/     Vite + React frontend (shadcn/ui + Tailwind v4 + TanStack Query).
packages/
  api-spec/          OpenAPI 3.1 contract — single source of truth.
  api-zod/           Generated Zod validators (server).
  api-client-react/  Generated React Query hooks (web).
  db/                Drizzle ORM schema — reserved for future persistence.
docs/            Demo media (gif + mp4).
```

## Codegen

After editing [`packages/api-spec/openapi.yaml`](./packages/api-spec/openapi.yaml):

```bash
pnpm --filter @repo-ranker/api-spec run codegen
```

Commit the regenerated files together with the spec change.

## Scripts

```bash
pnpm run typecheck       # tsc --build across all packages + apps
pnpm run build           # typecheck + per-package build
pnpm run format          # prettier --write .
pnpm run format:check    # prettier --check .
```

## Architecture notes

- **Cache lifetime is intentional.** Traffic TTL = 5 min, user TTL = 1 h. Restart drops everything; if you want persistence, the `packages/db` Drizzle scaffold is there.
- **GitHub traffic endpoints require `repo` scope** to read private-repo stats — `public_repo` only gets you public ones.
- **The frontend is dark-only.** Palette lives in [`apps/repo-rank/src/index.css`](./apps/repo-rank/src/index.css). Removing the `dark` class on `<body>` will give you visible-but-broken contrast — by design, no light theme yet.

---

## Contributing

This repo follows the [**FiveD Studio contribution guide**](https://github.com/fived-studio/.github/blob/main/CONTRIBUTING.md) and [Code of Conduct](https://github.com/fived-studio/.github/blob/main/CODE_OF_CONDUCT.md). For repo-specific notes (codegen, workspace layout) see the sections above.

Security issues: see [SECURITY.md](https://github.com/fived-studio/.github/blob/main/SECURITY.md) — please don't open a public issue.

## License

[MIT](./LICENSE) © [FiveD Studio](https://github.com/fived-studio)

<div align="center">
<sub>part of the <a href="https://fived-studio.github.io">FiveD Studio</a> stack — built with caffeine in Ho Chi Minh City</sub>
</div>
