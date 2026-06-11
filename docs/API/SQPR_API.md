# SQPR Module API

**Documentation status:** ✅ Active

## Overview

Supplier Quality Performance Review. Manages SQPR records with CRUD, workflow lifecycle, batch delete, and attachments.

## Endpoints

All under `/api/sqpr`. All require authentication.

### CRUD

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/` | `SQPR` viewlist | List records |
| POST | `/` | `SQPR-03-01` add | Create record |
| GET | `/:id` | `SQPR` view | Get single record |
| PUT | `/:id` | `SQPR-03-01` edit | Update record |
| DELETE | `/:id` | `SQPR-03-01` delete | Delete record |
| POST | `/batch-delete` | `SQPR-03-01` delete | Batch delete multiple records |

### Workflow

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/:id/submit` | `SQPR-03-01` submit | Submit for approval |
| POST | `/:id/check` | `SQPR-03-02` check | Check/review |
| POST | `/:id/approve` | `SQPR-03-02` approve | Approve |
| POST | `/:id/reject` | `SQPR-03-02` reject | Reject |
| POST | `/:id/issue` | `SQPR-03-04` issue | Issue to supplier |

### Attachments

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/download/:attachmentId` | `SQPR` view | Download attachment |
| GET | `/attachments/:attachmentId` | `SQPR` view | Get attachment metadata |

### Legacy Compatibility

The following `SFR-05-xx` form codes are backward-compatible aliases for SQPR routes:

| SFR Code | SQPR Equivalent |
|---|---|
| `SFR-05-01` → `SQPR-03-01` (create) |
| `SFR-05-02` → `SQPR-03-01` (draft) |
| `SFR-05-03` → `SQPR-03-02` (approval) |
| `SFR-05-04` → `SQPR-03-04` (tracking) |
| `SFR-05-05` → (rejected) |

## Workflow

```
Draft → Submit → Check → Approve → Issue
                  ↘ Reject ↙
```
