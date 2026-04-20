-- Migration: Fix 5M1E approved-stage form routes in FORMS
-- These rows were previously pointing to the wrong frontend pages, which breaks
-- role-access assignment and page-to-form alignment for the approved queues.

UPDATE FORMS
SET form_url = '/dashboard/5m1e/approved',
    last_update = GETDATE(),
    updateby = 'SYSTEM'
WHERE form_name = '5M1EApprovalSecSQE-06-17'
  AND ISNULL(form_url, '') <> '/dashboard/5m1e/approved';

UPDATE FORMS
SET form_url = '/dashboard/5m1e/approvedwc',
    last_update = GETDATE(),
    updateby = 'SYSTEM'
WHERE form_name = '5M1EJudgementSec-06-17'
  AND ISNULL(form_url, '') <> '/dashboard/5m1e/approvedwc';

PRINT '5M1E approved-stage form routes fixed successfully';
