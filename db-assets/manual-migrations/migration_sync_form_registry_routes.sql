/*
  Sync canonical FORMS URLs to the shared RBAC page registry.
  This keeps persisted metadata aligned with the real frontend destinations.
*/

UPDATE FORMS SET form_url = '/dashboard/5m1e/new' WHERE form_name = '5M1EMAIN-11-01';
UPDATE FORMS SET form_url = '/dashboard/5m1e/draft' WHERE form_name = '5M1ESupplier_Submition';
UPDATE FORMS SET form_url = '/dashboard/5m1e/submitted' WHERE form_name = '5M1EApprovalSecDes-06-17';
UPDATE FORMS SET form_url = '/dashboard/5m1e/fapproved' WHERE form_name IN ('5M1EApprovalSecEnvi-06-17', '5M1EApprovalSecQA-06-17', '5M1EEvaluationIC-07-21');
UPDATE FORMS SET form_url = '/dashboard/5m1e/approved' WHERE form_name = '5M1EApprovalSecSQE-06-17';
UPDATE FORMS SET form_url = '/dashboard/5m1e/approvedwc' WHERE form_name = '5M1EJudgementSec-06-17';
UPDATE FORMS SET form_url = '/dashboard/5m1e/rar' WHERE form_name = '5M1ERAR-06-17';
UPDATE FORMS SET form_url = '/dashboard/5m1e/released' WHERE form_name = '5M1ERELEASE-06-17';
UPDATE FORMS SET form_url = '/dashboard/5m1e/search' WHERE form_name = '5M1ESEARCH-11-01';

UPDATE FORMS SET form_url = '/dashboard/mnr/new' WHERE form_name = 'MNR-12-01';
UPDATE FORMS SET form_url = '/dashboard/mnr/draft' WHERE form_name = 'MNR-12-02';
UPDATE FORMS SET form_url = '/dashboard/mnr/aapproval' WHERE form_name = 'MNR-12-03';
UPDATE FORMS SET form_url = '/dashboard/mnr/rejected' WHERE form_name = 'MNR-12-04';
UPDATE FORMS SET form_url = '/dashboard/mnr/issued' WHERE form_name = 'MNR-12-06';
UPDATE FORMS SET form_url = '/dashboard/mnr/approved' WHERE form_name = 'MNR-12-07';
UPDATE FORMS SET form_url = '/dashboard/mnr/cancel' WHERE form_name = 'MNR-12-08';
UPDATE FORMS SET form_url = '/dashboard/mnr/report' WHERE form_name = 'MNR-12-09';
UPDATE FORMS SET form_url = '/dashboard/mnr/response-await-approval' WHERE form_name = 'MNR-12-10';
UPDATE FORMS SET form_url = '/dashboard/mnr/rrejected' WHERE form_name = 'MNR-12-11';
UPDATE FORMS SET form_url = '/dashboard/mnr/lot-tracking' WHERE form_name = 'MNR-12-12';
UPDATE FORMS SET form_url = '/dashboard/mnr/search' WHERE form_name = 'MNR-12-13';

UPDATE FORMS SET form_url = '/dashboard/new-parts/new' WHERE form_name = 'NPILOT-09-01';
UPDATE FORMS SET form_url = '/dashboard/new-parts/draft' WHERE form_name = 'NPILOT-09-02';
UPDATE FORMS SET form_url = '/dashboard/new-parts/aapproval' WHERE form_name = 'NPILOT-09-03';
UPDATE FORMS SET form_url = '/dashboard/new-parts/rejected' WHERE form_name = 'NPILOT-09-04';
UPDATE FORMS SET form_url = '/dashboard/new-parts/search' WHERE form_name = 'NPILOT-09-05';
UPDATE FORMS SET form_url = '/dashboard/new-parts/lot-tracking' WHERE form_name = 'NPILOT-09-06';

UPDATE FORMS SET form_url = '/dashboard/ogi-up/new' WHERE form_name = 'OGI-01-01';
UPDATE FORMS SET form_url = '/dashboard/ogi-up/draft' WHERE form_name = 'OGI-01-02';
UPDATE FORMS SET form_url = '/dashboard/ogi-up/submitted' WHERE form_name = 'OGI-01-03';
UPDATE FORMS SET form_url = '/dashboard/ogi-up/advanced-search' WHERE form_name = 'OGI-01-04';

UPDATE FORMS SET form_url = '/dashboard/sqm-plan/new' WHERE form_name = 'SQMP-09-01';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/draft' WHERE form_name = 'SQMP-09-02';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/aapproval' WHERE form_name = 'SQMP-09-03';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/approved' WHERE form_name = 'SQMP-09-04';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/issued' WHERE form_name = 'SQMP-09-05';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/response' WHERE form_name = 'SQMP-09-06';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/response-aapproval' WHERE form_name = 'SQMP-09-07';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/response-rejected' WHERE form_name = 'SQMP-09-08';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan' WHERE form_name = 'SQMP-09-09';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/cancel' WHERE form_name = 'SQMP-09-10';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/rejected' WHERE form_name = 'SQMP-09-11';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/achievement' WHERE form_name = 'SQMP-09-12';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/search' WHERE form_name = 'SQMP-09-13';
UPDATE FORMS SET form_url = '/dashboard/sqm-plan/reports' WHERE form_name = 'SQMP-09-14';

