# SSI Module API

**Documentation status:** ✅ Active

## Overview

Supplier Self-Inspection module. Manages SSI plans, records, workflow lifecycle, supplier responses, reports, lookups, and certificate generation.

## Endpoints

All under `/api/ssi`. All require authentication.

### Plans

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/plans` | `SSI-05-12/15/16` viewlist | List all SSI plans |
| POST | `/plans` | `SSI-05-15` add | Create new plan |
| GET | `/plans/:id` | `SSI-05-12/15/16` view | Get single plan |
| PUT | `/plans/:id` | `SSI-05-15` edit | Update plan |
| DELETE | `/plans/:id` | `SSI-05-15` delete | Delete plan |
| POST | `/plans/:id/cancel` | `SSI-05-16` delete | Cancel plan |
| POST | `/plans/:id/records` | `SSI-05-01` add | Create record from plan |

### Records

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/records` | `SSI-05-01` through `SSI-05-14` viewlist | List records |
| POST | `/records` | `SSI-05-01` add | Create record |
| GET | `/records/:id` | `SSI-05-01` through `SSI-05-14` view | Get record |
| PUT | `/records/:id` | `SSI-05-01/02/04` edit | Update record |
| DELETE | `/records/:id` | `SSI-05-01/02/04` delete | Delete record |

### Workflow

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/workflow/:id/submit` | `SSI-05-01/02/04` submit | Submit for approval |
| POST | `/workflow/:id/check` | `SSI-05-03` check | Check/review |
| POST | `/workflow/:id/approve` | `SSI-05-03` approve | Approve |
| POST | `/workflow/:id/reject` | `SSI-05-03/09` reject | Reject |
| POST | `/workflow/:id/issue` | `SSI-05-06` issue | Issue to supplier |
| POST | `/workflow/:id/cancel` | `SSI-05-07` delete | Cancel record |
| POST | `/workflow/:id/resubmit` | `SSI-05-04` submit | Resubmit after rejection |

### Responses

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/responses/:id/save` | `SSI-05-05/08/10` edit | Save response draft |
| POST | `/responses/:id/submit` | `SSI-05-05/08/10` submit | Submit response |
| POST | `/responses/:id/review` | `SSI-05-09` approve | Review/approve response |

### Reports

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/reports/calendar` | `SSI-05-12` viewlist | Calendar data |
| GET | `/reports/search` | `SSI-05-14` viewlist | Search records |
| GET | `/reports/achievement` | `SSI-05-13` viewlist | Achievement data |
| GET | `/reports` | `SSI-05-12` viewlist | Reports index |

### Lookups

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/lookups` | `SSI-05-01/03/12/15` view | SSI-specific lookup data |

### Artifacts

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/artifacts/:id` | `SSI-05-05/06` edit | Generate certificate |

## Workflow

```
Plan → Record → Submit → Check → Approve → Issue → Response → Review → Close
                     ↘ Reject ↙            ↘ Reject ↙
```

## SSI-Specific Features

- **Category branching**: Qualification, Requalification, Certification, Recertification, Audit
- **Inspector Registration**: Written exam, attribute R&R trials (3), scoring
- **Certificate generation**: Inspector + company certificates with templates
- **Control numbers**: PLN-* (plan), DRF-* (draft), SSI-* (finalized)
