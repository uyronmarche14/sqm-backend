-- Generated SQL for Module: OGI

IF OBJECT_ID('[dbo].[OGI]', 'U') IS NOT NULL DROP TABLE [dbo].[OGI];
CREATE TABLE [dbo].[OGI] (
    [ogi_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [control_no] nvarchar(60) NOT NULL,
    [upload_date] datetime NOT NULL,
    [incharge_id] nvarchar(72) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(400) NULL,
    [submit_date] datetime NULL,
    [request_status] nvarchar(4) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[OGI_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[OGI_ATTACHMENT];
CREATE TABLE [dbo].[OGI_ATTACHMENT] (
    [ogi_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [ogi_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(30) NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[OGI_ATTACHMENT_BACKUP]', 'U') IS NOT NULL DROP TABLE [dbo].[OGI_ATTACHMENT_BACKUP];
CREATE TABLE [dbo].[OGI_ATTACHMENT_BACKUP] (
    [ogi_attachment_id] nvarchar(72) NOT NULL,
    [ogi_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(30) NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[OGI_backup]', 'U') IS NOT NULL DROP TABLE [dbo].[OGI_backup];
CREATE TABLE [dbo].[OGI_backup] (
    [ogi_id] nvarchar(72) NOT NULL,
    [control_no] nvarchar(60) NOT NULL,
    [upload_date] datetime NOT NULL,
    [incharge_id] nvarchar(72) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(400) NULL,
    [submit_date] datetime NULL,
    [request_status] nvarchar(4) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[OGI_LOTS]', 'U') IS NOT NULL DROP TABLE [dbo].[OGI_LOTS];
CREATE TABLE [dbo].[OGI_LOTS] (
    [ogi_lot_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [ogi_id] nvarchar(72) NOT NULL,
    [lot_no] nvarchar(100) NOT NULL,
    [invoice_no] nvarchar(100) NOT NULL,
    [lot_size] int NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[OGI_LOTS_BACKUP]', 'U') IS NOT NULL DROP TABLE [dbo].[OGI_LOTS_BACKUP];
CREATE TABLE [dbo].[OGI_LOTS_BACKUP] (
    [ogi_lot_id] nvarchar(72) NOT NULL,
    [ogi_id] nvarchar(72) NOT NULL,
    [lot_no] nvarchar(100) NOT NULL,
    [invoice_no] nvarchar(100) NOT NULL,
    [lot_size] int NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

