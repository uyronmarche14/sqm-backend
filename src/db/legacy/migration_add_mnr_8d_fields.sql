-- ============================================================================
-- Legacy Restore Patch: Add 8D issuance fields required by current MNR module
-- Safe: Idempotent, additive-only
-- ============================================================================

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
        TABLE_NAME = 'MNR_LOTS'
        AND COLUMN_NAME = 'report_issuance_8d'
)
ALTER TABLE MNR_LOTS
ADD report_issuance_8d BIT NOT NULL CONSTRAINT DF_MNR_LOTS_report_issuance_8d DEFAULT 0;

GO

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
        TABLE_NAME = 'MNR_LOTS'
        AND COLUMN_NAME = 'recurrence_ref'
)
ALTER TABLE MNR_LOTS
ADD recurrence_ref NVARCHAR(100) NULL;

GO

UPDATE MNR_LOTS
SET report_issuance_8d = 0
WHERE report_issuance_8d IS NULL;
