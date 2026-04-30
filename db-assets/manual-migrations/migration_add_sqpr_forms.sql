-- Migration: Add SQPR Forms to FORMS table

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-13-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-13-01', '/sqpr/new', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-13-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-13-02', '/sqpr/draft', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-13-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-13-03', '/sqpr/approval', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-13-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-13-04', '/sqpr/approved', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-13-05')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-13-05', '/sqpr/rejected', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-13-06')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-13-06', '/sqpr/issued', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-13-07')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-13-07', '/sqpr/approval-alt', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-03-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-03-01', '/sqpr/draft-main', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-03-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-03-02', '/sqpr/approval-main', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-03-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-03-03', '/sqpr/rejected-main', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQPR-03-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQPR-03-04', '/sqpr/approved-main', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

-- SFR Forms (related to SQPR)
IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-01', '/sqpr/sfr/new', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-02', '/sqpr/sfr/draft', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-03', '/sqpr/sfr/approval', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-04', '/sqpr/sfr/approved', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-05')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-05', '/sqpr/sfr/rejected', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-06')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-06', '/sqpr/sfr/issued', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-08')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-08', '/sqpr/sfr/extra-1', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-09')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-09', '/sqpr/sfr/extra-2', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-10')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-10', '/sqpr/sfr/extra-3', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SFR-05-11')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SFR-05-11', '/sqpr/sfr/extra-4', 'SQPR Transaction', 1, 'SYSTEM', GETDATE());
END
GO
