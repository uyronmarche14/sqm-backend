# PLAN: Backend Structure Cleanup & Hardening

> **Branch**: `update/structure-v3`  
> **Based on**: Backend Audit Report (2026-02-27)  
> **Goal**: Remove dead legacy JS code, fix configuration issues, harden auth, and align test infrastructure.

---

## 1. Problem Statement

The backend modernization from JS monolith → TS modular architecture (Phase 1–3 from `PLAN-backend-modernization.md`) is **functionally complete**. However, the old JS files were never removed, configuration has gaps, and several auth features remain incomplete. This plan addresses these cleanup items on the new `update/structure-v3` branch.

---

## 2. Scope & Phases

### Phase 1: Legacy Code Archive (Low Risk, High Impact)

**Objective**: Move all legacy `.js` files out of `src/` into a `.legacy/` archive folder so they remain available as reference without cluttering the active codebase, IDE indexing, or build/lint pipelines.

#### Archive Strategy

1. **Create** `.legacy/` at project root with mirrored subdirectories
2. **Move** (not delete) all legacy JS files, preserving folder structure
3. **Add** `.legacy/` to `.gitignore` so it doesn't bloat the repo
4. **Keep** the files locally for reference — developers who need them can find them in `.legacy/`

#### Archive Structure
```
.legacy/                          # Gitignored, local-only reference
├── controllers/
│   ├── auth.controller.js
│   ├── mnr.controller.js
│   ├── npi.controller.js
│   ├── ogi.controller.js
│   ├── qmqa.controller.js
│   ├── sqmp.controller.js
│   ├── sqpr.controller.js
│   └── *.backup
├── services/
│   ├── npi.service.js
│   ├── qmqa.service.js
│   ├── qmqa-email.service.js
│   ├── qmqa-token.service.js
│   ├── qmqa-workflow.service.js
│   ├── sqmp.service.js
│   ├── sqpr.service.js
│   └── test-qmqa-*.js
├── repositories/
│   ├── base.repository.js
│   ├── npi.repository.js
│   ├── qmqa.repository.js
│   ├── sqmp.repository.js
│   ├── sqpr.repository.js
│   └── queries/*.js
├── routes/
│   └── *.routes.js
├── middleware/
│   └── *.middleware.js / *.js
├── utils/
│   ├── logger.js
│   ├── npi.mapper.js
│   └── qmqa/*.js
└── config/
    └── db.js
```

**Also archive**: `correlation-id.usage.md` (documentation for the old JS middleware)

**Evaluate**: `src/routes/qmqa.routes.ts` — if `app.ts` imports from `src/modules/qmqa/qmqa.routes.ts` instead, this one should also be archived.

#### Pre-archive Verification
- Run `grep -r "from.*'\./controllers" src/` to confirm zero imports from old controllers
- Run `grep -r "from.*'\./services" src/` to confirm zero imports from old services
- Run `grep -r "from.*'\./repositories" src/` to confirm zero imports from old repos
- Run `grep -r "from.*'\./routes" src/` to confirm zero imports from old routes
- Run `grep -r "from.*'\./middleware" src/` — confirm modules import from `../../shared/middleware/` only
- Run `grep -r "from.*'\./config" src/` to confirm no imports from old config

---

### Phase 2: Configuration Hardening

#### 2a. `.env` Fixes

| Fix | Before | After |
|-----|--------|-------|
| `DB_NAME` | `master` | Keep as-is (it may be intentional for dev) but add `DB_NAME` comment |
| `JWT_REFRESH_SECRET` → `REFRESH_SECRET` | `.env` key: `JWT_REFRESH_SECRET` / Code reads: `REFRESH_SECRET` | Align code (`jwt.ts`) to read `JWT_REFRESH_SECRET` to match `.env` |

#### 2b. Create `.env.example`
Copy `.env` with placeholder values (no secrets) for onboarding.

