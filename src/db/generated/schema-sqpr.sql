-- Generated SQL for Module: SQPR

IF OBJECT_ID('[dbo].[SQPR]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR];

CREATE TABLE [dbo].[SQPR] (
    [sqpr_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [control_no] nvarchar(60) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NULL,
    [attention_id] nvarchar(72) NULL,
    [attention] nvarchar(255) NULL,
    [fiscal_year] int NOT NULL,
    [report_type] int NOT NULL,
    [month] int NOT NULL,
    [file_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(200) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [date_created] datetime NOT NULL,
    [incharge_id] nvarchar(72) NOT NULL,
    [incharge_remarks] nvarchar(2000) NULL,
    [submit_date] datetime NULL,
    [checker_id] nvarchar(72) NULL,
    [checker_remarks] nvarchar(2000) NULL,
    [checker_date] datetime NULL,
    [approver_id] nvarchar(72) NULL,
    [approver_remarks] nvarchar(2000) NULL,
    [approver_date] datetime NULL,
    [request_status] nvarchar(20) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_ATTACHMENT];

CREATE TABLE [dbo].[SQPR_ATTACHMENT] (
    [sqpr_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqpr_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_CC]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_CC];

CREATE TABLE [dbo].[SQPR_CC] (
    [sqpr_cc_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqpr_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_CUSTOMER_CLAIM]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_CUSTOMER_CLAIM];

CREATE TABLE [dbo].[SQPR_CUSTOMER_CLAIM] (
    [sqpr_customer_claim_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqpr_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [customer_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_DETAIL]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_DETAIL];

CREATE TABLE [dbo].[SQPR_DETAIL] (
    [sqpr_detail_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqpr_id] nvarchar(72) NOT NULL,
    [detail_type] int NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [value] decimal NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL,
    [Is_percentage] bit NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_LAR]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_LAR];

CREATE TABLE [dbo].[SQPR_LAR] (
    [sqpr_lar_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [control_no] nvarchar(60) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [fiscal_year] int NOT NULL,
    [report_type] int NOT NULL,
    [month] int NOT NULL,
    [file_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(200) NOT NULL,
    [file_extension] nvarchar(20) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [date_created] datetime NOT NULL,
    [worst_lar_remarks] nvarchar(2000) NULL,
    [worst_dppm_remarks] nvarchar(2000) NULL,
    [incharge_id] nvarchar(72) NOT NULL,
    [incharge_remarks] nvarchar(2000) NULL,
    [submit_date] datetime NULL,
    [checker_id] nvarchar(72) NULL,
    [checker_remarks] nvarchar(2000) NULL,
    [checker_date] datetime NULL,
    [approver_id] nvarchar(72) NULL,
    [approver_remarks] nvarchar(2000) NULL,
    [approver_date] datetime NULL,
    [request_status] nvarchar(20) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_LAR_CC]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_LAR_CC];

CREATE TABLE [dbo].[SQPR_LAR_CC] (
    [sqpr_lar_cc_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqpr_lar_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_LAR_DETAIL]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_LAR_DETAIL];

CREATE TABLE [dbo].[SQPR_LAR_DETAIL] (
    [sqpr_lar_detail_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqpr_lar_id] nvarchar(72) NOT NULL,
    [detail_type] int NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [value] decimal NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQPR_QUALITY_RISK]', 'U') IS NOT NULL DROP TABLE [dbo].[SQPR_QUALITY_RISK];

CREATE TABLE [dbo].[SQPR_QUALITY_RISK] (
    [sqpr_quality_risk_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqpr_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO