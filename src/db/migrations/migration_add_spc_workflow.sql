-- Manual migration: add SPC_WORKFLOW for modern SPC Trend workflow persistence.
-- This stays manual because it extends a legacy module and should be reviewed
-- against the live SQL Server catalog before execution.

IF OBJECT_ID('dbo.SPC_WORKFLOW', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SPC_WORKFLOW (
        spc_workflow_id NVARCHAR(36) NOT NULL,
        spc_id NVARCHAR(36) NOT NULL,
        supplier_incharge_id NVARCHAR(36) NULL,
        issuer_id NVARCHAR(36) NULL,
        checker_id NVARCHAR(36) NULL,
        approver_id NVARCHAR(36) NULL,
        issuer_remarks NVARCHAR(500) NULL,
        checker_remarks NVARCHAR(500) NULL,
        approver_remarks NVARCHAR(500) NULL,
        checked_at DATETIME NULL,
        approved_at DATETIME NULL,
        rejected_at DATETIME NULL,
        issued_at DATETIME NULL,
        last_action_by NVARCHAR(36) NULL,
        last_update DATETIME NOT NULL CONSTRAINT DF_SPC_WORKFLOW_last_update DEFAULT (GETDATE()),
        updateby NVARCHAR(100) NOT NULL,
        CONSTRAINT PK_SPC_WORKFLOW PRIMARY KEY CLUSTERED (spc_workflow_id ASC),
        CONSTRAINT UQ_SPC_WORKFLOW_spc_id UNIQUE NONCLUSTERED (spc_id ASC),
        CONSTRAINT FK_SPC_WORKFLOW_SPC FOREIGN KEY (spc_id) REFERENCES dbo.SPC (spc_id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_SPC_WORKFLOW_spc_id'
      AND object_id = OBJECT_ID('dbo.SPC_WORKFLOW')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SPC_WORKFLOW_spc_id
        ON dbo.SPC_WORKFLOW (spc_id ASC);
END
GO

IF OBJECT_ID('dbo.SPC_WORKFLOW', 'U') IS NOT NULL
    AND COL_LENGTH('dbo.SPC_WORKFLOW', 'supplier_incharge_id') IS NULL
BEGIN
    ALTER TABLE dbo.SPC_WORKFLOW
        ADD supplier_incharge_id NVARCHAR(36) NULL;
END
GO
