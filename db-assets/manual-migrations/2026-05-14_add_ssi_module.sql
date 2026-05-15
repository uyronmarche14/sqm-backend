-- Manual migration: add SSI standalone module tables.
-- This uses dedicated SSI-owned tables with explicit JSON columns for complex
-- nested sections so the backend can own the modern contract without forcing
-- a large legacy-table redesign on day one.

IF OBJECT_ID('dbo.SSI_PLAN', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SSI_PLAN (
        ssi_plan_id NVARCHAR(36) NOT NULL,
        control_no NVARCHAR(100) NOT NULL,
        mfg_site_id NVARCHAR(36) NOT NULL,
        supplier_id NVARCHAR(36) NOT NULL,
        category_family NVARCHAR(40) NOT NULL,
        audit_type NVARCHAR(100) NULL,
        scheduled_date DATETIME NOT NULL,
        sqe_pic_id NVARCHAR(36) NOT NULL,
        remarks NVARCHAR(MAX) NULL,
        request_status NVARCHAR(40) NOT NULL,
        linked_record_id NVARCHAR(36) NULL,
        cancel_remarks NVARCHAR(MAX) NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_SSI_PLAN_created_date DEFAULT (GETDATE()),
        last_update DATETIME NOT NULL CONSTRAINT DF_SSI_PLAN_last_update DEFAULT (GETDATE()),
        updateby NVARCHAR(100) NOT NULL,
        CONSTRAINT PK_SSI_PLAN PRIMARY KEY CLUSTERED (ssi_plan_id ASC),
        CONSTRAINT UQ_SSI_PLAN_control_no UNIQUE NONCLUSTERED (control_no ASC)
    );
END
GO

IF OBJECT_ID('dbo.SSI_RECORD', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SSI_RECORD (
        ssi_record_id NVARCHAR(36) NOT NULL,
        ssi_plan_id NVARCHAR(36) NULL,
        control_no NVARCHAR(100) NOT NULL,
        request_status NVARCHAR(40) NOT NULL,
        mfg_site_id NVARCHAR(36) NOT NULL,
        supplier_id NVARCHAR(36) NOT NULL,
        category_family NVARCHAR(40) NOT NULL,
        audit_type NVARCHAR(100) NULL,
        sqe_pic_id NVARCHAR(36) NOT NULL,
        scheduled_date DATETIME NOT NULL,
        remarks NVARCHAR(MAX) NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_SSI_RECORD_created_date DEFAULT (GETDATE()),
        created_by NVARCHAR(36) NULL,
        issued_date DATETIME NULL,
        closed_date DATETIME NULL,
        overall_judgment NVARCHAR(20) NULL,
        overall_judgment_remarks NVARCHAR(MAX) NULL,
        inspector_registrations_json NVARCHAR(MAX) NULL,
        written_exam_json NVARCHAR(MAX) NULL,
        repeatability_study_json NVARCHAR(MAX) NULL,
        audit_artifacts_json NVARCHAR(MAX) NULL,
        certificate_json NVARCHAR(MAX) NULL,
        cc_list_json NVARCHAR(MAX) NULL,
        approvers_json NVARCHAR(MAX) NULL,
        notifications_json NVARCHAR(MAX) NULL,
        issuer_id NVARCHAR(36) NULL,
        checker_id NVARCHAR(36) NULL,
        approver_id NVARCHAR(36) NULL,
        issuer_remarks NVARCHAR(MAX) NULL,
        checker_remarks NVARCHAR(MAX) NULL,
        approver_remarks NVARCHAR(MAX) NULL,
        submit_date DATETIME NULL,
        checked_date DATETIME NULL,
        approved_date DATETIME NULL,
        rejected_date DATETIME NULL,
        last_update DATETIME NOT NULL CONSTRAINT DF_SSI_RECORD_last_update DEFAULT (GETDATE()),
        updateby NVARCHAR(100) NOT NULL,
        CONSTRAINT PK_SSI_RECORD PRIMARY KEY CLUSTERED (ssi_record_id ASC),
        CONSTRAINT UQ_SSI_RECORD_control_no UNIQUE NONCLUSTERED (control_no ASC)
    );
END
GO

IF OBJECT_ID('dbo.SSI_RESPONSE', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SSI_RESPONSE (
        ssi_response_id NVARCHAR(36) NOT NULL,
        ssi_record_id NVARCHAR(36) NOT NULL,
        response_status NVARCHAR(40) NOT NULL,
        payload_json NVARCHAR(MAX) NULL,
        review_remarks NVARCHAR(MAX) NULL,
        submitted_by NVARCHAR(36) NULL,
        checked_by NVARCHAR(36) NULL,
        approved_by NVARCHAR(36) NULL,
        submitted_at DATETIME NULL,
        checked_at DATETIME NULL,
        approved_at DATETIME NULL,
        rejected_at DATETIME NULL,
        last_update DATETIME NOT NULL CONSTRAINT DF_SSI_RESPONSE_last_update DEFAULT (GETDATE()),
        updateby NVARCHAR(100) NOT NULL,
        CONSTRAINT PK_SSI_RESPONSE PRIMARY KEY CLUSTERED (ssi_response_id ASC),
        CONSTRAINT UQ_SSI_RESPONSE_record UNIQUE NONCLUSTERED (ssi_record_id ASC),
        CONSTRAINT FK_SSI_RESPONSE_RECORD FOREIGN KEY (ssi_record_id) REFERENCES dbo.SSI_RECORD (ssi_record_id)
    );
END
GO

IF OBJECT_ID('dbo.SSI_WORKFLOW_EVENT', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SSI_WORKFLOW_EVENT (
        ssi_workflow_event_id NVARCHAR(36) NOT NULL,
        ssi_record_id NVARCHAR(36) NOT NULL,
        action_name NVARCHAR(50) NOT NULL,
        from_status NVARCHAR(40) NULL,
        to_status NVARCHAR(40) NOT NULL,
        actor_user_id NVARCHAR(36) NULL,
        remarks NVARCHAR(MAX) NULL,
        payload_json NVARCHAR(MAX) NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_SSI_WORKFLOW_EVENT_created_date DEFAULT (GETDATE()),
        CONSTRAINT PK_SSI_WORKFLOW_EVENT PRIMARY KEY CLUSTERED (ssi_workflow_event_id ASC),
        CONSTRAINT FK_SSI_WORKFLOW_EVENT_RECORD FOREIGN KEY (ssi_record_id) REFERENCES dbo.SSI_RECORD (ssi_record_id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_SSI_PLAN_status_date'
      AND object_id = OBJECT_ID('dbo.SSI_PLAN')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SSI_PLAN_status_date
        ON dbo.SSI_PLAN (request_status ASC, scheduled_date DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_SSI_RECORD_status_date'
      AND object_id = OBJECT_ID('dbo.SSI_RECORD')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SSI_RECORD_status_date
        ON dbo.SSI_RECORD (request_status ASC, scheduled_date DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_SSI_RECORD_plan_id'
      AND object_id = OBJECT_ID('dbo.SSI_RECORD')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SSI_RECORD_plan_id
        ON dbo.SSI_RECORD (ssi_plan_id ASC);
END
GO
