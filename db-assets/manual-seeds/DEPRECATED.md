# Deprecated Manual Seeds

The files in this directory are **deprecated**.

They were used during early development to seed reference and admin data directly
via raw SQL and standalone Node.js scripts. The modern TypeScript seed system in
`sqm-backend/src/db/seeds/` now provides:

- `admin.seed.ts` — admin user bootstrap
- `forms.seed.ts` — FORMS table from permissions-contract PAGE_REGISTRY
- `role-access.seed.ts` — ROLE_ACCESS grants for super-admin
- `reference.seed.ts` — master reference data

Run all seeds in sequence:

```bash
DB_ADMIN_SEED=YES DB_FORMS_SEED=YES DB_ROLE_ACCESS_SEED=YES DB_REFERENCE_SEED=YES \
  DB_ALLOW_NONLOCAL_BOOTSTRAP=YES pnpm run db:seed:all
```

Do not run files in this directory unless explicitly instructed during legacy
migration or troubleshooting. They use incompatible ID schemes (integer IDs vs
semantic IDs) and will cause FK corruption if mixed with the modern seeds.
