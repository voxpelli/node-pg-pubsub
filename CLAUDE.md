# CLAUDE.md

## Project Overview

pg-pubsub is a Publish/Subscribe implementation on top of PostgreSQL NOTIFY/LISTEN. It provides a Node.js EventEmitter-based API for subscribing to channels and publishing messages via PostgreSQL.

- **Language:** JavaScript (no TypeScript source files — pure JS with JSDoc type annotations)
- **Runtime:** Node.js >= 16.0.0
- **Database:** PostgreSQL >= 9.4
- **License:** MIT

## Repository Structure

```
index.js          # Main entry point — PGPubsub class (extends EventEmitter)
lib/client.js     # PostgreSQL client wrapper with retry/reconnection logic
test/
  db-utils.js     # Database test utilities (uses dotenv for credentials)
  integration/
    main.spec.js  # Integration tests (requires a running PostgreSQL instance)
```

## Commands

### Full test suite (lint + type check + tests)
```
npm test
```

### Individual checks
```
npm run check:lint          # ESLint
npm run check:tsc           # TypeScript type checking
npm run check:type-coverage # Enforce >= 98% type coverage
npm run check:dependency-check
npm run check:installed-check
```

### Run only integration tests
```
npm run test:mocha
```
Requires a PostgreSQL connection string in a `.env` file (see `sample.env`).

### Build (generate TypeScript declarations)
```
npm run build
```

## Code Style & Conventions

- **ESLint config:** `@voxpelli/eslint-config` (extends standard with security, unicorn, jsdoc plugins)
- **Indentation:** 2 spaces, LF line endings (see `.editorconfig`)
- **Semicolons:** Semistandard style (semicolons required)
- **Type annotations:** JSDoc comments with TypeScript checking — no `.ts` source files
- **Private fields:** Uses `#` syntax for class private members
- **Error handling:** Uses `pony-cause` for error chaining
- **Type coverage:** Minimum 98% strict coverage enforced (excluding test files)
- **No lock files:** This is a library — `package-lock=false` in `.npmrc`

## Testing

- **Framework:** Mocha
- **Assertions:** Chai + chai-as-promised
- **Coverage:** c8 (LCOV + text reporters)
- **Tests are integration tests** that require a live PostgreSQL database
- Set `DATABASE_URL` in a `.env` file (copy from `sample.env`)

## CI/CD

GitHub Actions workflows:
- **nodejs.yml** — Tests across Node 16/18/20 and PostgreSQL 9.4/12/13
- **lint.yml** — Linting
- **types.yml** — TypeScript type checking (TS 5.0 + next)
- **codeql-analysis.yml** — Security scanning

## Git Hooks

Husky runs `npm test` on pre-push.
