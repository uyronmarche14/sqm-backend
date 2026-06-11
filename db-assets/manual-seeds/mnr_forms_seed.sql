-- Seed MNR Forms (Correct Schema with form_url)

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-01', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/New', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-02')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-02', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Approval', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-03')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-03', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/SupplierResponse', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-04')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-04', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Review', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-05')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-05', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Closure', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-06')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-06', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Rejection', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-07')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-07', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Verification', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-08')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-08', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/8DReport', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-09')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-09', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/CostRecovery', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-10')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-10', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Appeal', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-11')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-11', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/FinalReview', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-12')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-12', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Cancellation', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = 'MNR-12-13')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), 'MNR-12-13', '/roles/admin_Dashboard/MNR/MNR_ACTIVITY/Admin', 'MNR Transaction', 1, 'SYSTEM', GETDATE());
END
