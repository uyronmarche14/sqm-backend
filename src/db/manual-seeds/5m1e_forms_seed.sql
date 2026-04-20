-- Seed 5M1E Forms
-- These form codes must match the keys in LEGACY_FORM_MAP (form-id-map.config.ts)

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EMAIN-11-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EMAIN-11-01', '/dashboard/5m1e/new', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1ESupplier_Submition')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1ESupplier_Submition', '/dashboard/5m1e/draft', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EApprovalSecDes-06-17')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EApprovalSecDes-06-17', '/dashboard/5m1e/submitted', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EApprovalSecEnvi-06-17')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EApprovalSecEnvi-06-17', '/dashboard/5m1e/f-approved', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EApprovalSecQA-06-17')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EApprovalSecQA-06-17', '/dashboard/5m1e/f-approved', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EApprovalSecSQE-06-17')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EApprovalSecSQE-06-17', '/dashboard/5m1e/approved', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EJudgementSec-06-17')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EJudgementSec-06-17', '/dashboard/5m1e/approvedwc', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1ERELEASE-06-17')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1ERELEASE-06-17', '/dashboard/5m1e/released', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1ERAR-06-17')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1ERAR-06-17', '/dashboard/5m1e/rar', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1ESEARCH-11-01')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1ESEARCH-11-01', '/dashboard/5m1e/search', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EJapanUser-06-07')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EJapanUser-06-07', '/dashboard/5m1e/new', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM FORMS WHERE form_name = '5M1EEvaluationIC-07-21')
BEGIN
    INSERT INTO FORMS (form_id, form_name, form_url, menu_group, active_flag, updateby, last_update) 
    VALUES (NEWID(), '5M1EEvaluationIC-07-21', '/dashboard/5m1e/f-approved', '5M1E Transaction', 1, 'SYSTEM', GETDATE());
END

PRINT '✅ 5M1E Forms seeded successfully';
