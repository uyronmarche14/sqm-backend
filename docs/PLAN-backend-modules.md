# PLAN: Backend Modules Migration

## 1. Goal
Migrate all legacy Express/MSSQL/JavaScript modules to the new Phase 2/3 Typed Architecture (Kysely + Zod + Modular Monolith), establishing a unified, type-safe, and robust backend.

## 2. The "Golden Sample" Strategy
We will migrate modules one by one following a strict Vertical Slice architecture, starting with **5M1E** as the "Golden Sample". Once 5M1E is fully migrated and verified, its structure will serve as the exact blueprint for the remaining core modules.

### Target Architecture per Module (`src/modules/<module_name>`)
For every legacy file (e.g., `fiveM1E.controller.js`), we will generate a clean folder structure:
- `<module_name>.schema.ts`: Zod Definitions (Input Validation)
- `<module_name>.repository.ts`: Kysely DB interactions (extending `BaseRepository`)
- `<module_name>.service.ts`: Business Logic & Workflow State Machine Hookups
- `<module_name>.controller.ts`: Web Layer, HTTP statuses & standard responses
- `<module_name>.routes.ts`: Express Routes wrapping endpoints with `requireAuth` and `validate(schema)`

## 3. Migration Roadmap

### Phase A: The 5M1E Golden Sample (P0)
1. **Repository Generation**: Convert raw SQL inside `fiveM1E.repository.js` / `queries` to type-safe Kysely queries in `fiveM1E.repository.ts`.
2. **Mapper Engine**: Integrate `SmartMapper` to map `TBL_5M1E_Application` rows directly to Frontend DTOs seamlessly.
3. **Service Logic**: Migrate `fiveM1E.service.js` to TypeScript `Service` classes, divorcing SQL logic completely from business validation.
4. **Controllers & Routing**: Migrate `fiveM1E.controller.js`, apply Zod schemas, and plug it into `app.ts`.

### Phase B: Core Workflow Modules (P1)
1. **MNR**: Refactor `mnr.controller.js` and raw SQL into `src/modules/mnr`.
2. **NPI**: Refactor `npi.controller.js` and `npi.repository.js` into `src/modules/npi`.
3. **OGI**: Refactor `ogi.controller.js` into `src/modules/ogi`.

### Phase C: Quality & Auxiliary Modules (P2)
1. **QMQA**: Refactor heavily raw-SQL dependent `qmqa.repository.js` into `src/modules/qmqa`. Ensure RBAC is maintained.
2. **SQPR / SQMP**: Migrate `sqpr` and `sqmp` into their respective module folders.

### Phase D: Master Data & User Management (P3)
1. **Master Data**: Extract `masterData.controller.js` into a globally accessible `src/modules/master-data` layer.
2. **User Management**: Migrate `user.controller.js` logic into the existing `src/modules/auth` (or a dedicated `users` module) supporting strict ABAC lookups.

## 4. Agent Orchestration Pipeline
As mandated by the `@/orchestrate` instruction, the execution of this plan will utilize:
- `backend-specialist`: Converting JS Controllers and Services to TypeScript.
- `database-architect`: Translating raw `mssql` queries to Kysely Builders and adapting the `SmartMapper`.
- `security-auditor`: Verifying that endpoints previously loosely secured are now explicitly wrapped in `requireAuth` and Zod schema validations.
- `debugger` (if required): To resolve any typing or SQL mapping mismatches during transaction rewrites.

## 5. Exit Criteria / Definition of Done
- No `.js` files remain in legacy `src/controllers`, `src/repositories`, or `src/services`.
- All legacy folders are safely deleted.
- Every route is protected by `requireAuth` and `validate` middleware.
- Zero raw `sql.query` executions exist.
