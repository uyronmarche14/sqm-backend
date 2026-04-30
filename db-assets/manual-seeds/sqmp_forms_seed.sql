-- Seed SQMP (SQM_PLAN) Forms

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-01', '/sqmp/new', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-02', '/sqmp/draft', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-03', '/sqmp/awaiting-approval', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-04', '/sqmp/approved', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-05')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-05', '/sqmp/issued', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-06')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-06', '/sqmp/response-awaiting', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-07')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-07', '/sqmp/response-awaiting-approval', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-08')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-08', '/sqmp/response-rejected', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-09')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-09', '/sqmp/closed', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-10')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-10', '/sqmp/cancelled', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-11')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-11', '/sqmp/rejected', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-12')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-12', '/sqmp/achievement', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-13')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-13', '/sqmp/search', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-09-14')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-09-14', '/sqmp/report', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

-- SQMP Section Forms
IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-SEC-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-SEC-01', '/sqmp/section/approval-cycle-1', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'SQMP-SEC-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'SQMP-SEC-02', '/sqmp/section/approval-cycle-2', 'SQMP Transaction', 1, 'SYSTEM', GETDATE());
END
GO