#### 2c. Vitest Config Fix
Current `vitest.config.ts` has `include: ['tests/**/*.test.ts']` but tests live in `src/__tests__/`. Fix to include both:
```typescript
include: ['tests/**/*.test.ts', 'src/__tests__/**/*.test.ts']
```

---

### Phase 3: Auth Module Completion

#### 3a. Fix `REFRESH_SECRET` env key alignment
In `src/shared/utils/jwt.ts`, change:
```diff
-const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-secret-refresh-key';
+const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key';
```

#### 3b. Uncomment refresh token route
In `src/modules/auth/auth.routes.ts`, enable the refresh route:
```diff
-// router.post('/refresh', requireAuth, authController.refresh);
+router.post('/refresh', authController.refresh);
```

#### 3c. Implement refresh controller method
Add `refresh` method in `auth.controller.ts` that:
1. Reads `refreshToken` from cookie
2. Verifies via `verifyRefreshToken`
3. Issues new `accessToken`
4. Returns the new access token

#### 3d. Add refresh service method
Add `refreshTokens` method in `auth.service.ts`.

---

### Phase 4: Minor Code Quality Fixes

| Fix | File | Detail |
|-----|------|--------|
| Fix `any` in `ValidationError` | `src/shared/errors/AppError.ts` | Change `errors: any[]` → `errors: Array<{ path: string; message: string }>` |
| Fix `any` in `BaseRepository` | `src/shared/infrastructure/BaseRepository.ts` | Replace `id: any` with proper generics or `string \| number` |
| Remove `@ts-ignore` | `BaseRepository.ts` | Refactor using Kysely's `ExpressionOrFactory` pattern |
| Fix 5M1E control number | `src/modules/fiveM1E/fiveM1E.service.ts` | Replace `process.hrtime()[1]` with `uuidv4()` |

---

### Phase 5: Cleanup Documentation

- Delete root-level `QMQA_*.md` files (18 legacy debug/fix documentation files)
- Keep `docs/` folder plans as project history
- Update `serveDB.md` if it references deleted JS files

---

## 3. What's OUT of Scope

These are important but belong in separate branches/tickets:
- ❌ Adding pagination to list endpoints
- ❌ Populating `userMenu` / `accessibleForms` from DB (requires frontend coordination)
- ❌ Express 5 stable upgrade (waiting for GA)
- ❌ Adding request logging middleware (Winston integration)
- ❌ Expanding test coverage beyond config fix

---

## 4. Verification Plan

### Automated Checks

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript compilation | `npx tsc --noEmit` | Zero errors |
| Grep for dead imports | `grep -rn "from.*'\./(controllers\|services\|repositories\|config)/" src/` | Zero matches |
| Test suite | `npx vitest run` | All existing tests pass |
| Lint check | `npx eslint src/**/*.ts 2>&1 \| head -50` | No new errors |

### Manual Verification
1. Start the dev server: `npm run dev`
2. Hit `/health` endpoint — should return `200 OK` with DB status
3. Test login via `POST /api/auth/login` — should return tokens
4. Confirm refresh route responds (after Phase 3)

---

## 5. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Accidental deletion of used JS file | Low | Pre-delete grep verification |
| `.env` change breaks local dev | Low | `.env.example` provides reference |
| Refresh token adds auth surface | Medium | HttpOnly cookie + proper verification |

---

## 6. Execution Order

```
Phase 1 (Legacy Code Archive)
  └── grep verification → create .legacy/ → move files → add to .gitignore → tsc --noEmit → commit

Phase 2 (Config Hardening)
  └── fix .env alignment → create .env.example → fix vitest config → commit

Phase 3 (Auth Completion)
  └── fix jwt.ts → add refresh route/controller/service → commit

Phase 4 (Code Quality)
  └── fix any types → fix control number → commit

Phase 5 (Doc Cleanup)
  └── delete QMQA_*.md files → commit
```

Each phase is **one atomic commit** on `update/structure-v3`.
