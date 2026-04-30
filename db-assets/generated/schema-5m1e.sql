-- Generated SQL for Module: 5M1E
-- Status: LEGACY NAMING PRESERVED, TYPES STANDARDIZED

IF OBJECT_ID('[dbo].[TBL_5M1E_ActionItems]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_ActionItems];

CREATE TABLE [dbo].[TBL_5M1E_ActionItems] (
    [ID] int NOT NULL PRIMARY KEY,
    [ControlNo] varchar(50) NULL,
    [ActionItem] text NULL,
    [FirstTargetDt] varchar(50) NULL,
    [SecondTargetDt] varchar(50) NULL,
    [ThirdTargetDt] varchar(50) NULL,
    [PIC] varchar(50) NULL,
    [PICName] varchar(100) NULL,
    [VerificationResult] varchar(50) NULL,
    [Remarks] text NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [Attribute01] nvarchar(500) NULL,
    [Attribute02] nvarchar(500) NULL,
    [Attribute03] nvarchar(500) NULL,
    [Attribute04] nvarchar(500) NULL,
    [Attribute05] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_AI_Attachment]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_AI_Attachment];

CREATE TABLE [dbo].[TBL_5M1E_AI_Attachment] (
    [ID] int NOT NULL PRIMARY KEY,
    [ChkItemID] int NOT NULL,
    [FileName] varchar(255) NOT NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [attribute1] nvarchar(500) NULL,
    [attribute2] nvarchar(500) NULL,
    [attribute3] nvarchar(500) NULL,
    [attribute4] nvarchar(500) NULL,
    [attribute5] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_Application]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_Application];

CREATE TABLE [dbo].[TBL_5M1E_Application] (
    [ID] int NOT NULL PRIMARY KEY,
    [ControlNo] varchar(50) NULL,
    [Title] varchar(255) NOT NULL,
    [SupplierID] nvarchar(72) NULL, -- Standardized Type
    [SupplierCN] varchar(50) NOT NULL,
    [VendorID] nvarchar(72) NOT NULL,
    [ItemID] nvarchar(72) NOT NULL, -- Standardized Type
    [SiteID] nvarchar(72) NULL, -- Standardized Type
    [CommodityID] nvarchar(72) NULL, -- Standardized Type
    [ModelID] nvarchar(72) NULL, -- Standardized Type
    [EngineerRemarks] text NULL,
    [ReportNo] varchar(50) NULL,
    [DateRegister] datetime NULL,
    [Class] nvarchar(72) NULL,
    [ClassType] nvarchar(72) NULL,
    [CreatedBy] varchar(50) NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NOT NULL,
    [ImpactDate] varchar(250) NOT NULL,
    [Attribute10] varchar(250) NULL,
    [Attribute09] varchar(250) NULL,
    [Attribute08] varchar(250) NULL,
    [Attribute07] varchar(250) NULL,
    [Attribute06] varchar(250) NULL,
    [Attribute05] varchar(250) NULL,
    [Attribute04] varchar(250) NULL,
    [Attribute03] varchar(250) NULL,
    [Attribute02] varchar(250) NULL,
    [Attribute01] varchar(250) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_Approval]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_Approval];

CREATE TABLE [dbo].[TBL_5M1E_Approval] (
    [ID] int NOT NULL PRIMARY KEY,
    [ControlNo] varchar(50) NOT NULL,
    [MPDPIC] varchar(40) NULL,
    [MPDChecker] varchar(20) NULL,
    [MPDCheckerName] varchar(100) NULL,
    [MPDCheckerStatus] bit NULL,
    [MPDChkrDtAprd] varchar(50) NULL,
    [MPDApprover] varchar(36) NULL,
    [MPDApproverName] varchar(100) NULL,
    [MPDApproverStatus] bit NULL,
    [MPDAprDtAprd] varchar(50) NULL,
    [HDEPIC] varchar(50) NULL,
    [Reviewer] varchar(36) NULL,
    [ReviewerName] varchar(100) NULL,
    [ReviewerStatus] bit NULL,
    [IssueDate] varchar(50) NULL,
    [Checker] varchar(36) NULL,
    [CheckerName] varchar(100) NULL,
    [ChkrDtAprd] varchar(50) NULL,
    [ChkrStatus] nvarchar(100) NULL,
    [Approver] varchar(36) NULL,
    [ApproverName] varchar(100) NULL,
    [ApproverDtAprd] varchar(50) NULL,
    [AprStatus] nvarchar(100) NULL,
    [FinalApprover] varchar(36) NULL,
    [FAName] varchar(100) NULL,
    [FADtAprd] nvarchar(100) NULL,
    [FAStatus] varchar(50) NULL,
    [ApprovalSeq] int NULL,
    [Status] varchar(50) NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [DSCheckerNecessary] varchar(3) NOT NULL,
    [DesignCheckerID] varchar(40) NULL,
    [DesignCheckerName] varchar(250) NULL,
    [DesignCheckerStatus] bit NULL,
    [DesignCheckerDtAprd] varchar(250) NULL,
    [DSAppproverNecessary] varchar(3) NOT NULL,
    [DesignApproverID] varchar(40) NULL,
    [DesignApproverName] varchar(250) NULL,
    [DesignApproverStatus] bit NULL,
    [DesignApproverDtAprd] varchar(250) NULL,
    [EnviCheckerNecessary] varchar(3) NOT NULL,
    [EnviCheckerID] varchar(40) NULL,
    [EnviCheckerName] varchar(250) NULL,
    [EnviCheckerStatus] bit NULL,
    [EnviCheckerDtAprd] varchar(40) NULL,
    [EnviAppproverNecessary] varchar(3) NOT NULL,
    [EnviApproverID] varchar(40) NULL,
    [EnviApproveName] nvarchar(500) NULL,
    [EnviApproveStatus] bit NULL,
    [EnviApproveDtAprd] nvarchar(500) NULL,
    [QACheckerID] nvarchar(100) NULL,
    [QACheckerName] nvarchar(500) NULL,
    [QACheckerStatus] bit NULL,
    [QACheckerDtAprd] nvarchar(100) NULL,
    [RevisedSequence] int NULL,
    [CR] varchar(3) NULL,
    [EvaluationIC] varchar(36) NULL,
    [EvaluationICName] varchar(100) NULL,
    [EvaluationICDtAprd] varchar(50) NULL,
    [EvaluationICStatus] bit NULL,
    [RejectedBy] varchar(50) NULL,
    [RejectedDate] varchar(50) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_Attachment]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_Attachment];

