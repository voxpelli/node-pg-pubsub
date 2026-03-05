# CLAUDE.md

## Project Overview

pg-pubsub is a Publish/Subscribe implementation on top of PostgreSQL NOTIFY/LISTEN. It provides a Node.js EventEmitter-based API for subscribing to channels and publishing messages via PostgreSQL.

- **Type:** CommonJS library (no `"type": "module"` — uses `require`/`module.exports`)
- **Language:** JavaScript with JSDoc type annotations (no `.ts` source files)
- **Runtime:** Node.js >= 18.18.0
- **Database:** PostgreSQL >= 9.4
- **License:** MIT

---

## Repository Structure

```
index.js                   # Main entry point — PGPubsub class (extends EventEmitter)
lib/client.js              # PostgreSQL client wrapper with retry/reconnection logic
index.d.ts                 # Hand-written TypeScript declaration root (committed)
declaration.tsconfig.json  # Config for generating lib/*.d.ts from JSDoc
test/
  db-utils.js              # Database test utilities (loads credentials via dotenv)
  integration/
    main.spec.js           # Integration tests (requires a running PostgreSQL instance)
```

Auto-generated `.d.ts` files (`lib/*.d.ts`, `lib/*.d.ts.map`, `index.d.ts.map`) are **not committed** — they are produced at publish time by `prepublishOnly: npm run build`.

---

## Priority Rules

### MUST
- Keep changes minimal and consistent with existing style.
- Add or update tests when behaviour changes.
- Run `npm test` (or scoped checks) before finishing.
- Read relevant files locally before making changes.
- Use `pg-format` for any SQL string interpolation — never interpolate user input directly.

### SHOULD
- Prefer built-in Node.js APIs; avoid adding dependencies without discussion.
- Annotate all exported functions and types with JSDoc.
- Chain errors using `pony-cause` (`new VError({ cause }, message)`).
- Comment non-obvious implementation choices briefly.

### ASK FIRST
- Adding or replacing runtime dependencies.
- Changing the public API shape, exported names, or package entry points.
- Large refactors, file moves, or renames beyond the immediate task.
- Disabling checks, removing tests, or altering CI behaviour.

### NEVER
- Use ESM syntax (`import`/`export`) in runtime code — this is a CommonJS module.
- Commit auto-generated declaration files (`lib/*.d.ts`, `*.d.ts.map`).
- Claim validation was run without actually running it.
- Interpolate user-controlled strings into SQL without `pg-format`.

---

## Commands

```bash
npm test               # Full suite: lint + type checks + integration tests
npm run check          # Lint + type checks only (no tests)
npm run test:mocha     # Integration tests only (requires DATABASE_TEST_URL in .env)
npm run build          # Generate .d.ts declaration files
npm run clean          # Remove all generated declaration files
```

Individual checks:
```bash
npm run check:lint              # ESLint
npm run check:tsc               # TypeScript type checking
npm run check:type-coverage     # Enforce >= 98% type coverage
npm run check:dependency-check  # Verify declared runtime dependencies
npm run check:installed-check   # Verify installed package versions
```

---

## Code Style & Conventions

- **Module system:** CommonJS (`require`/`module.exports`) — no ESM
- **ESLint config:** `@voxpelli/eslint-config` (standard + security, unicorn, jsdoc plugins)
- **Indentation:** 2 spaces, LF line endings (see `.editorconfig`)
- **Semicolons:** Required (semistandard style)
- **Type annotations:** JSDoc comments; TypeScript checks `.js` files — no `.ts` source
- **Private fields:** `#` syntax for class private members
- **Error handling:** `pony-cause` for error chaining
- **Type coverage:** Minimum 98% strict, excluding test files
- **No lock files:** Library repo — `package-lock=false` in `.npmrc`

---

## Testing

- **Framework:** Mocha + Chai + chai-as-promised
- **Coverage:** c8 (LCOV + text reporters)
- **Tests are integration tests** requiring a live PostgreSQL database
- Copy `sample.env` to `.env` and set `DATABASE_TEST_URL`:

```
DATABASE_TEST_URL="postgres://postgres@localhost/pgpubsub_test"
DATABASE_TEST_URL_INVALID_USER="postgres://foobar:pass@localhost/pgpubsub_test"
DATABASE_TEST_URL_INVALID_PASSWORD="postgres://postgres:invalidpass@localhost/pgpubsub_test"
```

---

## CI/CD

GitHub Actions workflows:
- **nodejs.yml** — Tests across Node 18/20/22 and PostgreSQL 9.4/12/13
- **lint.yml** — ESLint
- **types.yml** — TypeScript type checking (TS 5.0 + next), scheduled Mon/Wed/Fri
- **codeql-analysis.yml** — Security scanning, scheduled weekly
- **dependency-review.yml** — Dependency review on pull requests

---

## Git Hooks

Husky runs `npm test` on pre-push.

---

## Anti-Patterns

- Don't use `import`/`export` — runtime code must stay CommonJS.
- Don't skip JSDoc type annotations on exported functions or types.
- Don't commit auto-generated `.d.ts` files (only `index.d.ts` is hand-written and committed).
- Don't add runtime dependencies without checking if a Node.js built-in covers the need.
- Don't use `any` types without strong justification.
- Don't interpolate values into SQL strings — always use `pg-format`.
- Don't skip tests for new or changed behaviour.
