# Manual-Only Migrations

These scripts were historically used before the safe migration runner existed.

## Status

| File | Status | Reason |
|------|--------|--------|
| `2026-05-14_add_ssi_module.sql` | **ABSORBED** — moved to `src/db/migrations/migration_add_ssi_module.sql` and added to the safe migration runner. The SSI migration is detected if already applied manually and auto-registered without re-execution. |
| `2026-05-13_add_spc_workflow.sql` | **DEPRECATED** — identical to `src/db/migrations/migration_add_spc_workflow.sql` already in the safe runner |
| `migration_sync_form_registry_routes.sql` | **DEPRECATED** — historical form-URL patch. FORMS are now seeded from the permissions-contract `PAGE_REGISTRY`. |
| `migration_fix_5m1e_form_routes.sql` | **DEPRECATED** — same as above, 5M1E-specific route fix |
| `migration_add_sqmp_forms.sql` | **DEPRECATED** — historical FORMS insert. FORMS are now seeded via `db:seed:forms`. |
| `migration_add_sqpr_forms.sql` | **DEPRECATED** — same as above, SQPR-specific |
| `migration_add_5m1e_forms.sql` | **DEPRECATED** — empty file, no content |

## No longer needed

The modern seed system (`db:seed:forms`) and safe migration runner (`db:migrate:safe`) handle all current migration and form seeding needs. Do not run files in this directory unless explicitly instructed during legacy troubleshooting.