CREATE TABLE [dbo].[TBL_5M1E_Attachment] (
    [ID] int NOT NULL PRIMARY KEY,
    [ControlNo] varchar(50) NOT NULL,
    [FileName] varchar(255) NOT NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [Attribute1] nvarchar(500) NULL,
    [Attribute2] nvarchar(500) NULL,
    [Attribute3] nvarchar(500) NULL,
    [Attribute4] nvarchar(500) NULL,
    [Attribute5] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_CheckItems]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_CheckItems];

CREATE TABLE [dbo].[TBL_5M1E_CheckItems] (
    [ID] int NOT NULL PRIMARY KEY,
    [ControlNo] varchar(50) NOT NULL,
    [CheckItem] varchar(255) NOT NULL,
    [Judgement] varchar(20) NOT NULL,
    [Remarks] text NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [Attribute1] nvarchar(500) NULL,
    [Attribute2] nvarchar(500) NULL,
    [Attribute3] nvarchar(500) NULL,
    [Attribute4] nvarchar(500) NULL,
    [Attribute5] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_CI_Attachment]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_CI_Attachment];

CREATE TABLE [dbo].[TBL_5M1E_CI_Attachment] (
    [ID] int NOT NULL PRIMARY KEY,
    [ChkItemID] int NOT NULL,
    [FileName] varchar(255) NOT NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [attribute1] nvarchar(500) NULL,
    [attribute2] nvarchar(500) NULL,
    [attribute3] nvarchar(500) NULL,
    [attribute4] nvarchar(500) NULL,
    [attribute5] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_EmailDailyNotification]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_EmailDailyNotification];

CREATE TABLE [dbo].[TBL_5M1E_EmailDailyNotification] (
    [ID] nvarchar(72) NOT NULL PRIMARY KEY,
    [ControlNo] nvarchar(100) NOT NULL,
    [MPDPICstatus] bit NULL,
    [HDEPICstatus] bit NULL,
    [StartDate] datetime NULL,
    [FinalApproverStatus] bit NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_EmailElements]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_EmailElements];

CREATE TABLE [dbo].[TBL_5M1E_EmailElements] (
    [ElementID] int NOT NULL,
    [ElementName] varchar(200) NOT NULL,
    [ElementValue] varchar(MAX) NOT NULL,
    [Attribute1] varchar(100) NOT NULL,
    [Attribute2] varchar(100) NOT NULL,
    [Attribute3] varchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_PartsPerReport]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_PartsPerReport];

CREATE TABLE [dbo].[TBL_5M1E_PartsPerReport] (
    [TagID] int NOT NULL,
    [PartsTag] varchar(50) NOT NULL,
    [part_id] varchar(150) NOT NULL,
    [DateAdded] datetime NOT NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_5M1E_Status_Remarks]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_5M1E_Status_Remarks];

CREATE TABLE [dbo].[TBL_5M1E_Status_Remarks] (
    [ID] int NOT NULL PRIMARY KEY,
    [ControlNo] varchar(50) NOT NULL,
    [Remarks] text NULL,
    [RemarkBy] varchar(100) NOT NULL,
    [Status] varchar(50) NOT NULL,
    [CreateDate] datetime NULL,
    [attribute1] nvarchar(500) NULL,
    [attribute2] nvarchar(500) NULL,
    [attribute3] nvarchar(500) NULL,
    [attribute4] nvarchar(500) NULL,
    [attribute5] nvarchar(500) NULL
);
GO