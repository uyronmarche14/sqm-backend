-- Generated SQL for Module: MAINTENANCE

IF OBJECT_ID('[dbo].[AQL]', 'U') IS NOT NULL DROP TABLE [dbo].[AQL];

CREATE TABLE [dbo].[AQL] (
    [aql_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [aql_name] nvarchar(100) NOT NULL,
    [minor] decimal NOT NULL,
    [major] decimal NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [aql_desc] nvarchar(200) NULL,
    [creation_date] datetime NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[AQLLEVEL]', 'U') IS NOT NULL DROP TABLE [dbo].[AQLLEVEL];

CREATE TABLE [dbo].[AQLLEVEL] (
    [aqllevel_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [aql_id] nvarchar(72) NOT NULL,
    [severity_id] nvarchar(72) NOT NULL,
    [lot_size_min] int NOT NULL,
    [lot_size_max] int NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[AQLLEVELCLASS]', 'U') IS NOT NULL DROP TABLE [dbo].[AQLLEVELCLASS];

CREATE TABLE [dbo].[AQLLEVELCLASS] (
    [aqllevelclass_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [aqllevel_id] nvarchar(72) NOT NULL,
    [defectclass_id] nvarchar(72) NOT NULL,
    [samplesize] int NOT NULL,
    [accept] int NOT NULL,
    [reject] int NOT NULL
);
GO

IF OBJECT_ID('[dbo].[ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[ATTACHMENT];

CREATE TABLE [dbo].[ATTACHMENT] (
    [ID] nvarchar(72) NOT NULL,
    [File_Name] nvarchar(200) NOT NULL,
    [File_Extension] nvarchar(40) NOT NULL,
    [File_Path] nvarchar(500) NULL,
    [File_Group] nvarchar(600) NULL,
    [CreateDate] nvarchar(100) NOT NULL,
    [UpdateBy] nvarchar(200) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[AUDITCATEGORY]', 'U') IS NOT NULL DROP TABLE [dbo].[AUDITCATEGORY];

CREATE TABLE [dbo].[AUDITCATEGORY] (
    [audit_category_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [audit_category_name] nvarchar(100) NOT NULL,
    [audit_category_code] nvarchar(20) NOT NULL,
    [audit_category_desc] nvarchar(400) NULL,
    [with_rating] bit NOT NULL,
    [with_auditees] bit NOT NULL,
    [with_auditors] bit NOT NULL,
    [with_attendees] bit NOT NULL,
    [with_audit_plan] bit NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[AUDITTYPE]', 'U') IS NOT NULL DROP TABLE [dbo].[AUDITTYPE];

CREATE TABLE [dbo].[AUDITTYPE] (
    [audit_type_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [audit_type_name] nvarchar(100) NOT NULL,
    [audit_type_desc] nvarchar(400) NULL,
    [audit_category_id] nvarchar(72) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[BROWSER_INFO]', 'U') IS NOT NULL DROP TABLE [dbo].[BROWSER_INFO];

CREATE TABLE [dbo].[BROWSER_INFO] (
    [browser_info_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [browser_info] nvarchar(4000) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [login_date] datetime NOT NULL
);
GO

IF OBJECT_ID('[dbo].[CERTIFICATIONS]', 'U') IS NOT NULL DROP TABLE [dbo].[CERTIFICATIONS];

CREATE TABLE [dbo].[CERTIFICATIONS] (
    [certification_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [certification_name] nvarchar(100) NOT NULL,
    [certification_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[CRITERIAS]', 'U') IS NOT NULL DROP TABLE [dbo].[CRITERIAS];

CREATE TABLE [dbo].[CRITERIAS] (
    [criteria_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [criteria_name] nvarchar(100) NULL,
    [criteria_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[CUSTOMER]', 'U') IS NOT NULL DROP TABLE [dbo].[CUSTOMER];

CREATE TABLE [dbo].[CUSTOMER] (
    [customer_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [customer_name] nvarchar(100) NOT NULL,
    [customer_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[DEFECTCATEGORIES]', 'U') IS NOT NULL DROP TABLE [dbo].[DEFECTCATEGORIES];

CREATE TABLE [dbo].[DEFECTCATEGORIES] (
    [defectcategory_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [defectcategory_name] nvarchar(100) NOT NULL,
    [defectcategory_acronym] nvarchar(100) NOT NULL,
    [defectcategory_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[DEFECTCLASS]', 'U') IS NOT NULL DROP TABLE [dbo].[DEFECTCLASS];

CREATE TABLE [dbo].[DEFECTCLASS] (
    [defectclass_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [defectclass_name] nvarchar(100) NOT NULL,
    [defectclass_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[DEFECTS]', 'U') IS NOT NULL DROP TABLE [dbo].[DEFECTS];

CREATE TABLE [dbo].[DEFECTS] (
    [defect_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [defect_name] nvarchar(100) NOT NULL,
    [defect_desc] varchar(100) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[DISPOSITIONS]', 'U') IS NOT NULL DROP TABLE [dbo].[DISPOSITIONS];

CREATE TABLE [dbo].[DISPOSITIONS] (
    [disposition_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [disposition_name] nvarchar(100) NOT NULL,
    [disposition_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[FAQ_ITEM]', 'U') IS NOT NULL DROP TABLE [dbo].[FAQ_ITEM];

CREATE TABLE [dbo].[FAQ_ITEM] (
    [faq_item_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [faq_category] int NOT NULL,
    [question] nvarchar(4000) NOT NULL,
    [answer] nvarchar(4000) NOT NULL,
    [sequence] int NOT NULL,
    [faq_item_desc] nvarchar(2000) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[FORMS]', 'U') IS NOT NULL DROP TABLE [dbo].[FORMS];

CREATE TABLE [dbo].[FORMS] (
    [form_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [form_name] nvarchar(100) NOT NULL,
    [form_url] nvarchar(100) NOT NULL,
    [menu_group] nvarchar(100) NOT NULL,
    [icon] nvarchar(100) NULL,
    [form_desc] nvarchar(400) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[FREQUENCY]', 'U') IS NOT NULL DROP TABLE [dbo].[FREQUENCY];

CREATE TABLE [dbo].[FREQUENCY] (
    [ID] int NOT NULL,
    [Frequency] varchar(50) NULL,
    [Attrib1] varchar(50) NULL,
    [Attrib2] varchar(50) NULL
);
GO

IF OBJECT_ID('[dbo].[GROUPS]', 'U') IS NOT NULL DROP TABLE [dbo].[GROUPS];

CREATE TABLE [dbo].[GROUPS] (
    [group_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [group_name] nvarchar(100) NOT NULL,
    [group_desc] nvarchar(2000) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[INSPECTIONCATEGORIES]', 'U') IS NOT NULL DROP TABLE [dbo].[INSPECTIONCATEGORIES];

CREATE TABLE [dbo].[INSPECTIONCATEGORIES] (
    [inspectioncat_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [inspectioncat_name] nvarchar(100) NOT NULL,
    [inspectioncat_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[INSPECTIONMETHODS]', 'U') IS NOT NULL DROP TABLE [dbo].[INSPECTIONMETHODS];

CREATE TABLE [dbo].[INSPECTIONMETHODS] (
    [inspectionmethod_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [inspectionmethod_name] nvarchar(100) NOT NULL,
    [inspectionmethod_desc] nvarchar(200) NULL,
    [default_value] bit NOT NULL,
    [default_temp] decimal NOT NULL,
    [default_hum] decimal NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[INSPECTORS]', 'U') IS NOT NULL DROP TABLE [dbo].[INSPECTORS];

CREATE TABLE [dbo].[INSPECTORS] (
    [inspector_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [inspector_name] nvarchar(100) NOT NULL,
    [inspector_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MATERIALCERTS]', 'U') IS NOT NULL DROP TABLE [dbo].[MATERIALCERTS];

CREATE TABLE [dbo].[MATERIALCERTS] (
    [materialcert_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [part_id] nvarchar(72) NOT NULL,
    [component] nvarchar(100) NOT NULL,
    [required_data] nvarchar(200) NOT NULL,
    [materialcert_desc] varchar(100) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MESSAGE_INFO]', 'U') IS NOT NULL DROP TABLE [dbo].[MESSAGE_INFO];

CREATE TABLE [dbo].[MESSAGE_INFO] (
    [messageinfo_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [key_name] nvarchar(100) NOT NULL,
    [value] nvarchar(4000) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MFG_AREAS]', 'U') IS NOT NULL DROP TABLE [dbo].[MFG_AREAS];

CREATE TABLE [dbo].[MFG_AREAS] (
    [mfg_area_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [mfg_area_name] nvarchar(100) NOT NULL,
    [mfg_area_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MFG_SITES]', 'U') IS NOT NULL DROP TABLE [dbo].[MFG_SITES];

CREATE TABLE [dbo].[MFG_SITES] (
    [site_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [site_name] nvarchar(200) NOT NULL,
    [site_desc] nvarchar(400) NULL,
    [site_code] nvarchar(20) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MODELS]', 'U') IS NOT NULL DROP TABLE [dbo].[MODELS];

CREATE TABLE [dbo].[MODELS] (
    [model_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [model_no] nvarchar(100) NOT NULL,
    [model_name] nvarchar(100) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [product_id] nvarchar(72) NOT NULL,
    [model_desc] nvarchar(400) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[MSreplication_options]', 'U') IS NOT NULL DROP TABLE [dbo].[MSreplication_options];

CREATE TABLE [dbo].[MSreplication_options] (
    [optname] sysname NOT NULL,
    [value] bit NOT NULL,
    [major_version] int NOT NULL,
    [minor_version] int NOT NULL,
    [revision] int NOT NULL,
    [install_failures] int NOT NULL
);
GO

IF OBJECT_ID('[dbo].[NEWS]', 'U') IS NOT NULL DROP TABLE [dbo].[NEWS];

CREATE TABLE [dbo].[NEWS] (
    [news_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [news_name] nvarchar(100) NOT NULL,
    [news_desc] nvarchar(2000) NULL,
    [file_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(100) NOT NULL,
    [active_flag] bit NOT NULL,
    [sequence] int NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PARTCLASS]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTCLASS];

CREATE TABLE [dbo].[PARTCLASS] (
    [partclass_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [partclass_name] nvarchar(100) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [partclass_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PARTCLASSCATEGORIES]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTCLASSCATEGORIES];

CREATE TABLE [dbo].[PARTCLASSCATEGORIES] (
    [Category_ID] nvarchar(72) NOT NULL PRIMARY KEY,
    [Category_name] nvarchar(200) NOT NULL,
    [Category_desc] nvarchar(200) NULL,
    [Partclass_id] nvarchar(72) NOT NULL,
    [Active_flag] bit NOT NULL,
    [Last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PARTDATACATEGORIES]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTDATACATEGORIES];

CREATE TABLE [dbo].[PARTDATACATEGORIES] (
    [partdatacategory_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [partdatacategory_name] nvarchar(100) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [minimum] decimal NOT NULL,
    [maximum] decimal NOT NULL,
    [partdatacategory_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PARTDIMENSIONCATEGORIES]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTDIMENSIONCATEGORIES];

CREATE TABLE [dbo].[PARTDIMENSIONCATEGORIES] (
    [partdimensioncategory_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [partdimensioncategory_name] nvarchar(100) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [minimum] decimal NOT NULL,
    [maximum] decimal NOT NULL,
    [partdimensioncategory_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PARTNOISECATEGORIES]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTNOISECATEGORIES];

CREATE TABLE [dbo].[PARTNOISECATEGORIES] (
    [partnoisecategory_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [partnoisecategory_name] nvarchar(100) NOT NULL,
    [part_id] nvarchar(72) NOT NULL,
    [minimum] decimal NOT NULL,
    [maximum] decimal NOT NULL,
    [partnoisecategory_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PARTS]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTS];

CREATE TABLE [dbo].[PARTS] (
    [part_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [part_code] nvarchar(100) NOT NULL,
    [part_name] nvarchar(100) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [part_desc] nvarchar(1000) NULL,
    [partclass_id] nvarchar(72) NOT NULL,
    [parttype_id] nvarchar(72) NOT NULL,
    [aql_id] nvarchar(72) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL,
    [Attribute1] nvarchar(200) NULL,
    [Attribute2] nvarchar(200) NULL,
    [Attribute3] nvarchar(200) NULL,
    [Attribute4] nvarchar(100) NULL
);
GO

IF OBJECT_ID('[dbo].[PARTSUPPLIERS]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTSUPPLIERS];

CREATE TABLE [dbo].[PARTSUPPLIERS] (
    [partsupplier_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [part_id] nvarchar(72) NOT NULL,
    [supplier_id] nvarchar(72) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PARTTYPES]', 'U') IS NOT NULL DROP TABLE [dbo].[PARTTYPES];

CREATE TABLE [dbo].[PARTTYPES] (
    [parttype_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [parttype_name] nvarchar(100) NOT NULL,
    [parttype_desc] nvarchar(200) NULL,
    [parttype_code] nvarchar(100) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[PICTURE]', 'U') IS NOT NULL DROP TABLE [dbo].[PICTURE];

CREATE TABLE [dbo].[PICTURE] (
    [ID] int NOT NULL,
    [PictureID] varchar(50) NOT NULL PRIMARY KEY,
    [EmpNo] varchar(50) NOT NULL,
    [EmpLastName] varchar(50) NOT NULL,
    [EmpFirstName] varchar(50) NOT NULL,
    [EmpMiddleName] varchar(50) NOT NULL,
    [EmpPicture] image NULL,
    [MfgSite] varchar(50) NOT NULL,
    [Department] varchar(200) NOT NULL,
    [Section] varchar(200) NOT NULL,
    [CreateDate] datetime NOT NULL,
    [UpdateDate] datetime NOT NULL,
    [CreateBy] varchar(50) NOT NULL,
    [Attribute1] varchar(50) NULL,
    [Attribute2] varchar(50) NULL
);
GO

IF OBJECT_ID('[dbo].[PRODUCTS]', 'U') IS NOT NULL DROP TABLE [dbo].[PRODUCTS];

CREATE TABLE [dbo].[PRODUCTS] (
    [product_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [product_name] nvarchar(100) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [product_desc] nvarchar(200) NULL,
    [product_code] nvarchar(100) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[REGISTRATIONS]', 'U') IS NOT NULL DROP TABLE [dbo].[REGISTRATIONS];

CREATE TABLE [dbo].[REGISTRATIONS] (
    [registration_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [confirmation_code] nvarchar(20) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [confirmed] bit NOT NULL,
    [confirmation_date] datetime NULL,
    [active_flag] bit NOT NULL,
    [updateby] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [registration_type] int NULL
);
GO

IF OBJECT_ID('[dbo].[ROLE_ACCESS]', 'U') IS NOT NULL DROP TABLE [dbo].[ROLE_ACCESS];

CREATE TABLE [dbo].[ROLE_ACCESS] (
    [roleaccess_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [roleaccess_desc] nvarchar(200) NOT NULL,
    [role_id] nvarchar(72) NOT NULL,
    [form_id] nvarchar(72) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL,
    [can_viewlist] bit NOT NULL,
    [can_view] bit NOT NULL,
    [can_add] bit NOT NULL,
    [can_edit] bit NOT NULL,
    [can_delete] bit NOT NULL,
    [can_approve] bit NOT NULL,
    [can_check] bit NOT NULL,
    [can_print] bit NOT NULL,
    [can_export] bit NOT NULL,
    [per_site] bit NOT NULL,
    [can_attach] bit NOT NULL,
    [pic] bit NOT NULL,
    [registration_notify] bit NULL,
    [maintenance_notify] bit NULL,
    [transaction_notify] bit NULL,
    [per_supplier] bit NULL,
    [can_response] bit NULL,
    [multiple_approval] bit NULL
);
GO

IF OBJECT_ID('[dbo].[SEVERITY]', 'U') IS NOT NULL DROP TABLE [dbo].[SEVERITY];

CREATE TABLE [dbo].[SEVERITY] (
    [severity_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [severity_name] nvarchar(100) NOT NULL,
    [severity_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SPC]', 'U') IS NOT NULL DROP TABLE [dbo].[SPC];

CREATE TABLE [dbo].[SPC] (
    [spc_id] nvarchar(72) NOT NULL PRIMARY KEY,
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

IF OBJECT_ID('[dbo].[SPC_ATTACHMENT]', 'U') IS NOT NULL DROP TABLE [dbo].[SPC_ATTACHMENT];

CREATE TABLE [dbo].[SPC_ATTACHMENT] (
    [spc_attachment_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [spc_id] nvarchar(72) NOT NULL,
    [file_name] nvarchar(220) NOT NULL,
    [file_extension] nvarchar(30) NULL,
    [remarks] nvarchar(200) NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SPC_LOTS]', 'U') IS NOT NULL DROP TABLE [dbo].[SPC_LOTS];

CREATE TABLE [dbo].[SPC_LOTS] (
    [spc_lot_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [spc_id] nvarchar(72) NOT NULL,
    [lot_no] nvarchar(100) NOT NULL,
    [invoice_no] nvarchar(100) NOT NULL,
    [lot_size] int NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[spt_fallback_db]', 'U') IS NOT NULL DROP TABLE [dbo].[spt_fallback_db];

CREATE TABLE [dbo].[spt_fallback_db] (
    [xserver_name] varchar(30) NOT NULL,
    [xdttm_ins] datetime NOT NULL,
    [xdttm_last_ins_upd] datetime NOT NULL,
    [xfallback_dbid] smallint NULL,
    [name] varchar(30) NOT NULL,
    [dbid] smallint NOT NULL,
    [status] smallint NOT NULL,
    [version] smallint NOT NULL
);
GO

IF OBJECT_ID('[dbo].[spt_fallback_dev]', 'U') IS NOT NULL DROP TABLE [dbo].[spt_fallback_dev];

CREATE TABLE [dbo].[spt_fallback_dev] (
    [xserver_name] varchar(30) NOT NULL,
    [xdttm_ins] datetime NOT NULL,
    [xdttm_last_ins_upd] datetime NOT NULL,
    [xfallback_low] int NULL,
    [xfallback_drive] char NULL,
    [low] int NOT NULL,
    [high] int NOT NULL,
    [status] smallint NOT NULL,
    [name] varchar(30) NOT NULL,
    [phyname] varchar(127) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[spt_fallback_usg]', 'U') IS NOT NULL DROP TABLE [dbo].[spt_fallback_usg];

CREATE TABLE [dbo].[spt_fallback_usg] (
    [xserver_name] varchar(30) NOT NULL,
    [xdttm_ins] datetime NOT NULL,
    [xdttm_last_ins_upd] datetime NOT NULL,
    [xfallback_vstart] int NULL,
    [dbid] smallint NOT NULL,
    [segmap] int NOT NULL,
    [lstart] int NOT NULL,
    [sizepg] int NOT NULL,
    [vstart] int NOT NULL
);
GO

IF OBJECT_ID('[dbo].[spt_monitor]', 'U') IS NOT NULL DROP TABLE [dbo].[spt_monitor];

CREATE TABLE [dbo].[spt_monitor] (
    [lastrun] datetime NOT NULL,
    [cpu_busy] int NOT NULL,
    [io_busy] int NOT NULL,
    [idle] int NOT NULL,
    [pack_received] int NOT NULL,
    [pack_sent] int NOT NULL,
    [connections] int NOT NULL,
    [pack_errors] int NOT NULL,
    [total_read] int NOT NULL,
    [total_write] int NOT NULL,
    [total_errors] int NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SUPPLIER_INFORMATION]', 'U') IS NOT NULL DROP TABLE [dbo].[SUPPLIER_INFORMATION];

CREATE TABLE [dbo].[SUPPLIER_INFORMATION] (
    [supplier_information_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [supplier_id] nvarchar(72) NOT NULL,
    [first_name] nvarchar(100) NOT NULL,
    [middle_name] nvarchar(100) NOT NULL,
    [last_name] nvarchar(100) NOT NULL,
    [supplier_information_desc] nvarchar(2000) NULL,
    [attachment_id] nvarchar(72) NOT NULL,
    [attachment_name] nvarchar(200) NOT NULL,
    [attachment_extension] nvarchar(20) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SUPPLIERCERTIFICATIONS]', 'U') IS NOT NULL DROP TABLE [dbo].[SUPPLIERCERTIFICATIONS];

CREATE TABLE [dbo].[SUPPLIERCERTIFICATIONS] (
    [suppliercertification_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [supplier_id] nvarchar(72) NOT NULL,
    [certification_id] nvarchar(72) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SUPPLIEROGIRECIPIENT]', 'U') IS NOT NULL DROP TABLE [dbo].[SUPPLIEROGIRECIPIENT];

CREATE TABLE [dbo].[SUPPLIEROGIRECIPIENT] (
    [supplier_ogirecipient_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [supplier_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SUPPLIERS]', 'U') IS NOT NULL DROP TABLE [dbo].[SUPPLIERS];

CREATE TABLE [dbo].[SUPPLIERS] (
    [supplier_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [supplier_name] nvarchar(200) NOT NULL,
    [site_id] nvarchar(72) NOT NULL,
    [supplier_desc] nvarchar(400) NULL,
    [location] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SUPPLIERSPCRECIPIENT]', 'U') IS NOT NULL DROP TABLE [dbo].[SUPPLIERSPCRECIPIENT];

CREATE TABLE [dbo].[SUPPLIERSPCRECIPIENT] (
    [supplier_spcrecipient_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [supplier_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[SUPPLIERSUSER]', 'U') IS NOT NULL DROP TABLE [dbo].[SUPPLIERSUSER];

CREATE TABLE [dbo].[SUPPLIERSUSER] (
    [Id] nvarchar(72) NOT NULL PRIMARY KEY,
    [supplier_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updatedby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[TRAINING_PROGRAMS]', 'U') IS NOT NULL DROP TABLE [dbo].[TRAINING_PROGRAMS];

CREATE TABLE [dbo].[TRAINING_PROGRAMS] (
    [training_program_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [training_program_name] nvarchar(100) NOT NULL,
    [training_program_desc] nvarchar(2000) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO

IF OBJECT_ID('[dbo].[TRAININGS]', 'U') IS NOT NULL DROP TABLE [dbo].[TRAININGS];

CREATE TABLE [dbo].[TRAININGS] (
    [training_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [training_level] nvarchar(4) NOT NULL,
    [training_name] nvarchar(100) NOT NULL,
    [training_program_id] nvarchar(72) NOT NULL,
    [training_desc] nvarchar(2000) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(100) NOT NULL
);
GO
