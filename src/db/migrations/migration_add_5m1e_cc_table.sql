-- ============================================================================
-- Migration: Add CC Notification table for 5M1E module
-- Date: 2026-03-04
-- Safe: New table only, no existing data affected
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TBL_5M1E_CC')
BEGIN
  CREATE TABLE [dbo].[TBL_5M1E_CC] (
    [ID] NVARCHAR(72) NOT NULL PRIMARY KEY,
    [ControlNo] VARCHAR(50) NOT NULL,
    [UserID] NVARCHAR(72) NOT NULL,
    [UpdateBy] NVARCHAR(72) NULL,
    [LastUpdate] DATETIME NULL DEFAULT GETDATE()
  );

END