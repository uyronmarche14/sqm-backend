-- Add SQPR supplier/attention columns (modern enhancement, not in legacy schema)
-- These columns are nullable to preserve backward compatibility with legacy data

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SQPR' AND COLUMN_NAME = 'supplier_id')
BEGIN
    ALTER TABLE [dbo].[SQPR] ADD [supplier_id] NVARCHAR(72) NULL;
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SQPR' AND COLUMN_NAME = 'attention_id')
BEGIN
    ALTER TABLE [dbo].[SQPR] ADD [attention_id] NVARCHAR(72) NULL;
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SQPR' AND COLUMN_NAME = 'attention')
BEGIN
    ALTER TABLE [dbo].[SQPR] ADD [attention] NVARCHAR(255) NULL;
END
