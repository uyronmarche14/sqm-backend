-- Seed OGI Forms
-- These form codes must match the keys in LEGACY_FORM_MAP (form-id-map.config.ts)

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'OGI-UP-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'OGI-UP-01', '/dashboard/ogi-up/new', 'OGI Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'OGI-01-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'OGI-01-01', '/dashboard/ogi-up/new', 'OGI Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'OGI-01-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'OGI-01-02', '/dashboard/ogi-up/draft', 'OGI Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'OGI-01-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'OGI-01-03', '/dashboard/ogi-up/submitted', 'OGI Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'OGI-01-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'OGI-01-04', '/dashboard/ogi-up/search', 'OGI Transaction', 1, 'SYSTEM', GETDATE());
END

PRINT '✅ OGI Forms seeded successfully';
