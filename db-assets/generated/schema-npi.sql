-- Generated SQL for Module: NPI

IF OBJECT_ID('[dbo].[NPI_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_ATTACHMENT];
CREATE TABLE [dbo].[NPI_ATTACHMENT] (
    [npi_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [npi_lot_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(200) NOT NULL,
    [file_extension] nvarchar(30) NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[NPI_CC]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_CC];
CREATE TABLE [dbo].[NPI_CC] (
    [npi_cc_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [npi_lot_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[NPI_DATACAT]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_DATACAT];
CREATE TABLE [dbo].[NPI_DATACAT] (
    [npi_datacat_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [npi_lot_id] nvarchar(72) NOT NULL,
    [partdatacategory_name] nvarchar(100) NOT NULL,
    [std_min] decimal NOT NULL,
    [std_max] decimal NOT NULL,
    [actual_min] decimal NULL,
    [actual_max] decimal NULL,
    [cpk] decimal NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[NPI_DIMENSIONCAT]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_DIMENSIONCAT];
CREATE TABLE [dbo].[NPI_DIMENSIONCAT] (
    [npi_dimensioncat_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [npi_lot_id] nvarchar(72) NOT NULL,
    [partdimensioncategory_name] nvarchar(100) NOT NULL,
    [std_min] decimal NOT NULL,
    [std_max] decimal NOT NULL,
    [actual_min] decimal NULL,
    [actual_max] decimal NULL,
    [cpk] decimal NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[NPI_LOTS]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_LOTS];
CREATE TABLE [dbo].[NPI_LOTS] (
    [npi_lot_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [control_no] nvarchar(60) NOT NULL,
    [datecreated] datetime NOT NULL,
    [inspectioncat_id] nvarchar(72) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [model_id] nvarchar(72) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [lot_no] nvarchar(100) NOT NULL,
    [lot_size] int NOT NULL,
    [invoice_no] nvarchar(100) NOT NULL,
    [po_no] nvarchar(100) NOT NULL,
    [sample_size] int NOT NULL,
    [severity_id] nvarchar(72) NOT NULL,
    [severity_seq] nvarchar(30) NULL,
    [inspectionmethod_id] nvarchar(72) NOT NULL,
    [inspection_date] datetime NOT NULL,
    [inspection_temp] decimal NOT NULL,
    [inspection_hum] decimal NOT NULL,
    [delivery_date] datetime NOT NULL,
    [rohs_verification] nvarchar(100) NULL,
    [reference_mnr_no] nvarchar(100) NULL,
    [disposition_id] nvarchar(72) NOT NULL,
    [inspected_by_id] nvarchar(72) NOT NULL,
    [data_verified_by_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(400) NULL,
    [inspector_remarks] nvarchar(400) NULL,
    [inspector_id] nvarchar(72) NOT NULL,
    [submitted_date] datetime NULL,
    [checker_remarks] nvarchar(400) NULL,
    [checker_id] nvarchar(72) NULL,
    [checked_date] datetime NULL,
    [approver_remarks] nvarchar(400) NULL,
    [approver_id] nvarchar(72) NULL,
    [approved_date] datetime NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL,
    [request_status] nvarchar(4) NOT NULL,
    [total_minor] int NOT NULL,
    [total_major] int NOT NULL,
    [total_critical] int NOT NULL,
    [ssi_accept] bit NOT NULL,
    [ogi_ref_no] nvarchar(60) NULL,
    [judgment] nvarchar(20) NULL,
    [starttime] int NOT NULL,
    [endtime] int NOT NULL,
    [receivetime] int NOT NULL,
    [endorsetime] int NOT NULL,
    [visual_judgment] nvarchar(20) NULL
);
GO

IF OBJECT_ID('[dbo].[NPI_MATERIALCERT]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_MATERIALCERT];
CREATE TABLE [dbo].[NPI_MATERIALCERT] (
    [npi_materialcert_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [npi_lot_id] nvarchar(72) NOT NULL,
    [component] nvarchar(100) NOT NULL,
    [description] nvarchar(200) NOT NULL,
    [required_data] nvarchar(200) NOT NULL,
    [judgement] bit NOT NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[NPI_NOISECAT]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_NOISECAT];
CREATE TABLE [dbo].[NPI_NOISECAT] (
    [npi_noisecat_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [npi_lot_id] nvarchar(72) NOT NULL,
    [partnoisecategory_name] nvarchar(100) NOT NULL,
    [std_min] decimal NOT NULL,
    [std_max] decimal NOT NULL,
    [actual_min] decimal NULL,
    [actual_max] decimal NULL,
    [cpk] decimal NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[NPI_VISUALCAT]', 'U') IS NOT NULL DROP TABLE [dbo].[NPI_VISUALCAT];
CREATE TABLE [dbo].[NPI_VISUALCAT] (
    [npi_visualcat_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [npi_lot_id] nvarchar(72) NOT NULL,
    [defectclass_id] nvarchar(72) NOT NULL,
    [defect_id] nvarchar(72) NOT NULL,
    [quantity] int NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

