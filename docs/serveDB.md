# Server Database Schema (Source of Truth)

Generated on: 2026-01-16T16:54:49.404Z
Database: master

## [dbo].[AQL]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `aql_id` | nvarchar(72) | NO | 🔑 PK |
| `aql_name` | nvarchar(100) | NO |  |
| `minor` | decimal | NO |  |
| `major` | decimal | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `aql_desc` | nvarchar(200) | YES |  |
| `creation_date` | datetime | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[AQLLEVEL]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `aqllevel_id` | nvarchar(72) | NO | 🔑 PK |
| `aql_id` | nvarchar(72) | NO |  |
| `severity_id` | nvarchar(72) | NO |  |
| `lot_size_min` | int | NO |  |
| `lot_size_max` | int | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[AQLLEVELCLASS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `aqllevelclass_id` | nvarchar(72) | NO | 🔑 PK |
| `aqllevel_id` | nvarchar(72) | NO |  |
| `defectclass_id` | nvarchar(72) | NO |  |
| `samplesize` | int | NO |  |
| `accept` | int | NO |  |
| `reject` | int | NO |  |

## [dbo].[ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | nvarchar(72) | NO |  |
| `File_Name` | nvarchar(200) | NO |  |
| `File_Extension` | nvarchar(40) | NO |  |
| `File_Path` | nvarchar(500) | YES |  |
| `File_Group` | nvarchar(600) | YES |  |
| `CreateDate` | nvarchar(100) | NO |  |
| `UpdateBy` | nvarchar(200) | NO |  |

## [dbo].[AUDITCATEGORY]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `audit_category_id` | nvarchar(72) | NO | 🔑 PK |
| `audit_category_name` | nvarchar(100) | NO |  |
| `audit_category_code` | nvarchar(20) | NO |  |
| `audit_category_desc` | nvarchar(400) | YES |  |
| `with_rating` | bit | NO |  |
| `with_auditees` | bit | NO |  |
| `with_auditors` | bit | NO |  |
| `with_attendees` | bit | NO |  |
| `with_audit_plan` | bit | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[AUDITTYPE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `audit_type_id` | nvarchar(72) | NO | 🔑 PK |
| `audit_type_name` | nvarchar(100) | NO |  |
| `audit_type_desc` | nvarchar(400) | YES |  |
| `audit_category_id` | nvarchar(72) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[AUTHENTICATION]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `User_id` | nvarchar(72) | NO | 🔑 PK |
| `AuthenticationExpire` | datetime | NO |  |

## [dbo].[BROWSER_INFO]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `browser_info_id` | nvarchar(72) | NO | 🔑 PK |
| `browser_info` | nvarchar(4000) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `login_date` | datetime | NO |  |

## [dbo].[CERTIFICATIONS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `certification_id` | nvarchar(72) | NO | 🔑 PK |
| `certification_name` | nvarchar(100) | NO |  |
| `certification_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[CRITERIAS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `criteria_id` | nvarchar(72) | NO | 🔑 PK |
| `criteria_name` | nvarchar(100) | YES |  |
| `criteria_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[CUSTOMER]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `customer_id` | nvarchar(72) | NO | 🔑 PK |
| `customer_name` | nvarchar(100) | NO |  |
| `customer_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[DEFECTCATEGORIES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `defectcategory_id` | nvarchar(72) | NO | 🔑 PK |
| `defectcategory_name` | nvarchar(100) | NO |  |
| `defectcategory_acronym` | nvarchar(100) | NO |  |
| `defectcategory_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[DEFECTCLASS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `defectclass_id` | nvarchar(72) | NO | 🔑 PK |
| `defectclass_name` | nvarchar(100) | NO |  |
| `defectclass_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[DEFECTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `defect_id` | nvarchar(72) | NO | 🔑 PK |
| `defect_name` | nvarchar(100) | NO |  |
| `defect_desc` | varchar(100) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[DISPOSITIONS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `disposition_id` | nvarchar(72) | NO | 🔑 PK |
| `disposition_name` | nvarchar(100) | NO |  |
| `disposition_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[FAQ_ITEM]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `faq_item_id` | nvarchar(72) | NO | 🔑 PK |
| `faq_category` | int | NO |  |
| `question` | nvarchar(4000) | NO |  |
| `answer` | nvarchar(4000) | NO |  |
| `sequence` | int | NO |  |
| `faq_item_desc` | nvarchar(2000) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[FORMS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `form_id` | nvarchar(72) | NO | 🔑 PK |
| `form_name` | nvarchar(100) | NO |  |
| `form_url` | nvarchar(100) | NO |  |
| `menu_group` | nvarchar(100) | NO |  |
| `icon` | nvarchar(100) | YES |  |
| `form_desc` | nvarchar(400) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[FREQUENCY]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO |  |
| `Frequency` | varchar(50) | YES |  |
| `Attrib1` | varchar(50) | YES |  |
| `Attrib2` | varchar(50) | YES |  |

## [dbo].[GROUPS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `group_id` | nvarchar(72) | NO | 🔑 PK |
| `group_name` | nvarchar(100) | NO |  |
| `group_desc` | nvarchar(2000) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[INSPECTIONCATEGORIES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `inspectioncat_id` | nvarchar(72) | NO | 🔑 PK |
| `inspectioncat_name` | nvarchar(100) | NO |  |
| `inspectioncat_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[INSPECTIONMETHODS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `inspectionmethod_id` | nvarchar(72) | NO | 🔑 PK |
| `inspectionmethod_name` | nvarchar(100) | NO |  |
| `inspectionmethod_desc` | nvarchar(200) | YES |  |
| `default_value` | bit | NO |  |
| `default_temp` | decimal | NO |  |
| `default_hum` | decimal | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[INSPECTORS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `inspector_id` | nvarchar(72) | NO | 🔑 PK |
| `inspector_name` | nvarchar(100) | NO |  |
| `inspector_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[MATERIALCERTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `materialcert_id` | nvarchar(72) | NO | 🔑 PK |
| `part_id` | nvarchar(72) | NO |  |
| `component` | nvarchar(100) | NO |  |
| `required_data` | nvarchar(200) | NO |  |
| `materialcert_desc` | varchar(100) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[MESSAGE_INFO]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `messageinfo_id` | nvarchar(72) | NO | 🔑 PK |
| `key_name` | nvarchar(100) | NO |  |
| `value` | nvarchar(4000) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[MFG_AREAS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mfg_area_id` | nvarchar(72) | NO | 🔑 PK |
| `mfg_area_name` | nvarchar(100) | NO |  |
| `mfg_area_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[MFG_SITES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `site_id` | nvarchar(72) | NO | 🔑 PK |
| `site_name` | nvarchar(200) | NO |  |
| `site_desc` | nvarchar(400) | YES |  |
| `site_code` | nvarchar(20) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[MNR_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnr_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `mnr_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(30) | NO |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[MNR_CC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnr_cc_id` | nvarchar(72) | NO | 🔑 PK |
| `mnr_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[MNR_DETAILS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnr_detail_id` | nvarchar(72) | NO | 🔑 PK |
| `mnr_id` | nvarchar(72) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `defect_id` | nvarchar(72) | NO |  |
| `defectclass_id` | nvarchar(72) | YES |  |
| `defect_qty` | int | NO |  |
| `ca` | bit | NO |  |
| `inspection_date` | datetime | YES |  |
| `invoice_no` | nvarchar(100) | YES |  |
| `invoice_qty` | int | YES |  |
| `lot_no` | nvarchar(100) | YES |  |
| `lot_size` | int | YES |  |
| `sample_size` | int | YES |  |
| `group_line` | nvarchar(100) | YES |  |
| `area_defect` | nvarchar(100) | YES |  |
| `cavity_no` | nvarchar(100) | YES |  |
| `tray_no` | nvarchar(100) | YES |  |
| `encounter_date` | datetime | YES |  |
| `verification_date` | datetime | YES |  |
| `verified_by` | nvarchar(100) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[MNR_LOTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnr_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(60) | NO |  |
| `date_created` | datetime | NO |  |
| `issued_date` | datetime | YES |  |
| `site_id` | nvarchar(72) | NO |  |
| `product_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `model_id` | nvarchar(72) | NO |  |
| `mfg_area_id` | nvarchar(72) | NO |  |
| `defectcategory_id` | nvarchar(72) | NO |  |
| `mnrtype_id` | nvarchar(72) | NO |  |
| `attention_id` | nvarchar(72) | NO |  |
| `reference_no` | nvarchar(100) | YES |  |
| `initial_report_date` | datetime | NO |  |
| `due_date` | datetime | NO |  |
| `actual_initial_report_date` | datetime | YES |  |
| `actual_final_report_date` | datetime | YES |  |
| `rtv` | bit | NO |  |
| `rtv_total_qty` | int | YES |  |
| `rtv_remarks` | nvarchar(200) | YES |  |
| `sort` | bit | NO |  |
| `sort_sorted` | int | YES |  |
| `sort_rejected` | int | YES |  |
| `sort_reject_rate` | decimal | YES |  |
| `sort_remarks` | nvarchar(200) | YES |  |
| `sort_rework` | bit | YES |  |
| `other` | bit | NO |  |
| `other_affected_qty` | int | YES |  |
| `other_affected_doc` | nvarchar(200) | YES |  |
| `other_remarks` | nvarchar(200) | YES |  |
| `encoder_id` | nvarchar(72) | NO |  |
| `encoder_date` | datetime | YES |  |
| `issuer_id` | nvarchar(72) | NO |  |
| `issuer_remarks` | nvarchar(200) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(200) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(200) | YES |  |
| `approver_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |
| `remarks` | nvarchar(400) | YES |  |

## [dbo].[MNR_RESPONSE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnr_response_id` | nvarchar(72) | NO | 🔑 PK |
| `mnr_id` | nvarchar(72) | NO |  |
| `d1` | text | YES |  |
| `d2` | text | YES |  |
| `d3` | text | YES |  |
| `d4` | text | YES |  |
| `d5` | text | YES |  |
| `d6` | text | YES |  |
| `d7` | text | YES |  |
| `d8` | text | YES |  |
| `invoice_no` | nvarchar(100) | YES |  |
| `lot_size` | int | YES |  |
| `lot_no` | nvarchar(100) | YES |  |
| `eta` | nvarchar(100) | YES |  |
| `marking` | nvarchar(400) | YES |  |
| `rtv_received` | int | YES |  |
| `replacement_date` | datetime | YES |  |
| `replacement_qty` | int | YES |  |
| `ncv_invoice_no` | nvarchar(100) | YES |  |
| `label` | nvarchar(400) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |
| `issuer_remarks` | nvarchar(200) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(200) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(200) | YES |  |
| `approver_date` | datetime | YES |  |
| `attention_date` | datetime | YES |  |
| `accept_date` | datetime | YES |  |
| `remarks` | nvarchar(400) | YES |  |

## [dbo].[MNR_RESPONSE_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnr_response_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `mnr_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(30) | NO |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[MNR_VERIFICATION]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnr_verification_id` | nvarchar(72) | NO | 🔑 PK |
| `mnr_id` | nvarchar(72) | NO |  |
| `received_date` | datetime | NO |  |
| `invoice_no` | nvarchar(100) | NO |  |
| `judgment` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(400) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[MNRTYPE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `mnrtype_id` | nvarchar(72) | NO | 🔑 PK |
| `mnrtype_name` | nvarchar(100) | NO |  |
| `mnrtype_desc` | varchar(100) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[MODELS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `model_id` | nvarchar(72) | NO | 🔑 PK |
| `model_no` | nvarchar(100) | NO |  |
| `model_name` | nvarchar(100) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `product_id` | nvarchar(72) | NO |  |
| `model_desc` | nvarchar(400) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[MSreplication_options]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `optname` | sysname | NO |  |
| `value` | bit | NO |  |
| `major_version` | int | NO |  |
| `minor_version` | int | NO |  |
| `revision` | int | NO |  |
| `install_failures` | int | NO |  |

## [dbo].[NEWS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `news_id` | nvarchar(72) | NO | 🔑 PK |
| `news_name` | nvarchar(100) | NO |  |
| `news_desc` | nvarchar(2000) | YES |  |
| `file_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(100) | NO |  |
| `active_flag` | bit | NO |  |
| `sequence` | int | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[NPI_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `npi_lot_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(200) | NO |  |
| `file_extension` | nvarchar(30) | YES |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[NPI_CC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_cc_id` | nvarchar(72) | NO | 🔑 PK |
| `npi_lot_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[NPI_DATACAT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_datacat_id` | nvarchar(72) | NO | 🔑 PK |
| `npi_lot_id` | nvarchar(72) | NO |  |
| `partdatacategory_name` | nvarchar(100) | NO |  |
| `std_min` | decimal | NO |  |
| `std_max` | decimal | NO |  |
| `actual_min` | decimal | YES |  |
| `actual_max` | decimal | YES |  |
| `cpk` | decimal | YES |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[NPI_DIMENSIONCAT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_dimensioncat_id` | nvarchar(72) | NO | 🔑 PK |
| `npi_lot_id` | nvarchar(72) | NO |  |
| `partdimensioncategory_name` | nvarchar(100) | NO |  |
| `std_min` | decimal | NO |  |
| `std_max` | decimal | NO |  |
| `actual_min` | decimal | YES |  |
| `actual_max` | decimal | YES |  |
| `cpk` | decimal | YES |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[NPI_LOTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_lot_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(60) | NO |  |
| `datecreated` | datetime | NO |  |
| `inspectioncat_id` | nvarchar(72) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `model_id` | nvarchar(72) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `lot_no` | nvarchar(100) | NO |  |
| `lot_size` | int | NO |  |
| `invoice_no` | nvarchar(100) | NO |  |
| `po_no` | nvarchar(100) | NO |  |
| `sample_size` | int | NO |  |
| `severity_id` | nvarchar(72) | NO |  |
| `severity_seq` | nvarchar(30) | YES |  |
| `inspectionmethod_id` | nvarchar(72) | NO |  |
| `inspection_date` | datetime | NO |  |
| `inspection_temp` | decimal | NO |  |
| `inspection_hum` | decimal | NO |  |
| `delivery_date` | datetime | NO |  |
| `rohs_verification` | nvarchar(100) | YES |  |
| `reference_mnr_no` | nvarchar(100) | YES |  |
| `disposition_id` | nvarchar(72) | NO |  |
| `inspected_by_id` | nvarchar(72) | NO |  |
| `data_verified_by_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(400) | YES |  |
| `inspector_remarks` | nvarchar(400) | YES |  |
| `inspector_id` | nvarchar(72) | NO |  |
| `submitted_date` | datetime | YES |  |
| `checker_remarks` | nvarchar(400) | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checked_date` | datetime | YES |  |
| `approver_remarks` | nvarchar(400) | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approved_date` | datetime | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |
| `request_status` | nvarchar(4) | NO |  |
| `total_minor` | int | NO |  |
| `total_major` | int | NO |  |
| `total_critical` | int | NO |  |
| `ssi_accept` | bit | NO |  |
| `ogi_ref_no` | nvarchar(60) | YES |  |
| `judgment` | nvarchar(20) | YES |  |
| `starttime` | int | NO |  |
| `endtime` | int | NO |  |
| `receivetime` | int | NO |  |
| `endorsetime` | int | NO |  |
| `visual_judgment` | nvarchar(20) | YES |  |

## [dbo].[NPI_MATERIALCERT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_materialcert_id` | nvarchar(72) | NO | 🔑 PK |
| `npi_lot_id` | nvarchar(72) | NO |  |
| `component` | nvarchar(100) | NO |  |
| `description` | nvarchar(200) | NO |  |
| `required_data` | nvarchar(200) | NO |  |
| `judgement` | bit | NO |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[NPI_NOISECAT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_noisecat_id` | nvarchar(72) | NO | 🔑 PK |
| `npi_lot_id` | nvarchar(72) | NO |  |
| `partnoisecategory_name` | nvarchar(100) | NO |  |
| `std_min` | decimal | NO |  |
| `std_max` | decimal | NO |  |
| `actual_min` | decimal | YES |  |
| `actual_max` | decimal | YES |  |
| `cpk` | decimal | YES |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[NPI_VISUALCAT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `npi_visualcat_id` | nvarchar(72) | NO | 🔑 PK |
| `npi_lot_id` | nvarchar(72) | NO |  |
| `defectclass_id` | nvarchar(72) | NO |  |
| `defect_id` | nvarchar(72) | NO |  |
| `quantity` | int | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[OGI]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ogi_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(60) | NO |  |
| `upload_date` | datetime | NO |  |
| `incharge_id` | nvarchar(72) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(400) | YES |  |
| `submit_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[OGI_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ogi_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `ogi_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(30) | YES |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[OGI_ATTACHMENT_BACKUP]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ogi_attachment_id` | nvarchar(72) | NO |  |
| `ogi_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(30) | YES |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[OGI_backup]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ogi_id` | nvarchar(72) | NO |  |
| `control_no` | nvarchar(60) | NO |  |
| `upload_date` | datetime | NO |  |
| `incharge_id` | nvarchar(72) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(400) | YES |  |
| `submit_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[OGI_LOTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ogi_lot_id` | nvarchar(72) | NO | 🔑 PK |
| `ogi_id` | nvarchar(72) | NO |  |
| `lot_no` | nvarchar(100) | NO |  |
| `invoice_no` | nvarchar(100) | NO |  |
| `lot_size` | int | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[OGI_LOTS_BACKUP]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ogi_lot_id` | nvarchar(72) | NO |  |
| `ogi_id` | nvarchar(72) | NO |  |
| `lot_no` | nvarchar(100) | NO |  |
| `invoice_no` | nvarchar(100) | NO |  |
| `lot_size` | int | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[PARTCLASS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `partclass_id` | nvarchar(72) | NO | 🔑 PK |
| `partclass_name` | nvarchar(100) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `partclass_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[PARTCLASSCATEGORIES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `Category_ID` | nvarchar(72) | NO | 🔑 PK |
| `Category_name` | nvarchar(200) | NO |  |
| `Category_desc` | nvarchar(200) | YES |  |
| `Partclass_id` | nvarchar(72) | NO |  |
| `Active_flag` | bit | NO |  |
| `Last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[PARTDATACATEGORIES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `partdatacategory_id` | nvarchar(72) | NO | 🔑 PK |
| `partdatacategory_name` | nvarchar(100) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `minimum` | decimal | NO |  |
| `maximum` | decimal | NO |  |
| `partdatacategory_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[PARTDIMENSIONCATEGORIES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `partdimensioncategory_id` | nvarchar(72) | NO | 🔑 PK |
| `partdimensioncategory_name` | nvarchar(100) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `minimum` | decimal | NO |  |
| `maximum` | decimal | NO |  |
| `partdimensioncategory_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[PARTNOISECATEGORIES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `partnoisecategory_id` | nvarchar(72) | NO | 🔑 PK |
| `partnoisecategory_name` | nvarchar(100) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `minimum` | decimal | NO |  |
| `maximum` | decimal | NO |  |
| `partnoisecategory_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[PARTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `part_id` | nvarchar(72) | NO | 🔑 PK |
| `part_code` | nvarchar(100) | NO |  |
| `part_name` | nvarchar(100) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `part_desc` | nvarchar(1000) | YES |  |
| `partclass_id` | nvarchar(72) | NO |  |
| `parttype_id` | nvarchar(72) | NO |  |
| `aql_id` | nvarchar(72) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |
| `Attribute1` | nvarchar(200) | YES |  |
| `Attribute2` | nvarchar(200) | YES |  |
| `Attribute3` | nvarchar(200) | YES |  |
| `Attribute4` | nvarchar(100) | YES |  |

## [dbo].[PARTSUPPLIERS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `partsupplier_id` | nvarchar(72) | NO | 🔑 PK |
| `part_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[PARTTYPES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `parttype_id` | nvarchar(72) | NO | 🔑 PK |
| `parttype_name` | nvarchar(100) | NO |  |
| `parttype_desc` | nvarchar(200) | YES |  |
| `parttype_code` | nvarchar(100) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[PICTURE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO |  |
| `PictureID` | varchar(50) | NO | 🔑 PK |
| `EmpNo` | varchar(50) | NO |  |
| `EmpLastName` | varchar(50) | NO |  |
| `EmpFirstName` | varchar(50) | NO |  |
| `EmpMiddleName` | varchar(50) | NO |  |
| `EmpPicture` | image | YES |  |
| `MfgSite` | varchar(50) | NO |  |
| `Department` | varchar(200) | NO |  |
| `Section` | varchar(200) | NO |  |
| `CreateDate` | datetime | NO |  |
| `UpdateDate` | datetime | NO |  |
| `CreateBy` | varchar(50) | NO |  |
| `Attribute1` | varchar(50) | YES |  |
| `Attribute2` | varchar(50) | YES |  |

## [dbo].[PRODUCTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `product_id` | nvarchar(72) | NO | 🔑 PK |
| `product_name` | nvarchar(100) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `product_desc` | nvarchar(200) | YES |  |
| `product_code` | nvarchar(100) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[QMQA]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_audit_plan_id` | nvarchar(72) | NO |  |
| `created_date` | datetime | NO |  |
| `audit_type_id` | nvarchar(72) | NO |  |
| `attention_id` | nvarchar(72) | YES |  |
| `pic_auditor_id` | nvarchar(72) | YES |  |
| `due_date` | datetime | YES |  |
| `audit_date` | date | NO |  |
| `issued_date` | datetime | YES |  |
| `audit_rating` | decimal | YES |  |
| `auditees` | nvarchar(4000) | YES |  |
| `auditors` | nvarchar(4000) | YES |  |
| `attendees` | nvarchar(4000) | YES |  |
| `remarks` | nvarchar(2000) | YES |  |
| `encoder_id` | nvarchar(72) | NO |  |
| `encoder_date` | datetime | NO |  |
| `issuer_id` | nvarchar(72) | NO |  |
| `issuer_remarks` | nvarchar(2000) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[QMQA_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[QMQA_AUDIT_PLAN]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_audit_plan_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(60) | NO |  |
| `created_date` | datetime | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `audit_category_id` | nvarchar(72) | NO |  |
| `audit_plan_date` | date | NO |  |
| `sqe_pic_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[QMQA_CC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_cc_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[QMQA_PLAN_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_plan_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[QMQA_RESPONSE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_response_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_id` | nvarchar(72) | NO |  |
| `skip_initial` | bit | YES |  |
| `initial_report_date` | datetime | YES |  |
| `final_report_date` | datetime | YES |  |
| `initial_remarks` | nvarchar(2000) | YES |  |
| `final_remarks` | nvarchar(2000) | YES |  |
| `issuer_remarks` | nvarchar(2000) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |
| `accept_date` | datetime | YES |  |
| `remarks` | nvarchar(2000) | YES |  |
| `verification_remarks` | nvarchar(2000) | YES |  |

## [dbo].[QMQA_RESPONSE_FINAL]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_response_final_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[QMQA_RESPONSE_INITIAL]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_response_initial_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[QMQA_RESPONSE_VERIFICATION]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `qmqa_response_verification_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `qmqa_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[REGISTRATIONS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `registration_id` | nvarchar(72) | NO | 🔑 PK |
| `confirmation_code` | nvarchar(20) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `confirmed` | bit | NO |  |
| `confirmation_date` | datetime | YES |  |
| `active_flag` | bit | NO |  |
| `updateby` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `registration_type` | int | YES |  |

## [dbo].[ROLE_ACCESS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `roleaccess_id` | nvarchar(72) | NO | 🔑 PK |
| `roleaccess_desc` | nvarchar(200) | NO |  |
| `role_id` | nvarchar(72) | NO |  |
| `form_id` | nvarchar(72) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |
| `can_viewlist` | bit | NO |  |
| `can_view` | bit | NO |  |
| `can_add` | bit | NO |  |
| `can_edit` | bit | NO |  |
| `can_delete` | bit | NO |  |
| `can_approve` | bit | NO |  |
| `can_check` | bit | NO |  |
| `can_print` | bit | NO |  |
| `can_export` | bit | NO |  |
| `per_site` | bit | NO |  |
| `can_attach` | bit | NO |  |
| `pic` | bit | NO |  |
| `registration_notify` | bit | YES |  |
| `maintenance_notify` | bit | YES |  |
| `transaction_notify` | bit | YES |  |
| `per_supplier` | bit | YES |  |
| `can_response` | bit | YES |  |
| `multiple_approval` | bit | YES |  |

## [dbo].[ROLES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `role_id` | nvarchar(72) | NO | 🔑 PK |
| `role_name` | nvarchar(100) | NO |  |
| `role_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SEVERITY]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `severity_id` | nvarchar(72) | NO | 🔑 PK |
| `severity_name` | nvarchar(100) | NO |  |
| `severity_desc` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SFR]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(20) | NO |  |
| `registration_date` | datetime | YES |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `attention_id` | nvarchar(72) | NO |  |
| `frequency_id` | int | YES |  |
| `fiscal_year` | int | NO |  |
| `semester` | int | YES |  |
| `issued_date` | datetime | YES |  |
| `due_date` | datetime | YES |  |
| `model_id` | nvarchar(72) | YES |  |
| `revision` | int | YES |  |
| `remarks` | nvarchar(2000) | YES |  |
| `main_document_remarks` | nvarchar(2000) | YES |  |
| `appendix_sheet_remarks` | nvarchar(2000) | YES |  |
| `encoder_id` | nvarchar(72) | NO |  |
| `encoder_date` | datetime | NO |  |
| `issuer_id` | nvarchar(72) | NO |  |
| `issuer_remarks` | nvarchar(2000) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SFR_APPENDIX]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_appendix_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SFR_CC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_cc_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SFR_DOCUMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_document_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SFR_RESPONSE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_response_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_id` | nvarchar(72) | NO |  |
| `response_date` | datetime | NO |  |
| `main_document_remarks` | nvarchar(2000) | YES |  |
| `appendix_sheet_remarks` | nvarchar(2000) | YES |  |
| `closure_remarks` | nvarchar(2000) | YES |  |
| `issuer_remarks` | nvarchar(2000) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `remarks` | nvarchar(2000) | YES |  |
| `accept_date` | datetime | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SFR_RESPONSE_APPENDIX]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_response_appendix_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_response_appendix_id` | nvarchar(72) | NO |  |
| `sfr_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SFR_RESPONSE_CLOSURE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_response_closure_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SFR_RESPONSE_DOCUMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_response_document_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SFR_STATUS_REMARKS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sfr_status_remarks_id` | nvarchar(72) | NO | 🔑 PK |
| `sfr_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `remarks_by_id` | nvarchar(72) | NO |  |
| `remarks_date` | datetime | NO |  |

## [dbo].[SPC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `spc_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(60) | NO |  |
| `upload_date` | datetime | NO |  |
| `incharge_id` | nvarchar(72) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(400) | YES |  |
| `submit_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SPC_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `spc_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `spc_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(30) | YES |  |
| `remarks` | nvarchar(200) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SPC_LOTS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `spc_lot_id` | nvarchar(72) | NO | 🔑 PK |
| `spc_id` | nvarchar(72) | NO |  |
| `lot_no` | nvarchar(100) | NO |  |
| `invoice_no` | nvarchar(100) | NO |  |
| `lot_size` | int | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[spt_fallback_db]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `xserver_name` | varchar(30) | NO |  |
| `xdttm_ins` | datetime | NO |  |
| `xdttm_last_ins_upd` | datetime | NO |  |
| `xfallback_dbid` | smallint | YES |  |
| `name` | varchar(30) | NO |  |
| `dbid` | smallint | NO |  |
| `status` | smallint | NO |  |
| `version` | smallint | NO |  |

## [dbo].[spt_fallback_dev]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `xserver_name` | varchar(30) | NO |  |
| `xdttm_ins` | datetime | NO |  |
| `xdttm_last_ins_upd` | datetime | NO |  |
| `xfallback_low` | int | YES |  |
| `xfallback_drive` | char | YES |  |
| `low` | int | NO |  |
| `high` | int | NO |  |
| `status` | smallint | NO |  |
| `name` | varchar(30) | NO |  |
| `phyname` | varchar(127) | NO |  |

## [dbo].[spt_fallback_usg]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `xserver_name` | varchar(30) | NO |  |
| `xdttm_ins` | datetime | NO |  |
| `xdttm_last_ins_upd` | datetime | NO |  |
| `xfallback_vstart` | int | YES |  |
| `dbid` | smallint | NO |  |
| `segmap` | int | NO |  |
| `lstart` | int | NO |  |
| `sizepg` | int | NO |  |
| `vstart` | int | NO |  |

## [dbo].[spt_monitor]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `lastrun` | datetime | NO |  |
| `cpu_busy` | int | NO |  |
| `io_busy` | int | NO |  |
| `idle` | int | NO |  |
| `pack_received` | int | NO |  |
| `pack_sent` | int | NO |  |
| `connections` | int | NO |  |
| `pack_errors` | int | NO |  |
| `total_read` | int | NO |  |
| `total_write` | int | NO |  |
| `total_errors` | int | NO |  |

## [dbo].[SQE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqe_id` | nvarchar(72) | NO | 🔑 PK |
| `employee_no` | nvarchar(100) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `group_id` | nvarchar(72) | NO |  |
| `training_program_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQE_ADDITIONAL_TRAINING]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqe_additional_training_id` | nvarchar(72) | NO | 🔑 PK |
| `sqe_training_id_reference` | nvarchar(72) | YES |  |
| `sqe_id` | nvarchar(72) | NO |  |
| `training_name` | nvarchar(100) | NO |  |
| `from_date` | date | NO |  |
| `to_date` | date | NO |  |
| `status` | nvarchar(20) | YES |  |
| `trainer` | nvarchar(200) | NO |  |
| `institution` | nvarchar(200) | NO |  |
| `certificate_id` | nvarchar(72) | YES |  |
| `certificate_name` | nvarchar(200) | YES |  |
| `certificate_extension` | nvarchar(20) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQE_TRAINING]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqe_training_id` | nvarchar(72) | NO | 🔑 PK |
| `sqe_id` | nvarchar(72) | NO |  |
| `training_id` | nvarchar(72) | NO |  |
| `from_date` | date | YES |  |
| `to_date` | date | YES |  |
| `status` | nvarchar(20) | YES |  |
| `trainer` | nvarchar(200) | YES |  |
| `institution` | nvarchar(200) | YES |  |
| `certificate_id` | nvarchar(72) | YES |  |
| `certificate_name` | nvarchar(200) | YES |  |
| `certificate_extension` | nvarchar(20) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQE_TRAINING_ATTENDEES]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqe_training_attendees_id` | nvarchar(72) | NO | 🔑 PK |
| `sqe_training_schedule_id` | nvarchar(72) | NO |  |
| `employee_no` | nvarchar(100) | NO |  |
| `status` | nvarchar(20) | YES |  |
| `remarks` | nvarchar(4000) | YES |  |

## [dbo].[SQE_TRAINING_LEVEL]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO |  |
| `levelId` | nvarchar(72) | NO |  |
| `TrainingLevel` | varchar(100) | NO |  |
| `active_flag` | bit | NO |  |
| `updatedby` | varchar(100) | NO |  |
| `updateddate` | datetime | NO |  |
| `attrib1` | varchar(50) | YES |  |

## [dbo].[SQE_TRAINING_SCHEDULE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqe_training_schedule_id` | nvarchar(72) | NO | 🔑 PK |
| `training_name` | nvarchar(100) | NO |  |
| `training_date` | date | NO |  |
| `room` | nvarchar(100) | NO |  |
| `start_time` | int | NO |  |
| `end_time` | int | NO |  |
| `status` | nvarchar(20) | YES |  |
| `remarks` | nvarchar(4000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(40) | NO |  |
| `registration_date` | datetime | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `attention_id` | nvarchar(72) | NO |  |
| `fiscal_year` | int | NO |  |
| `semester` | int | NO |  |
| `issued_date` | datetime | YES |  |
| `due_date` | datetime | NO |  |
| `model_id` | nvarchar(72) | NO |  |
| `revision` | int | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `main_document_remarks` | nvarchar(2000) | YES |  |
| `appendix_sheet_remarks` | nvarchar(2000) | YES |  |
| `encoder_id` | nvarchar(72) | NO |  |
| `encoder_date` | datetime | NO |  |
| `issuer_id` | nvarchar(72) | NO |  |
| `issuer_remarks` | nvarchar(2000) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_APPENDIX]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_appendix_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_CC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_cc_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_DOCUMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_document_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_RESPONSE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_response_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_id` | nvarchar(72) | NO |  |
| `response_date` | datetime | NO |  |
| `main_document_remarks` | nvarchar(2000) | YES |  |
| `appendix_sheet_remarks` | nvarchar(2000) | YES |  |
| `closure_remarks` | nvarchar(2000) | YES |  |
| `issuer_remarks` | nvarchar(2000) | YES |  |
| `issuer_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `remarks` | nvarchar(2000) | YES |  |
| `accept_date` | datetime | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_RESPONSE_APPENDIX]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_response_appendix_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_response_appendix_id` | nvarchar(72) | NO |  |
| `sqmp_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_RESPONSE_CLOSURE]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_response_closure_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_RESPONSE_DOCUMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_response_document_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_response_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQMP_STATUS_REMARKS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqmp_status_remarks_id` | nvarchar(72) | NO | 🔑 PK |
| `sqmp_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `remarks_by_id` | nvarchar(72) | NO |  |
| `remarks_date` | datetime | NO |  |

## [dbo].[SQPR]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(60) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `fiscal_year` | int | NO |  |
| `report_type` | int | NO |  |
| `month` | int | NO |  |
| `file_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(200) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `date_created` | datetime | NO |  |
| `incharge_id` | nvarchar(72) | NO |  |
| `incharge_remarks` | nvarchar(2000) | YES |  |
| `submit_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQPR_ATTACHMENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_attachment_id` | nvarchar(72) | NO | 🔑 PK |
| `sqpr_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(220) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SQPR_CC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_cc_id` | nvarchar(72) | NO | 🔑 PK |
| `sqpr_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQPR_CUSTOMER_CLAIM]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_customer_claim_id` | nvarchar(72) | NO | 🔑 PK |
| `sqpr_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `customer_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQPR_DETAIL]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_detail_id` | nvarchar(72) | NO | 🔑 PK |
| `sqpr_id` | nvarchar(72) | NO |  |
| `detail_type` | int | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `value` | decimal | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |
| `Is_percentage` | bit | YES |  |

## [dbo].[SQPR_LAR]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_lar_id` | nvarchar(72) | NO | 🔑 PK |
| `control_no` | nvarchar(60) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `fiscal_year` | int | NO |  |
| `report_type` | int | NO |  |
| `month` | int | NO |  |
| `file_id` | nvarchar(72) | NO |  |
| `file_name` | nvarchar(200) | NO |  |
| `file_extension` | nvarchar(20) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `date_created` | datetime | NO |  |
| `worst_lar_remarks` | nvarchar(2000) | YES |  |
| `worst_dppm_remarks` | nvarchar(2000) | YES |  |
| `incharge_id` | nvarchar(72) | NO |  |
| `incharge_remarks` | nvarchar(2000) | YES |  |
| `submit_date` | datetime | YES |  |
| `checker_id` | nvarchar(72) | YES |  |
| `checker_remarks` | nvarchar(2000) | YES |  |
| `checker_date` | datetime | YES |  |
| `approver_id` | nvarchar(72) | YES |  |
| `approver_remarks` | nvarchar(2000) | YES |  |
| `approver_date` | datetime | YES |  |
| `request_status` | nvarchar(4) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQPR_LAR_CC]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_lar_cc_id` | nvarchar(72) | NO | 🔑 PK |
| `sqpr_lar_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQPR_LAR_DETAIL]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_lar_detail_id` | nvarchar(72) | NO | 🔑 PK |
| `sqpr_lar_id` | nvarchar(72) | NO |  |
| `detail_type` | int | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `value` | decimal | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SQPR_QUALITY_RISK]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `sqpr_quality_risk_id` | nvarchar(72) | NO | 🔑 PK |
| `sqpr_id` | nvarchar(72) | NO |  |
| `supplier_id` | nvarchar(72) | NO |  |
| `part_id` | nvarchar(72) | NO |  |
| `remarks` | nvarchar(2000) | YES |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SUPPLIER_INFORMATION]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `supplier_information_id` | nvarchar(72) | NO | 🔑 PK |
| `supplier_id` | nvarchar(72) | NO |  |
| `first_name` | nvarchar(100) | NO |  |
| `middle_name` | nvarchar(100) | NO |  |
| `last_name` | nvarchar(100) | NO |  |
| `supplier_information_desc` | nvarchar(2000) | YES |  |
| `attachment_id` | nvarchar(72) | NO |  |
| `attachment_name` | nvarchar(200) | NO |  |
| `attachment_extension` | nvarchar(20) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[SUPPLIERCERTIFICATIONS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `suppliercertification_id` | nvarchar(72) | NO | 🔑 PK |
| `supplier_id` | nvarchar(72) | NO |  |
| `certification_id` | nvarchar(72) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SUPPLIEROGIRECIPIENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `supplier_ogirecipient_id` | nvarchar(72) | NO | 🔑 PK |
| `supplier_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SUPPLIERS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `supplier_id` | nvarchar(72) | NO | 🔑 PK |
| `supplier_name` | nvarchar(200) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `supplier_desc` | nvarchar(400) | YES |  |
| `location` | nvarchar(200) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SUPPLIERSPCRECIPIENT]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `supplier_spcrecipient_id` | nvarchar(72) | NO | 🔑 PK |
| `supplier_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(72) | NO |  |

## [dbo].[SUPPLIERSUSER]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `Id` | nvarchar(72) | NO | 🔑 PK |
| `supplier_id` | nvarchar(72) | NO |  |
| `user_id` | nvarchar(72) | NO |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updatedby` | nvarchar(100) | NO |  |

## [dbo].[TBL_5M1E_ActionItems]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ControlNo` | varchar(50) | YES |  |
| `ActionItem` | text | YES |  |
| `FirstTargetDt` | varchar(50) | YES |  |
| `SecondTargetDt` | varchar(50) | YES |  |
| `ThirdTargetDt` | varchar(50) | YES |  |
| `PIC` | varchar(50) | YES |  |
| `PICName` | varchar(100) | YES |  |
| `VerificationResult` | varchar(50) | YES |  |
| `Remarks` | text | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `Attribute01` | nvarchar(500) | YES |  |
| `Attribute02` | nvarchar(500) | YES |  |
| `Attribute03` | nvarchar(500) | YES |  |
| `Attribute04` | nvarchar(500) | YES |  |
| `Attribute05` | nvarchar(500) | YES |  |

## [dbo].[TBL_5M1E_AI_Attachment]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ChkItemID` | int | NO |  |
| `FileName` | varchar(255) | NO |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |
| `attribute3` | nvarchar(500) | YES |  |
| `attribute4` | nvarchar(500) | YES |  |
| `attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_5M1E_Application]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ControlNo` | varchar(50) | YES |  |
| `Title` | varchar(255) | NO |  |
| `SupplierID` | varchar(36) | YES |  |
| `SupplierCN` | varchar(50) | NO |  |
| `VendorID` | nvarchar(72) | NO |  |
| `ItemID` | nvarchar(100) | NO |  |
| `SiteID` | nvarchar(72) | YES |  |
| `CommodityID` | nvarchar(72) | YES |  |
| `ModelID` | nvarchar(72) | YES |  |
| `EngineerRemarks` | text | YES |  |
| `ReportNo` | varchar(50) | YES |  |
| `DateRegister` | datetime | YES |  |
| `Class` | nvarchar(72) | YES |  |
| `ClassType` | nvarchar(72) | YES |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | NO |  |
| `ImpactDate` | varchar(250) | NO |  |
| `Attribute10` | varchar(250) | YES |  |
| `Attribute09` | varchar(250) | YES |  |
| `Attribute08` | varchar(250) | YES |  |
| `Attribute07` | varchar(250) | YES |  |
| `Attribute06` | varchar(250) | YES |  |
| `Attribute05` | varchar(250) | YES |  |
| `Attribute04` | varchar(250) | YES |  |
| `Attribute03` | varchar(250) | YES |  |
| `Attribute02` | varchar(250) | YES |  |
| `Attribute01` | varchar(250) | YES |  |

## [dbo].[TBL_5M1E_Approval]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ControlNo` | varchar(50) | NO |  |
| `MPDPIC` | varchar(40) | YES |  |
| `MPDChecker` | varchar(20) | YES |  |
| `MPDCheckerName` | varchar(100) | YES |  |
| `MPDCheckerStatus` | bit | YES |  |
| `MPDChkrDtAprd` | varchar(50) | YES |  |
| `MPDApprover` | varchar(36) | YES |  |
| `MPDApproverName` | varchar(100) | YES |  |
| `MPDApproverStatus` | bit | YES |  |
| `MPDAprDtAprd` | varchar(50) | YES |  |
| `HDEPIC` | varchar(50) | YES |  |
| `Reviewer` | varchar(36) | YES |  |
| `ReviewerName` | varchar(100) | YES |  |
| `ReviewerStatus` | bit | YES |  |
| `IssueDate` | varchar(50) | YES |  |
| `Checker` | varchar(36) | YES |  |
| `CheckerName` | varchar(100) | YES |  |
| `ChkrDtAprd` | varchar(50) | YES |  |
| `ChkrStatus` | nvarchar(100) | YES |  |
| `Approver` | varchar(36) | YES |  |
| `ApproverName` | varchar(100) | YES |  |
| `ApproverDtAprd` | varchar(50) | YES |  |
| `AprStatus` | nvarchar(100) | YES |  |
| `FinalApprover` | varchar(36) | YES |  |
| `FAName` | varchar(100) | YES |  |
| `FADtAprd` | nvarchar(100) | YES |  |
| `FAStatus` | varchar(50) | YES |  |
| `ApprovalSeq` | int | YES |  |
| `Status` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `DSCheckerNecessary` | varchar(3) | NO |  |
| `DesignCheckerID` | varchar(40) | YES |  |
| `DesignCheckerName` | varchar(250) | YES |  |
| `DesignCheckerStatus` | bit | YES |  |
| `DesignCheckerDtAprd` | varchar(250) | YES |  |
| `DSAppproverNecessary` | varchar(3) | NO |  |
| `DesignApproverID` | varchar(40) | YES |  |
| `DesignApproverName` | varchar(250) | YES |  |
| `DesignApproverStatus` | bit | YES |  |
| `DesignApproverDtAprd` | varchar(250) | YES |  |
| `EnviCheckerNecessary` | varchar(3) | NO |  |
| `EnviCheckerID` | varchar(40) | YES |  |
| `EnviCheckerName` | varchar(250) | YES |  |
| `EnviCheckerStatus` | bit | YES |  |
| `EnviCheckerDtAprd` | varchar(40) | YES |  |
| `EnviAppproverNecessary` | varchar(3) | NO |  |
| `EnviApproverID` | varchar(40) | YES |  |
| `EnviApproveName` | nvarchar(500) | YES |  |
| `EnviApproveStatus` | bit | YES |  |
| `EnviApproveDtAprd` | nvarchar(500) | YES |  |
| `QACheckerID` | nvarchar(100) | YES |  |
| `QACheckerName` | nvarchar(500) | YES |  |
| `QACheckerStatus` | bit | YES |  |
| `QACheckerDtAprd` | nvarchar(100) | YES |  |
| `RevisedSequence` | int | YES |  |
| `CR` | varchar(3) | YES |  |
| `EvaluationIC` | varchar(36) | YES |  |
| `EvaluationICName` | varchar(100) | YES |  |
| `EvaluationICDtAprd` | varchar(50) | YES |  |
| `EvaluationICStatus` | bit | YES |  |
| `RejectedBy` | varchar(50) | YES |  |
| `RejectedDate` | varchar(50) | YES |  |

## [dbo].[TBL_5M1E_Attachment]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ControlNo` | varchar(50) | NO |  |
| `FileName` | varchar(255) | NO |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `Attribute1` | nvarchar(500) | YES |  |
| `Attribute2` | nvarchar(500) | YES |  |
| `Attribute3` | nvarchar(500) | YES |  |
| `Attribute4` | nvarchar(500) | YES |  |
| `Attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_5M1E_CheckItems]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ControlNo` | varchar(50) | NO |  |
| `CheckItem` | varchar(255) | NO |  |
| `Judgement` | varchar(20) | NO |  |
| `Remarks` | text | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `Attribute1` | nvarchar(500) | YES |  |
| `Attribute2` | nvarchar(500) | YES |  |
| `Attribute3` | nvarchar(500) | YES |  |
| `Attribute4` | nvarchar(500) | YES |  |
| `Attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_5M1E_CI_Attachment]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ChkItemID` | int | NO |  |
| `FileName` | varchar(255) | NO |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |
| `attribute3` | nvarchar(500) | YES |  |
| `attribute4` | nvarchar(500) | YES |  |
| `attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_5M1E_EmailDailyNotification]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | nvarchar(72) | NO | 🔑 PK |
| `ControlNo` | nvarchar(100) | NO |  |
| `MPDPICstatus` | bit | YES |  |
| `HDEPICstatus` | bit | YES |  |
| `StartDate` | datetime | YES |  |
| `FinalApproverStatus` | bit | YES |  |

## [dbo].[TBL_5M1E_EmailElements]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ElementID` | int | NO |  |
| `ElementName` | varchar(200) | NO |  |
| `ElementValue` | varchar(MAX) | NO |  |
| `Attribute1` | varchar(100) | NO |  |
| `Attribute2` | varchar(100) | NO |  |
| `Attribute3` | varchar(100) | NO |  |

## [dbo].[TBL_5M1E_PartsPerReport]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `TagID` | int | NO |  |
| `PartsTag` | varchar(50) | NO |  |
| `part_id` | varchar(150) | NO |  |
| `DateAdded` | datetime | NO |  |

## [dbo].[TBL_5M1E_Status_Remarks]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ControlNo` | varchar(50) | NO |  |
| `Remarks` | text | YES |  |
| `RemarkBy` | varchar(100) | NO |  |
| `Status` | varchar(50) | NO |  |
| `CreateDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |
| `attribute3` | nvarchar(500) | YES |  |
| `attribute4` | nvarchar(500) | YES |  |
| `attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_Auto_Prompt_Email]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `SequenceName` | varchar(20) | NO |  |
| `Email` | varchar(100) | NO |  |
| `ModifiedDate` | datetime | YES |  |
| `CreateDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |

## [dbo].[TBL_Class]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `Class` | varchar(50) | NO |  |
| `IsActive` | bit | YES |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |
| `attribute3` | nvarchar(500) | YES |  |
| `attribute4` | nvarchar(500) | YES |  |
| `attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_Class_Category]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ClassID` | int | NO |  |
| `Category` | varchar(255) | NO |  |
| `IsActive` | bit | YES |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |
| `attribute3` | nvarchar(500) | YES |  |
| `attribute4` | nvarchar(500) | YES |  |
| `attribute5` | nvarchar(500) | YES |  |

## [dbo].[tbl_Class_EvaluationRank]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `Id` | int | NO | 🔑 PK |
| `EvaluationRank` | nvarchar(2) | NO |  |
| `CreateDate` | datetime | NO |  |
| `ModifiedDate` | datetime | NO |  |

## [dbo].[TBL_Commodity]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `Commodity` | varchar(50) | NO |  |
| `IsActive` | bit | NO |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |

## [dbo].[TBL_Items]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `ItemCode` | varchar(50) | NO |  |
| `ItemName` | varchar(100) | NO |  |
| `IsActive` | bit | YES |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |

## [dbo].[TBL_Local_Admin]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `EmpNo` | varchar(50) | NO |  |
| `EmpName` | varchar(100) | NO |  |
| `PositionCode` | varchar(50) | NO |  |
| `DepCode` | varchar(50) | NO |  |
| `Department` | varchar(100) | NO |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |
| `attribute3` | nvarchar(500) | YES |  |
| `attribute4` | nvarchar(500) | YES |  |
| `attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_Model]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `Model` | varchar(50) | NO |  |
| `IsActive` | bit | NO |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |

## [dbo].[TBL_Predefined_Parameters]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `Code` | varchar(50) | NO |  |
| `Value` | varchar(255) | NO |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |

## [dbo].[TBL_Roles]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `RoleName` | varchar(50) | NO |  |
| `RoleDesc` | varchar(100) | NO |  |
| `RoleCode` | varchar(20) | YES |  |
| `IsActive` | bit | NO |  |
| `CreateDate` | datetime | NO |  |
| `ModifiedDate` | datetime | NO |  |
| `Attribute1` | nvarchar(500) | YES |  |
| `Attribute2` | nvarchar(500) | YES |  |
| `Attribute3` | nvarchar(500) | YES |  |
| `Attribute4` | nvarchar(500) | YES |  |
| `Attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_Site]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `SiteName` | varchar(50) | NO |  |
| `IsActive` | bit | NO |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `Attribute1` | nvarchar(500) | YES |  |
| `Attribute2` | nvarchar(500) | YES |  |
| `Attribute3` | nvarchar(500) | YES |  |

## [dbo].[TBL_Suppliers]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `SupplierName` | varchar(100) | NO |  |
| `Location` | varchar(100) | YES |  |
| `IsActive` | bit | NO |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | NO |  |
| `ModifiedDate` | datetime | NO |  |
| `Attribute1` | nvarchar(500) | YES |  |
| `Attribute2` | nvarchar(500) | YES |  |
| `Attribute3` | nvarchar(500) | YES |  |
| `Attribute4` | nvarchar(500) | YES |  |
| `Attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_UserMaintenance]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `EmpNo` | nvarchar(100) | NO |  |
| `EmpName` | nvarchar(200) | NO |  |
| `PositionCode` | nvarchar(100) | NO |  |
| `DepCode` | nvarchar(100) | NO |  |
| `Department` | nvarchar(100) | NO |  |
| `Password` | nvarchar(100) | NO |  |
| `UserID` | nvarchar(100) | NO |  |
| `LastPwdChange` | datetime | YES |  |
| `Confirmed` | bit | NO |  |
| `IsActive` | bit | NO |  |
| `ConfirmationTicket` | nvarchar(100) | YES |  |
| `Email` | nvarchar(100) | NO |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `attribute1` | nvarchar(500) | YES |  |
| `attribute2` | nvarchar(500) | YES |  |
| `attribute3` | nvarchar(500) | YES |  |
| `attribute4` | nvarchar(500) | YES |  |
| `attribute5` | nvarchar(500) | YES |  |

## [dbo].[TBL_Users]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `Name` | varchar(100) | NO |  |
| `Email` | varchar(100) | NO |  |
| `Password` | varchar(100) | NO |  |
| `RoleID` | int | YES |  |
| `SupplierID` | int | YES |  |
| `ConfirmationTicket` | varchar(255) | YES |  |
| `Confirmed` | bit | NO |  |
| `IsActive` | bit | NO |  |
| `LastPwdChange` | datetime | YES |  |
| `CreateDate` | datetime | NO |  |
| `ModifiedDate` | datetime | NO |  |
| `Attribute1` | nvarchar(500) | YES |  |
| `Attribute2` | nvarchar(500) | YES |  |
| `Attribute3` | nvarchar(500) | YES |  |
| `Attribute4` | nvarchar(500) | YES |  |
| `Attribute5` | nvarchar(500) | YES |  |
| `Attribute6` | nvarchar(500) | YES |  |
| `Attribute7` | nvarchar(500) | YES |  |
| `Attribute8` | nvarchar(500) | YES |  |
| `Attribute9` | nvarchar(500) | YES |  |
| `Attribute10` | nvarchar(500) | YES |  |
| `MustChangePassword` | bit | YES |  |

## [dbo].[TBL_Vendor]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `ID` | int | NO | 🔑 PK |
| `VendorName` | varchar(100) | NO |  |
| `IsActive` | bit | YES |  |
| `CreatedBy` | varchar(50) | YES |  |
| `CreateDate` | datetime | YES |  |
| `ModifiedDate` | datetime | YES |  |
| `Attribute1` | nvarchar(500) | YES |  |
| `Attribute2` | nvarchar(500) | YES |  |
| `Attribute3` | nvarchar(500) | YES |  |
| `Attribute4` | nvarchar(500) | YES |  |
| `Attribute5` | nvarchar(500) | YES |  |

## [dbo].[TRAINING_PROGRAMS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `training_program_id` | nvarchar(72) | NO | 🔑 PK |
| `training_program_name` | nvarchar(100) | NO |  |
| `training_program_desc` | nvarchar(2000) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[TRAININGS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `training_id` | nvarchar(72) | NO | 🔑 PK |
| `training_level` | nvarchar(4) | NO |  |
| `training_name` | nvarchar(100) | NO |  |
| `training_program_id` | nvarchar(72) | NO |  |
| `training_desc` | nvarchar(2000) | YES |  |
| `active_flag` | bit | NO |  |
| `last_update` | datetime | NO |  |
| `updateby` | nvarchar(100) | NO |  |

## [dbo].[USERS]

| Column | Type | Nullable | Key |
| :--- | :--- | :--- | :--- |
| `user_id` | nvarchar(72) | NO | 🔑 PK |
| `full_name` | nvarchar(200) | NO |  |
| `email` | nvarchar(200) | NO |  |
| `password` | nvarchar(400) | NO |  |
| `role_id` | nvarchar(72) | NO |  |
| `site_id` | nvarchar(72) | NO |  |
| `creation_date` | datetime | NO |  |
| `active_flag` | bit | YES |  |
| `last_pasword_change` | datetime | YES |  |
| `local_user` | bit | YES |  |
| `login_flag` | bit | YES |  |
| `last_update` | datetime | YES |  |
| `updateby` | nvarchar(72) | NO |  |
| `new_flag` | bit | YES |  |
| `change_pw` | bit | YES |  |
