-- ============================================================================
-- Migration: Add corrected_lot_verification counter to NPI_LOTS
-- Date: 2026-03-20
-- Safe: Idempotent, backfills existing rows to 0
-- ============================================================================

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
        TABLE_NAME = 'NPI_LOTS'
        AND COLUMN_NAME = 'corrected_lot_verification'
)
ALTER TABLE NPI_LOTS
ADD corrected_lot_verification INT NOT NULL CONSTRAINT DF_NPI_LOTS_corrected_lot_verification DEFAULT 0;

GO

UPDATE NPI_LOTS
SET corrected_lot_verification = 0
WHERE corrected_lot_verification IS NULL;