UPDATE FORMS SET form_url = '/dashboard/sqpr/draft' WHERE form_name = 'SQPR-03-01';
UPDATE FORMS SET form_url = '/dashboard/sqpr/aapproval' WHERE form_name = 'SQPR-03-02';
UPDATE FORMS SET form_url = '/dashboard/sqpr/rejected' WHERE form_name = 'SQPR-03-03';
UPDATE FORMS SET form_url = '/dashboard/sqpr/approved' WHERE form_name = 'SQPR-03-04';

UPDATE FORMS SET form_url = '/dashboard/qmqa/new' WHERE form_name = 'QMQA-05-01';
UPDATE FORMS SET form_url = '/dashboard/qmqa/draft' WHERE form_name = 'QMQA-05-02';
UPDATE FORMS SET form_url = '/dashboard/qmqa/awaiting-approval' WHERE form_name = 'QMQA-05-03';
UPDATE FORMS SET form_url = '/dashboard/qmqa/rejected' WHERE form_name = 'QMQA-05-04';
UPDATE FORMS SET form_url = '/dashboard/qmqa/issued' WHERE form_name = 'QMQA-05-05';
UPDATE FORMS SET form_url = '/dashboard/qmqa/approved' WHERE form_name = 'QMQA-05-06';
UPDATE FORMS SET form_url = '/dashboard/qmqa/cancel' WHERE form_name = 'QMQA-05-07';
UPDATE FORMS SET form_url = '/dashboard/qmqa/with-final-report' WHERE form_name = 'QMQA-05-08';
UPDATE FORMS SET form_url = '/dashboard/qmqa/response-awaiting-approval' WHERE form_name = 'QMQA-05-09';
UPDATE FORMS SET form_url = '/dashboard/qmqa/response-rejected' WHERE form_name = 'QMQA-05-10';
UPDATE FORMS SET form_url = '/dashboard/qmqa/calendar' WHERE form_name = 'QMQA-05-12';
UPDATE FORMS SET form_url = '/dashboard/qmqa/achievement' WHERE form_name = 'QMQA-05-13';
UPDATE FORMS SET form_url = '/dashboard/qmqa/search' WHERE form_name = 'QMQA-05-14';
UPDATE FORMS SET form_url = '/dashboard/qmqa/plan/list' WHERE form_name = 'QMQA-05-15';
UPDATE FORMS SET form_url = '/dashboard/qmqa/plan/cancel' WHERE form_name = 'QMQA-05-16';

UPDATE FORMS SET form_url = '/dashboard/qmqa-media/new' WHERE form_name = 'QMQA-MEDIA-01';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/draft' WHERE form_name = 'QMQA-MEDIA-02';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/awaiting-approval' WHERE form_name = 'QMQA-MEDIA-03';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/rejected' WHERE form_name = 'QMQA-MEDIA-04';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/issued' WHERE form_name = 'QMQA-MEDIA-05';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/approved' WHERE form_name = 'QMQA-MEDIA-06';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/cancel' WHERE form_name = 'QMQA-MEDIA-07';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/with-final-report' WHERE form_name = 'QMQA-MEDIA-08';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/response-awaiting-approval' WHERE form_name = 'QMQA-MEDIA-09';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/response-rejected' WHERE form_name = 'QMQA-MEDIA-10';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/accepted' WHERE form_name = 'QMQA-MEDIA-11';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/calendar' WHERE form_name = 'QMQA-MEDIA-12';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/achievement' WHERE form_name = 'QMQA-MEDIA-13';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/search' WHERE form_name = 'QMQA-MEDIA-14';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/plan/list' WHERE form_name = 'QMQA-MEDIA-15';
UPDATE FORMS SET form_url = '/dashboard/qmqa-media/plan/cancel' WHERE form_name = 'QMQA-MEDIA-16';

UPDATE FORMS SET form_url = '/maintenance/master-data/sites' WHERE form_name = 'SITE-06-01';
UPDATE FORMS SET form_url = '/maintenance/master-data/suppliers' WHERE form_name = 'SUPPLIER-06-01';
UPDATE FORMS SET form_url = '/maintenance/access-control/users' WHERE form_name IN ('USERS-06-01', 'USERS-06-02', 'USERS-06-03');
UPDATE FORMS SET form_url = '/maintenance/access-control/roles' WHERE form_name = 'ROLES-06-01';
UPDATE FORMS SET form_url = '/maintenance/access-control/permissions' WHERE form_name = 'ROLESACCESS-06-01';
UPDATE FORMS SET form_url = '/maintenance/system/form' WHERE form_name = 'FORMS-06-01';
