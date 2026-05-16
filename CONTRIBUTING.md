# Contributing to Repo Ranker

Thanks for your interest! This guide covers the basics of working in this repo.

## Prerequisites

- Node.js 24+
- pnpm 9+

## Getting started

```bash
git clone <repo-url>
cd repo-ranker
pnpm install
```

Copy or export the environment variables documented in [README.md](./README.md), then start the apps:

```bash
pnpm --filter @repo-ranker/api-server run dev   # API on $PORT
pnpm --filter @repo-ranker/repo-rank   run dev  # Web on $PORT (default 5173)
```

## Project structure

```
apps/        Runnable applications (web + api).
packages/    Shared libraries (OpenAPI spec, generated schemas/clients, DB schema).
```

Each app and package is its own pnpm workspace and has its own `package.json`. Run scripts with `pnpm --filter <name> run <script>` or, for the whole workspace, `pnpm -r run <script>`.

## Making changes

1. Create a branch from `main`.
2. Make focused commits with a clear message.
3. Before pushing, run:
   ```bash
   pnpm run typecheck
   pnpm run build
   ```
4. Open a pull request describing the change and how to verify it.

## Coding conventions

- TypeScript, strict mode. Avoid `any`; prefer `unknown` + narrowing.
- Files use 2-space indentation, double quotes, trailing commas (see `.editorconfig` and `prettier`).
- API contracts live in `packages/api-spec/openapi.yaml`. After editing the spec, regenerate the client and Zod schemas:
  ```bash
  pnpm --filter @repo-ranker/api-spec run codegen
  ```
  Commit the regenerated files together with the spec change.

## Reporting bugs

Open a GitHub issue with:
- What you expected to happen.
- What actually happened.
- Steps to reproduce, including the environment (Node version, OS).

## Security

If you find a security issue, please **do not** open a public issue. Email the maintainer instead.

## License

By contributing you agree your contributions are licensed under the [MIT License](./LICENSE).
