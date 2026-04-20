-- Seed NPI (New Parts) Forms
-- These form codes must match the keys in LEGACY_FORM_MAP (form-id-map.config.ts)

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-09-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-09-01', '/dashboard/new-parts/new', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-09-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-09-02', '/dashboard/new-parts/draft', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-09-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-09-03', '/dashboard/new-parts/a-approval', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-09-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-09-04', '/dashboard/new-parts/rejected', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-09-05')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-09-05', '/dashboard/new-parts/search', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-09-06')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-09-06', '/dashboard/new-parts/lar-monitoring', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

-- NPI Sections (for granular permission control)
IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-01', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-02', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-03', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-04', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-05')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-05', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-06')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-06', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-07')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-07', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'NPILOT-SEC-08')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'NPILOT-SEC-08', '#', 'New Parts Transaction', 1, 'SYSTEM', GETDATE());
END

PRINT '✅ NPI Forms seeded successfully';
