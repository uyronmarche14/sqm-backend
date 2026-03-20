# Legacy Control Number Matrix

This document captures the legacy-visible control number rules that the modern backend now reproduces.

## Record IDs vs control numbers

- Internal record IDs remain GUID-based primary identifiers.
- `control_no` remains the business-facing number shown to users.

## Module rules

- `SQMP`
  - Manual format.
  - Format: `SQMP-{fiscalYear}-{siteCode}-{series}-{semester}`.
  - Modern assumption: `series` is supplied explicitly when available, otherwise the current `revision` field is used as the backend-authoritative series value.

- `SFR`
  - Manual format.
  - Format: `SFR-{fiscalYear}-{frequency}-{supplierCode}-{series}`.
  - No active modern SFR module exists yet, but the shared control-number service exposes the legacy preview rule.

- `MNR`
  - Draft on create: `DRF-{YYYY}-{MM}-{seq}-{site}`.
  - Final on submit: `{defectCategoryAcronym}-{YYYY}-{MM}-{seq}-{site}`.
  - Sequence is legacy-style numeric text with no zero-padding.

- `NPI`
  - Draft on create: `DRF-{YYYY}-{MM}-{seq}-{site}`.
  - Final on submit: `IQC-{YYYY}-{MM}-{seq}-{site}`.
  - Sequence is legacy-style numeric text with no zero-padding.

- `OGI`
  - Draft on create: `DRF-{YYYY}-{MM}-{seq}-{site}`.
  - Final on submit: `OGI-{YYYY}-{MM}-{seq}-{site}`.
  - Sequence is legacy-style numeric text with no zero-padding.

- `QMQA Audit Plan`
  - Generated from audit-plan metadata.
  - Format: `{auditCategoryCode}-{YYYY}-{MM}-{seq}-{site}`.
  - Uses `audit_plan_date` for the year and month.

- `QMQA`
  - Does not generate a separate business number.
  - The displayed control number is inherited from the linked audit plan.

- `SQPR`
  - Draft on create: `DRF-{fiscalYear}-{monthOrSemester}-{site}`.
  - Final on submit: replace `DRF` with `SQPR`.

- `SQPR-LAR`
  - Draft on create: `DRF-{fiscalYear}-{monthOrSemester}-{site}`.
  - Final on submit: replace `DRF` with `LAR`.

- `5M1E`
  - Temporary on create: `TMP_{yyyy}{m}{d}-{h}-{m}-{s}-{ms}`.
  - Final when first assigned into the MPD flow: `{site}-{partType}-{product}-{00001}`.
  - Final sequence is zero-padded to five digits.

## Source notes

- Legacy manual SQMP preview came from `SQM_New/SQM/Common/ucSqmpControlNo.ascx.vb`.
- Legacy manual SFR preview came from `SQM_New/SQM/Common/ucSfrControlNo.ascx.vb`.
- Legacy SQL-generated module behavior came from `database/script 1.sql`.
- Legacy 5M1E temporary and final reassignment behavior came from the `5M1E_CLONE` WebForms implementation.
