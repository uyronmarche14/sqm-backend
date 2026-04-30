-- Generated SQL for Module: QMQA

IF OBJECT_ID('[dbo].[QMQA]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA];
CREATE TABLE [dbo].[QMQA] (
    [qmqa_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_audit_plan_id] nvarchar(72) NOT NULL,
    [created_date] datetime NOT NULL,
    [audit_type_id] nvarchar(72) NOT NULL,
    [attention_id] nvarchar(72) NULL,
    [pic_auditor_id] nvarchar(72) NULL,
    [due_date] datetime NULL,
    [audit_date] date NOT NULL,
    [issued_date] datetime NULL,
    [audit_rating] decimal NULL,
    [auditees] nvarchar(4000) NULL,
    [auditors] nvarchar(4000) NULL,
    [attendees] nvarchar(4000) NULL,
    [remarks] nvarchar(2000) NULL,
    [encoder_id] nvarchar(72) NOT NULL,
    [encoder_date] datetime NOT NULL,
    [issuer_id] nvarchar(72) NOT NULL,
    [issuer_remarks] nvarchar(2000) NULL,
    [issuer_date] datetime NULL,
    [checker_id] nvarchar(72) NULL,
    [checker_remarks] nvarchar(2000) NULL,
    [checker_date] datetime NULL,
    [approver_id] nvarchar(72) NULL,
    [approver_remarks] nvarchar(2000) NULL,
    [approver_date] datetime NULL,
    [request_status] nvarchar(4) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_ATTACHMENT];
CREATE TABLE [dbo].[QMQA_ATTACHMENT] (
    [qmqa_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_AUDIT_PLAN]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_AUDIT_PLAN];
CREATE TABLE [dbo].[QMQA_AUDIT_PLAN] (
    [qmqa_audit_plan_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [control_no] nvarchar(60) NOT NULL,
    [created_date] datetime NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [audit_category_id] nvarchar(72) NOT NULL,
    [audit_plan_date] date NOT NULL,
    [sqe_pic_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [request_status] nvarchar(4) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_CC]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_CC];
CREATE TABLE [dbo].[QMQA_CC] (
    [qmqa_cc_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_PLAN_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_PLAN_ATTACHMENT];
CREATE TABLE [dbo].[QMQA_PLAN_ATTACHMENT] (
    [qmqa_plan_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_RESPONSE]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_RESPONSE];
CREATE TABLE [dbo].[QMQA_RESPONSE] (
    [qmqa_response_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_id] nvarchar(72) NOT NULL,
    [skip_initial] bit NULL,
    [initial_report_date] datetime NULL,
    [final_report_date] datetime NULL,
    [initial_remarks] nvarchar(2000) NULL,
    [final_remarks] nvarchar(2000) NULL,
    [issuer_remarks] nvarchar(2000) NULL,
    [issuer_date] datetime NULL,
    [checker_id] nvarchar(72) NULL,
    [checker_remarks] nvarchar(2000) NULL,
    [checker_date] datetime NULL,
    [approver_id] nvarchar(72) NULL,
    [approver_remarks] nvarchar(2000) NULL,
    [approver_date] datetime NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL,
    [accept_date] datetime NULL,
    [remarks] nvarchar(2000) NULL,
    [verification_remarks] nvarchar(2000) NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_RESPONSE_FINAL]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_RESPONSE_FINAL];
CREATE TABLE [dbo].[QMQA_RESPONSE_FINAL] (
    [qmqa_response_final_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_response_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_RESPONSE_INITIAL]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_RESPONSE_INITIAL];
CREATE TABLE [dbo].[QMQA_RESPONSE_INITIAL] (
    [qmqa_response_initial_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_response_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[QMQA_RESPONSE_VERIFICATION]', 'U') IS NOT NULL DROP TABLE [dbo].[QMQA_RESPONSE_VERIFICATION];
CREATE TABLE [dbo].[QMQA_RESPONSE_VERIFICATION] (
    [qmqa_response_verification_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [qmqa_response_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

