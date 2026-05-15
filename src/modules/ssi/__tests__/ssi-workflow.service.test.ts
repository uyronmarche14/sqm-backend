import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findRecordByIdMock,
  updateRecordMock,
  insertWorkflowEventMock,
  executeTransactionMock,
  finalizeSsiMock,
} = vi.hoisted(() => ({
  findRecordByIdMock: vi.fn(),
  updateRecordMock: vi.fn(),
  insertWorkflowEventMock: vi.fn(),
  executeTransactionMock: vi.fn(),
  finalizeSsiMock: vi.fn(),
}));

vi.mock('../ssi.repository.js', () => ({
  ssiRepository: {
    findRecordById: findRecordByIdMock,
    updateRecord: updateRecordMock,
    insertWorkflowEvent: insertWorkflowEventMock,
    executeTransaction: executeTransactionMock,
  },
}));

vi.mock('../../../shared/services/control-number.service.js', () => ({
  controlNumberService: {
    finalizeSsi: finalizeSsiMock,
  },
}));

import { ssiWorkflowService } from '../workflow/ssi-workflow.service.js';

describe('SsiWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeTransactionMock.mockImplementation(async (callback: (trx: object) => Promise<unknown>) => callback({}));
  });

  it('finalizes draft control numbers and records workflow events on submit', async () => {
    findRecordByIdMock
      .mockResolvedValueOnce({
        ssi_record_id: 'record-1',
        control_no: 'DRF-SSI-001',
        request_status: 'DRAFT',
        mfg_site_id: 'site-1',
        supplier_id: 'supplier-1',
        category_family: 'QUALIFICATION',
        audit_type: 'SSI Qualification',
        sqe_pic_id: 'issuer-1',
        scheduled_date: new Date('2026-05-14T00:00:00.000Z'),
        created_by: 'issuer-1',
        inspector_registrations_json: '[]',
        written_exam_json: '{"overviewAttachments":[],"writtenExamAttachments":[],"answerSheetAttachments":[]}',
        repeatability_study_json: '{"id":"repeatability","title":"Repeatability Study","trials":[]}',
        audit_artifacts_json: '[]',
        certificate_json: '{"inspectorCertificateGenerated":false,"companyCertificateGenerated":false,"attachments":[]}',
        cc_list_json: '[]',
        approvers_json: '[]',
        notifications_json: '[]',
      })
      .mockResolvedValueOnce({
        ssi_record_id: 'record-1',
        control_no: 'SSI-001',
        request_status: 'AWAITING_CHECKED',
        mfg_site_id: 'site-1',
        supplier_id: 'supplier-1',
        category_family: 'QUALIFICATION',
        audit_type: 'SSI Qualification',
        sqe_pic_id: 'issuer-1',
        scheduled_date: new Date('2026-05-14T00:00:00.000Z'),
        created_by: 'issuer-1',
        inspector_registrations_json: '[]',
        written_exam_json: '{"overviewAttachments":[],"writtenExamAttachments":[],"answerSheetAttachments":[]}',
        repeatability_study_json: '{"id":"repeatability","title":"Repeatability Study","trials":[]}',
        audit_artifacts_json: '[]',
        certificate_json: '{"inspectorCertificateGenerated":false,"companyCertificateGenerated":false,"attachments":[]}',
        cc_list_json: '[]',
        approvers_json: '[]',
        notifications_json: '[]',
      });
    finalizeSsiMock.mockResolvedValue('SSI-001');

    await ssiWorkflowService.applyAction(
      'record-1',
      { userId: 'issuer-1', roleId: 'role-1', roleName: 'SQE', supplierIds: [] },
      'submit',
      { remarks: 'Ready for checking' },
    );

    expect(finalizeSsiMock).toHaveBeenCalledWith({
      siteId: 'site-1',
      date: '2026-05-14',
    });
    expect(updateRecordMock).toHaveBeenCalledWith(
      {},
      'record-1',
      expect.objectContaining({
        control_no: 'SSI-001',
        request_status: 'AWAITING_CHECKED',
        issuer_id: 'issuer-1',
        issuer_remarks: 'Ready for checking',
      }),
    );
    expect(insertWorkflowEventMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        ssi_record_id: 'record-1',
        action_name: 'submit',
        from_status: 'DRAFT',
        to_status: 'AWAITING_CHECKED',
      }),
    );
  });
});
