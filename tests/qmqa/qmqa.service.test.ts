import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllRecordsDetailed: vi.fn(),
  findRecordByIdDetailed: vi.fn(),
  findLatestResponsesByQmqaIds: vi.fn(),
  findSupplierIdsByUserId: vi.fn(),
  findPlanAttachments: vi.fn(),
  findAttachments: vi.fn(),
  findCcList: vi.fn(),
  findResponseByQmqaId: vi.fn(),
  findResponseInitialAttachments: vi.fn(),
  findResponseFinalAttachments: vi.fn(),
  findResponseVerificationAttachments: vi.fn(),
}));

vi.mock('../../src/modules/qmqa/qmqa.repository.js', () => ({
  qmqaRepository: repositoryMock,
}));

import { qmqaService } from '../../src/modules/qmqa/qmqa.service.js';

describe('QmqaService workflow metadata hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findLatestResponsesByQmqaIds.mockResolvedValue([]);
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue([]);
    repositoryMock.findPlanAttachments.mockResolvedValue([]);
    repositoryMock.findAttachments.mockResolvedValue([]);
    repositoryMock.findCcList.mockResolvedValue([]);
    repositoryMock.findResponseInitialAttachments.mockResolvedValue([]);
    repositoryMock.findResponseFinalAttachments.mockResolvedValue([]);
    repositoryMock.findResponseVerificationAttachments.mockResolvedValue([]);
  });

  it('includes workflow metadata on detail reads', async () => {
    repositoryMock.findRecordByIdDetailed.mockResolvedValue({
      qmqa_id: 'qmqa-1',
      control_no: 'QMQA-001',
      request_status: '3',
      created_date: new Date('2026-03-14'),
      site_id: 'site-1',
      site_name: 'Site',
      supplier_id: 'supplier-1',
      supplier_name: 'Supplier',
      audit_category_id: 'category-1',
      category_name: 'Category',
      audit_plan_date: new Date('2026-03-14'),
      sqe_pic_id: 'sqe-1',
      sqe_pic_name: 'SQE',
      audit_type_id: 'type-1',
      audit_type_name: 'Type',
      attention_id: 'attention-1',
      attention_name: 'Attention',
      pic_auditor_id: 'auditor-1',
      pic_auditor_name: 'Auditor',
      audit_rating: 95,
      due_date: new Date('2026-03-20'),
      audit_date: new Date('2026-03-14'),
      issued_date: null,
      auditees: 'Team',
      auditors: 'Auditors',
      attendees: 'Attendees',
      remarks: 'Remarks',
      encoder_id: 'encoder-1',
      encoder_name: 'Encoder',
      issuer_id: 'issuer-1',
      issuer_name: 'Issuer',
      checker_id: 'checker-1',
      checker_name: 'Checker',
      approver_id: 'approver-1',
      approver_name: 'Approver',
      last_update: new Date('2026-03-14'),
      updateby: 'issuer-1',
    });
    repositoryMock.findResponseByQmqaId.mockResolvedValue(null);

    const result = await qmqaService.getRecordById('qmqa-1', { userId: 'checker-1' });

    expect(result).toEqual(expect.objectContaining({
      status: 'AWAITING_APPROVAL',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      workflowStageLabel: 'Cycle 1 Checker',
      availableActions: ['check-main', 'reject-main'],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker',
    }));
  });

  it('adds actor-aware cycle 1 actions on list reads', async () => {
    repositoryMock.findAllRecordsDetailed.mockResolvedValue([
      {
        qmqa_id: 'qmqa-1',
        control_no: 'QMQA-001',
        request_status: '3',
        supplier_name: 'Supplier',
        site_name: 'Site',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        category_name: 'Category',
        audit_type_name: 'Type',
        attention_name: 'Attention',
        encoder_name: 'Encoder',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        attention_id: 'attention-1',
        supplier_id: 'supplier-1',
        created_date: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
      },
    ]);

    const result = await qmqaService.getAllRecords({ status: 'AWAITING_APPROVAL' }, { userId: 'checker-1' });

    expect(repositoryMock.findAllRecordsDetailed).toHaveBeenCalledWith({
      mappedStatus: expect.arrayContaining(['3', '4', 'AA', 'AC', 'SU', 'CK']),
    });
    expect(result[0]).toEqual(expect.objectContaining({
      status: 'AWAITING_APPROVAL',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      availableActions: ['check-main', 'reject-main'],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker',
    }));
  });

  it('hydrates cycle 2 next approver names from the latest QMQA response row on list reads', async () => {
    repositoryMock.findAllRecordsDetailed.mockResolvedValue([
      {
        qmqa_id: 'qmqa-2',
        control_no: 'QMQA-002',
        request_status: '16',
        supplier_name: 'Supplier',
        site_name: 'Site',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        category_name: 'Category',
        audit_type_name: 'Type',
        attention_name: 'Attention',
        encoder_name: 'Encoder',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        attention_id: 'attention-1',
        supplier_id: 'supplier-1',
        created_date: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
      },
    ]);
    repositoryMock.findLatestResponsesByQmqaIds.mockResolvedValue([
      {
        qmqa_id: 'qmqa-2',
        checker_id: 'checker-2',
        checker_name: 'Cycle 2 Checker',
        approver_id: 'approver-2',
        approver_name: 'Cycle 2 Approver',
      },
    ]);

    const result = await qmqaService.getAllRecords(
      { status: 'RESPONSE_AWAIT_APPROVAL' },
      { userId: 'checker-2' },
    );

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'RESPONSE_AWAIT_APPROVAL',
      workflowStage: 'CHECKER_2ND',
      workflowStageCode: '16',
      availableActions: ['check-response', 'reject-response'],
      nextApproverId: 'checker-2',
      nextApproverName: 'Cycle 2 Checker',
      checker_id: 'checker-1',
      approver_id: 'approver-1',
    }));
  });

  it('hydrates supplier response actions when the actor matches the attention assignment', async () => {
    repositoryMock.findAllRecordsDetailed.mockResolvedValue([
      {
        qmqa_id: 'qmqa-3',
        control_no: 'QMQA-003',
        request_status: '11',
        supplier_name: 'Supplier',
        site_name: 'Site',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        category_name: 'Category',
        audit_type_name: 'Type',
        attention_name: 'Supplier Attention',
        encoder_name: 'Encoder',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        attention_id: 'supplier-attn-1',
        supplier_id: 'supplier-1',
        created_date: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
      },
    ]);

    const result = await qmqaService.getAllRecords(
      { status: 'ISSUED' },
      { userId: 'supplier-attn-1' },
    );

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'ISSUED',
      workflowStage: 'SUPPLIER',
      workflowStageCode: '11',
      availableActions: ['save-response', 'submit-initial-response'],
      nextApproverId: 'supplier-attn-1',
      nextApproverName: 'Supplier Attention',
    }));
  });
});
