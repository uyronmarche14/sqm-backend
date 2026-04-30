-- Generated SQL for Module: SQE

IF OBJECT_ID('[dbo].[SQE]', 'U') IS NOT NULL DROP TABLE [dbo].[SQE];
CREATE TABLE [dbo].[SQE] (
    [sqe_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [employee_no] nvarchar(100) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [group_id] nvarchar(72) NOT NULL,
    [training_program_id] nvarchar(72) NOT NULL,
    [remarks] nvarchar(2000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQE_ADDITIONAL_TRAINING]', 'U') IS NOT NULL DROP TABLE [dbo].[SQE_ADDITIONAL_TRAINING];
CREATE TABLE [dbo].[SQE_ADDITIONAL_TRAINING] (
    [sqe_additional_training_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqe_training_id_reference] nvarchar(72) NULL,
    [sqe_id] nvarchar(72) NOT NULL,
    [training_name] nvarchar(100) NOT NULL,
    [from_date] date NOT NULL,
    [to_date] date NOT NULL,
    [status] nvarchar(20) NULL,
    [trainer] nvarchar(200) NOT NULL,
    [institution] nvarchar(200) NOT NULL,
    [certificate_id] nvarchar(72) NULL,
    [certificate_name] nvarchar(200) NULL,
    [certificate_extension] nvarchar(20) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQE_TRAINING]', 'U') IS NOT NULL DROP TABLE [dbo].[SQE_TRAINING];
CREATE TABLE [dbo].[SQE_TRAINING] (
    [sqe_training_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqe_id] nvarchar(72) NOT NULL,
    [training_id] nvarchar(72) NOT NULL,
    [from_date] date NULL,
    [to_date] date NULL,
    [status] nvarchar(20) NULL,
    [trainer] nvarchar(200) NULL,
    [institution] nvarchar(200) NULL,
    [certificate_id] nvarchar(72) NULL,
    [certificate_name] nvarchar(200) NULL,
    [certificate_extension] nvarchar(20) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SQE_TRAINING_ATTENDEES]', 'U') IS NOT NULL DROP TABLE [dbo].[SQE_TRAINING_ATTENDEES];
CREATE TABLE [dbo].[SQE_TRAINING_ATTENDEES] (
    [sqe_training_attendees_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [sqe_training_schedule_id] nvarchar(72) NOT NULL,
    [employee_no] nvarchar(100) NOT NULL,
    [status] nvarchar(20) NULL,
    [remarks] nvarchar(4000) NULL
);
GO

IF OBJECT_ID('[dbo].[SQE_TRAINING_LEVEL]', 'U') IS NOT NULL DROP TABLE [dbo].[SQE_TRAINING_LEVEL];
CREATE TABLE [dbo].[SQE_TRAINING_LEVEL] (
    [ID] int NOT NULL,
    [levelId] nvarchar(72) NOT NULL,
    [TrainingLevel] varchar(100) NOT NULL,
    [active_flag] bit NOT NULL,
    [updatedby] varchar(100) NOT NULL,
    [updateddate] datetime NOT NULL,
    [attrib1] varchar(50) NULL
);
GO

IF OBJECT_ID('[dbo].[SQE_TRAINING_SCHEDULE]', 'U') IS NOT NULL DROP TABLE [dbo].[SQE_TRAINING_SCHEDULE];
CREATE TABLE [dbo].[SQE_TRAINING_SCHEDULE] (
    [sqe_training_schedule_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [training_name] nvarchar(100) NOT NULL,
    [training_date] date NOT NULL,
    [room] nvarchar(100) NOT NULL,
    [start_time] int NOT NULL,
    [end_time] int NOT NULL,
    [status] nvarchar(20) NULL,
    [remarks] nvarchar(4000) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

