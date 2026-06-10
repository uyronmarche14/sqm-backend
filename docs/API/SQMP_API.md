# SQM Plan (SQMP) Module API

**Documentation status:** ✅ Active

## Overview

Supplier Quality Management Plan. Dual-cycle workflow: main plan approval followed by supplier response and closure. Gold-standard module reference implementation.

## Endpoints

### Main Plan (prefix: `/api/sqmp`)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/` | `SQM_PLAN` viewlist | List all plans |
| GET | `/control-no-preview` | `SQM_PLAN` view | Preview next control number |
| GET | `/:id` | `SQM_PLAN` view | Get single plan |
| POST | `/` | `SQMP-09-01` add | Create new plan |
| PUT | `/:id` | `SQMP-09-01` edit | Update plan |
| DELETE | `/:id` | `SQMP-09-01` delete | Delete plan |
| POST | `/:id/submit-main` | `SQMP-09-01` submit | Submit for approval |
| POST | `/:id/check-main` | `SQMP-09-03` check | Check/review |
| POST | `/:id/approve-main` | `SQMP-09-03` approve | Approve |
| POST | `/:id/reject-main` | `SQMP-09-03` reject | Reject |
| POST | `/:id/issue-main` | `SQMP-09-05` issue | Issue to supplier |
| POST | `/:id/cancel-main` | `SQMP-09-10` delete | Cancel plan |
| POST | `/:id/request-response` | `SQMP-09-05` issue | Request supplier response |
| POST | `/:id/close` | `SQMP-09-09` edit | Close plan |

### Response Cycle (prefix: `/api/sqmp/response`)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/:id/save-response` | `SQMP-09-06` edit | Save supplier response draft |
| POST | `/:id/submit-response` | `SQMP-09-06` submit | Submit supplier response |
| POST | `/:id/save-closure` | `SQMP-09-07` edit | Save closure draft |
| POST | `/:id/submit-closure` | `SQMP-09-07` submit | Submit closure |
| POST | `/:id/check-closure` | `SQMP-09-07` check | Check closure |
| POST | `/:id/approve-closure` | `SQMP-09-07` approve | Approve closure |
| POST | `/:id/reject-closure` | `SQMP-09-07` reject | Reject closure |
| POST | `/:id/accept-closure` | `SQMP-09-07` edit | Accept closure |
| POST | `/:id/not-accept-closure` | `SQMP-09-07` reject | Not accept closure |

### Attachments

| Method | Path | Permission |
|---|---|---|
| GET | `/download/:attachmentId` | `SQM_PLAN` view |

## Workflow

### Main Cycle
```
Draft → Submit → Check → Approve → Issue → Request Response → Close
                  ↘ Reject ↙
```

### Response Cycle
```
Issued → Save Response → Submit Response → Check Closure → Approve Closure → Accepted
                                                              ↘ Reject ↙
```

## Permissions

| Form Code | Stage | Actions |
|---|---|---|
| `SQMP-09-01` | DRAFT | add, edit, delete, submit |
| `SQMP-09-02` | DRAFT | (draft-only) |
| `SQMP-09-03` | APPROVAL | check, approve, reject |
| `SQMP-09-05` | APPROVED | issue |
| `SQMP-09-06` | ISSUED | edit, submit (supplier) |
| `SQMP-09-07` | RESPONSE | submit, check, approve, reject, accept |
| `SQMP-09-09` | CLOSE | edit |
| `SQMP-09-10` | CANCEL | delete |
