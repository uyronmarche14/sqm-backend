# PLAN-backend-modernization.md - Master Infrastructure Blueprint

## 1. Overview
This plan outlines the systematic modernization of the SQM Backend from a Javascript Layered Monolith to a **TypeScript-based Modular Monolith**. We maintain the **Express.js** engine but completely swap the infrastructure for a robust, typed, and secure core.

## 2. The "Lead Engineer" Tech Stack
| Component | Technology | Role |
| :--- | :--- | :--- |
| **Runtime** | Node.js 22+ | Modern ES Module support. |
| **Framework** | Express.js 5 | Robust, familiar, dynamic. |
| **Language** | TypeScript | Compile-time safety and "Lead Grade" code. |
| **DB Access** | **Kysely** | Fully typed Query Builder (The "Type-Type" way). |
| **Validation** | **Zod** | Runtime schema safety. |
| **Auth** | JWT (v4) | Access + Refresh token flow. |
| **Security** | Helmet + Bcrypt + Redis | Defense-in-depth security. |

---

## 3. Modular Architecture (DDD)
The system is divided into **Vertical Slices (Modules)**. Each module owns its schema, business logic, and routes.

### Standard Module Layout:
```text
modules/[module-name]/
├── [module].routes.ts     # Express entry points
├── [module].controller.ts # Request parsing & HTTP responses (HTTP ONLY)
├── [module].service.ts    # Pure business logic (Reusable & Clean)
├── [module].repository.ts # Database access using Kysely (Typed)
└── [module].schema.ts     # Zod validation & Type definitions
```

---

## 4. Security Infrastructure
- **JWT Middleware**: Centralized `auth.middleware.ts` handling:
    - Access Token (Short-lived 15m)
    - Refresh Token (Long-lived 7d) stored in Secure/HttpOnly Cookies.
- **Hashing**: `bcryptjs` for PII/Password data.
- **Global Protection**:
    - `Helmet`: Sets secure HTTP headers (XSS protection, Clickjacking).
    - `CORS`: Whitelisted domains only.
    - `Rate Limiting`: Redis-backed to prevent Brute Force.

---

## 5. Developer Experience: "The Clean Way"

### Reusable Boilerplate Method
Every module's `Repository` will inherit from a `BaseRepository` (using Kysely) for common CRUD operations like `findById`, `findAll`, etc.

### "Type-Type" Calling (Kysely)
No more strings. Everything is typed.
```typescript
const result = await db
  .selectFrom('TBL_MODULE')
  .selectAll()
  .where('ID', '=', id)
  .executeTakeFirst();
```

---

## 6. Detailed Implementation Phases

### Phase 1: Core Foundation (The Infrastructure Fix)
- Setup TypeScript & tsconfig.
- Implement `SmartMapper` and `Kysely` DB client.
- Implement Global Error Handler & Response Wrapper.
- Setup Redis and Rate Limiter.

### Phase 2: Auth Module Refresh
- Implement Secure Token Management (Access/Refresh).
- Implement Bcrypt middleware.
- Create `/auth/login`, `/auth/refresh`, `/auth/logout`.

### Phase 3: Module-by-Module Migration
1. **5M1E Module**: First candidate for the "Gold Standard" refactor.
2. **Users Module**: Modernizing IAM.
3. **Master Data Module**: Optimizing common data fetching.
4. **Other Modules** (MNR, SQPR, OGI-UP).

### Phase 4: Quality Gate & Performance
- Full Linting (`eslint`).
- Unit testing (`vitest`).
- Integration testing (`supertest`).

---

## 7. Verification Checklist
- [ ] No `any` types in core infrastructure.
- [ ] All endpoints validated by Zod.
- [ ] JWT tokens rotate correctly.
- [ ] SQL logs verified for efficiency.
