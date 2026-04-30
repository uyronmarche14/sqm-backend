-- Generated SQL for Module: MNR

IF OBJECT_ID('[dbo].[MNR_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[MNR_ATTACHMENT];

CREATE TABLE [dbo].[MNR_ATTACHMENT] (
    [mnr_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mnr_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(30) NOT NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MNR_CC]', 'U') IS NOT NULL DROP TABLE [dbo].[MNR_CC];

CREATE TABLE [dbo].[MNR_CC] (
    [mnr_cc_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mnr_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MNR_DETAILS]', 'U') IS NOT NULL DROP TABLE [dbo].[MNR_DETAILS];

CREATE TABLE [dbo].[MNR_DETAILS] (
    [mnr_detail_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mnr_id] nvarchar(72) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [defect_id] nvarchar(72) NOT NULL,
    [defectclass_id] nvarchar(72) NULL,
    [defect_qty] int NOT NULL,
    [ca] bit NOT NULL,
    [inspection_date] datetime NULL,
    [invoice_no] nvarchar(100) NULL,
    [invoice_qty] int NULL,
    [lot_no] nvarchar(100) NULL,
    [lot_size] int NULL,
    [sample_size] int NULL,
    [group_line] nvarchar(100) NULL,
    [area_defect] nvarchar(100) NULL,
    [cavity_no] nvarchar(100) NULL,
    [tray_no] nvarchar(100) NULL,
    [encounter_date] datetime NULL,
    [verification_date] datetime NULL,
    [verified_by] nvarchar(100) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MNR_LOTS]', 'U') IS NOT NULL DROP TABLE [dbo].[MNR_LOTS];

CREATE TABLE [dbo].[MNR_LOTS] (
    [mnr_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [control_no] nvarchar(60) NOT NULL,
    [date_created] datetime NOT NULL,
    [issued_date] datetime NULL,
    [site_id] nvarchar(72) NOT NULL,
    [product_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [model_id] nvarchar(72) NOT NULL,
    [mfg_area_id] nvarchar(72) NOT NULL,
    [defectcategory_id] nvarchar(72) NOT NULL,
    [mnrtype_id] nvarchar(72) NOT NULL,
    [attention_id] nvarchar(72) NOT NULL,
    [reference_no] nvarchar(100) NULL,
    [initial_report_date] datetime NOT NULL,
    [due_date] datetime NOT NULL,
    [actual_initial_report_date] datetime NULL,
    [actual_final_report_date] datetime NULL,
    [rtv] bit NOT NULL,
    [rtv_total_qty] int NULL,
    [rtv_remarks] nvarchar(200) NULL,
    [sort] bit NOT NULL,
    [sort_sorted] int NULL,
    [sort_rejected] int NULL,
    [sort_reject_rate] decimal NULL,
    [sort_remarks] nvarchar(200) NULL,
    [sort_rework] bit NULL,
    [other] bit NOT NULL,
    [other_affected_qty] int NULL,
    [other_affected_doc] nvarchar(200) NULL,
    [other_remarks] nvarchar(200) NULL,
    [encoder_id] nvarchar(72) NOT NULL,
    [encoder_date] datetime NULL,
    [issuer_id] nvarchar(72) NOT NULL,
    [issuer_remarks] nvarchar(200) NULL,
    [issuer_date] datetime NULL,
    [checker_id] nvarchar(72) NULL,
    [checker_remarks] nvarchar(200) NULL,
    [checker_date] datetime NULL,
    [approver_id] nvarchar(72) NULL,
    [approver_remarks] nvarchar(200) NULL,
    [approver_date] datetime NULL,
    [request_status] nvarchar(4) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL,
    [remarks] nvarchar(400) NULL
);
GO

IF OBJECT_ID('[dbo].[MNR_RESPONSE]', 'U') IS NOT NULL DROP TABLE [dbo].[MNR_RESPONSE];

CREATE TABLE [dbo].[MNR_RESPONSE] (
    [mnr_response_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mnr_id] nvarchar(72) NOT NULL,
    [d1] text NULL,
    [d2] text NULL,
    [d3] text NULL,
    [d4] text NULL,
    [d5] text NULL,
    [d6] text NULL,
    [d7] text NULL,
    [d8] text NULL,
    [invoice_no] nvarchar(100) NULL,
    [lot_size] int NULL,
    [lot_no] nvarchar(100) NULL,
    [eta] nvarchar(100) NULL,
    [marking] nvarchar(400) NULL,
    [rtv_received] int NULL,
    [replacement_date] datetime NULL,
    [replacement_qty] int NULL,
    [ncv_invoice_no] nvarchar(100) NULL,
    [label] nvarchar(400) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL,
    [issuer_remarks] nvarchar(200) NULL,
    [issuer_date] datetime NULL,
    [checker_id] nvarchar(72) NULL,
    [checker_remarks] nvarchar(200) NULL,
    [checker_date] datetime NULL,
    [approver_id] nvarchar(72) NULL,
    [approver_remarks] nvarchar(200) NULL,
    [approver_date] datetime NULL,
    [attention_date] datetime NULL,
    [accept_date] datetime NULL,
    [remarks] nvarchar(400) NULL
);
GO

IF OBJECT_ID('[dbo].[MNR_RESPONSE_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[MNR_RESPONSE_ATTACHMENT];

CREATE TABLE [dbo].[MNR_RESPONSE_ATTACHMENT] (
    [mnr_response_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mnr_response_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(30) NOT NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MNR_VERIFICATION]', 'U') IS NOT NULL DROP TABLE [dbo].[MNR_VERIFICATION];

CREATE TABLE [dbo].[MNR_VERIFICATION] (
    [mnr_verification_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mnr_id] nvarchar(72) NOT NULL,
    [received_date] datetime NOT NULL,
    [invoice_no] nvarchar(100) NOT NULL,
    [judgment] nvarchar(20) NOT NULL,
    [remarks] nvarchar(400) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MNRTYPE]', 'U') IS NOT NULL DROP TABLE [dbo].[MNRTYPE];

CREATE TABLE [dbo].[MNRTYPE] (
    [mnrtype_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mnrtype_name] nvarchar(100) NOT NULL,
    [mnrtype_desc] varchar(100) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO