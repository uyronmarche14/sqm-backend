-- Down migration: remove corrected_lot_verification from NPI_LOTS

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'NPI_LOTS' AND COLUMN_NAME = 'corrected_lot_verification'
)
BEGIN
    ALTER TABLE NPI_LOTS DROP CONSTRAINT DF_NPI_LOTS_corrected_lot_verification;
    ALTER TABLE NPI_LOTS DROP COLUMN corrected_lot_verification;
END
