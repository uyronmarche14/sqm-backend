-- ============================================================================
-- Migration: Add dedicated evaluation columns to TBL_5M1E_Application
-- Date: 2026-03-04 (safe-guarded 2026-06-09)
-- Safe: Skips if TBL_5M1E_Application does not exist (fresh dev DB)
-- ============================================================================

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TBL_5M1E_Application')
BEGIN

    -- 1. Add new named columns (idempotent — safe to re-run)
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'TBL_5M1E_Application' AND COLUMN_NAME = 'RankID'
    )
    ALTER TABLE TBL_5M1E_Application ADD RankID NVARCHAR (100) NULL;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'TBL_5M1E_Application' AND COLUMN_NAME = 'ChangeQCProcess'
    )
    ALTER TABLE TBL_5M1E_Application ADD ChangeQCProcess BIT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'TBL_5M1E_Application' AND COLUMN_NAME = 'ChangeSupplierSpec'
    )
    ALTER TABLE TBL_5M1E_Application ADD ChangeSupplierSpec BIT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'TBL_5M1E_Application' AND COLUMN_NAME = 'ProcessAuditResult'
    )
    ALTER TABLE TBL_5M1E_Application ADD ProcessAuditResult NVARCHAR (50) NULL;

    -- 2. Migrate existing data from generic Attribute columns
    UPDATE TBL_5M1E_Application
    SET RankID = Attribute05
    WHERE Attribute05 IS NOT NULL AND Attribute05 != '' AND Attribute05 != '0';

    UPDATE TBL_5M1E_Application
    SET ChangeQCProcess = CASE WHEN Attribute08 = '1' THEN 1 ELSE 0 END
    WHERE Attribute08 IS NOT NULL;

    UPDATE TBL_5M1E_Application
    SET ChangeSupplierSpec = CASE WHEN Attribute09 = '1' THEN 1 ELSE 0 END
    WHERE Attribute09 IS NOT NULL;

    UPDATE TBL_5M1E_Application
    SET ProcessAuditResult = Attribute07
    WHERE Attribute07 IS NOT NULL AND Attribute07 != '' AND Attribute07 != '0';

END
