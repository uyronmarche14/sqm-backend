-- Generated SQL for Module: CORE

IF OBJECT_ID('[dbo].[AUTHENTICATION]', 'U') IS NOT NULL DROP TABLE [dbo].[AUTHENTICATION];
CREATE TABLE [dbo].[AUTHENTICATION] (
    [User_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [AuthenticationExpire] datetime NOT NULL
);
GO

IF OBJECT_ID('[dbo].[ROLES]', 'U') IS NOT NULL DROP TABLE [dbo].[ROLES];
CREATE TABLE [dbo].[ROLES] (
    [role_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [role_name] nvarchar(100) NOT NULL,
    [role_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_Local_Admin]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_Local_Admin];
CREATE TABLE [dbo].[TBL_Local_Admin] (
    [ID] int NOT NULL PRIMARY KEY,
    [EmpNo] varchar(50) NOT NULL,
    [EmpName] varchar(100) NOT NULL,
    [PositionCode] varchar(50) NOT NULL,
    [DepCode] varchar(50) NOT NULL,
    [Department] varchar(100) NOT NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [attribute1] nvarchar(500) NULL,
    [attribute2] nvarchar(500) NULL,
    [attribute3] nvarchar(500) NULL,
    [attribute4] nvarchar(500) NULL,
    [attribute5] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_Roles]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_Roles];
CREATE TABLE [dbo].[TBL_Roles] (
    [ID] int NOT NULL PRIMARY KEY,
    [RoleName] varchar(50) NOT NULL,
    [RoleDesc] varchar(100) NOT NULL,
    [RoleCode] varchar(20) NULL,
    [IsActive] bit NOT NULL,
    [CreateDate] datetime NOT NULL,
    [ModifiedDate] datetime NOT NULL,
    [Attribute1] nvarchar(500) NULL,
    [Attribute2] nvarchar(500) NULL,
    [Attribute3] nvarchar(500) NULL,
    [Attribute4] nvarchar(500) NULL,
    [Attribute5] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_UserMaintenance]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_UserMaintenance];
CREATE TABLE [dbo].[TBL_UserMaintenance] (
    [ID] int NOT NULL PRIMARY KEY,
    [EmpNo] nvarchar(100) NOT NULL,
    [EmpName] nvarchar(200) NOT NULL,
    [PositionCode] nvarchar(100) NOT NULL,
    [DepCode] nvarchar(100) NOT NULL,
    [Department] nvarchar(100) NOT NULL,
    [Password] nvarchar(100) NOT NULL,
    [UserID] nvarchar(100) NOT NULL,
    [LastPwdChange] datetime NULL,
    [Confirmed] bit NOT NULL,
    [IsActive] bit NOT NULL,
    [ConfirmationTicket] nvarchar(100) NULL,
    [Email] nvarchar(100) NOT NULL,
    [CreateDate] datetime NULL,
    [ModifiedDate] datetime NULL,
    [attribute1] nvarchar(500) NULL,
    [attribute2] nvarchar(500) NULL,
    [attribute3] nvarchar(500) NULL,
    [attribute4] nvarchar(500) NULL,
    [attribute5] nvarchar(500) NULL
);
GO

IF OBJECT_ID('[dbo].[TBL_Users]', 'U') IS NOT NULL DROP TABLE [dbo].[TBL_Users];
CREATE TABLE [dbo].[TBL_Users] (
    [ID] int NOT NULL PRIMARY KEY,
    [Name] varchar(100) NOT NULL,
    [Email] varchar(100) NOT NULL,
    [Password] varchar(100) NOT NULL,
    [RoleID] int NULL,
    [SupplierID] int NULL,
    [ConfirmationTicket] varchar(255) NULL,
    [Confirmed] bit NOT NULL,
    [IsActive] bit NOT NULL,
    [LastPwdChange] datetime NULL,
    [CreateDate] datetime NOT NULL,
    [ModifiedDate] datetime NOT NULL,
    [Attribute1] nvarchar(500) NULL,
    [Attribute2] nvarchar(500) NULL,
    [Attribute3] nvarchar(500) NULL,
    [Attribute4] nvarchar(500) NULL,
    [Attribute5] nvarchar(500) NULL,
    [Attribute6] nvarchar(500) NULL,
    [Attribute7] nvarchar(500) NULL,
    [Attribute8] nvarchar(500) NULL,
    [Attribute9] nvarchar(500) NULL,
    [Attribute10] nvarchar(500) NULL,
    [MustChangePassword] bit NULL
);
GO

IF OBJECT_ID('[dbo].[USERS]', 'U') IS NOT NULL DROP TABLE [dbo].[USERS];
CREATE TABLE [dbo].[USERS] (
    [user_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [full_name] nvarchar(200) NOT NULL,
    [email] nvarchar(200) NOT NULL,
    [password] nvarchar(400) NOT NULL,
    [role_id] nvarchar(72) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [creation_date] datetime NOT NULL,
    [active_flag] bit NULL,
    [last_pasword_change] datetime NULL,
    [local_user] bit NULL,
    [login_flag] bit NULL,
    [last_update] datetime NULL,
    [updateby] nvarchar(72) NOT NULL,
    [new_flag] bit NULL,
    [change_pw] bit NULL
);
GO

