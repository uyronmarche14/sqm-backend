-- Generated SQL for Module: SQMP

IF OBJECT_ID('[dbo].[SQMP]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP];
CREATE TABLE [dbo].[SQMP] (
    [sqmp_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [control_no] nvarchar(40) NOT NULL,
    [registration_date] datetime NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [attention_id] nvarchar(72) NOT NULL,
    [fiscal_year] int NOT NULL,
    [semester] int NOT NULL,
    [issued_date] datetime NULL,
    [due_date] datetime NOT NULL,
    [model_id] nvarchar(72) NOT NULL,
    [revision] int NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [main_document_remarks] nvarchar(2000) NULL,
    [appendix_sheet_remarks] nvarchar(2000) NULL,
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

IF OBJECT_ID('[dbo].[SQMP_APPENDIX]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_APPENDIX];
CREATE TABLE [dbo].[SQMP_APPENDIX] (
    [sqmp_appendix_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQMP_CC]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_CC];
CREATE TABLE [dbo].[SQMP_CC] (
    [sqmp_cc_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQMP_DOCUMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_DOCUMENT];
CREATE TABLE [dbo].[SQMP_DOCUMENT] (
    [sqmp_document_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQMP_RESPONSE]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_RESPONSE];
CREATE TABLE [dbo].[SQMP_RESPONSE] (
    [sqmp_response_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_id] nvarchar(72) NOT NULL,
    [response_date] datetime NOT NULL,
    [main_document_remarks] nvarchar(2000) NULL,
    [appendix_sheet_remarks] nvarchar(2000) NULL,
    [closure_remarks] nvarchar(2000) NULL,
    [issuer_remarks] nvarchar(2000) NULL,
    [issuer_date] datetime NULL,
    [checker_id] nvarchar(72) NULL,
    [checker_remarks] nvarchar(2000) NULL,
    [checker_date] datetime NULL,
    [approver_id] nvarchar(72) NULL,
    [approver_remarks] nvarchar(2000) NULL,
    [approver_date] datetime NULL,
    [remarks] nvarchar(2000) NULL,
    [accept_date] datetime NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQMP_RESPONSE_APPENDIX]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_RESPONSE_APPENDIX];
CREATE TABLE [dbo].[SQMP_RESPONSE_APPENDIX] (
    [sqmp_response_appendix_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_response_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQMP_RESPONSE_CLOSURE]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_RESPONSE_CLOSURE];
CREATE TABLE [dbo].[SQMP_RESPONSE_CLOSURE] (
    [sqmp_response_closure_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_response_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQMP_RESPONSE_DOCUMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_RESPONSE_DOCUMENT];
CREATE TABLE [dbo].[SQMP_RESPONSE_DOCUMENT] (
    [sqmp_response_document_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_response_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQMP_STATUS_REMARKS]', 'U') IS NOT NULL DROP TABLE [dbo].[SQMP_STATUS_REMARKS];
CREATE TABLE [dbo].[SQMP_STATUS_REMARKS] (
    [sqmp_status_remarks_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqmp_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [request_status] nvarchar(4) NOT NULL,
    [remarks_by_id] nvarchar(72) NOT NULL,
    [remarks_date] datetime NOT NULL
);
GO
