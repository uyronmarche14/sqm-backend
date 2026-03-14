import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveSupplierResponseContentMock = vi.hoisted(() => vi.fn());
const saveResponseReviewContentMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/modules/qmqa/qmqa.service.js', () => ({
  qmqaService: {
    saveSupplierResponseContent: saveSupplierResponseContentMock,
    saveResponseReviewContent: saveResponseReviewContentMock,
  },
}));

import { QmqaWorkflowService } from '../../src/modules/qmqa/workflow/qmqa-workflow.service.js';

function createTransactionMock() {
  const execute = vi.fn().mockResolvedValue(undefined);
  const where = vi.fn(() => ({ execute }));
  const set = vi.fn(() => ({ where }));
  const updateTable = vi.fn(() => ({ set }));

  return {
    trx: { updateTable },
    updateTable,
    set,
  };
}

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    qmqa_id: 'qmqa-1',
    request_status: '2',
    encoder_id: 'encoder-1',
    encoder_name: 'Encoder One',
    issuer_id: 'issuer-1',
    issuer_name: 'Issuer One',
    checker_id: 'checker-1',
    checker_name: 'Checker One',
    approver_id: 'approver-1',
    approver_name: 'Approver One',
    attention_id: 'supplier-attn-1',
    attention_name: 'Supplier Attention',
    supplier_id: 'supplier-1',
    ...overrides,
  };
}

function createResponse(overrides: Record<string, unknown> = {}) {
  return {
    qmqa_response_id: 'response-1',
    qmqa_id: 'qmqa-1',
    checker_id: 'checker-2',
    checker_name: 'Checker Two',
    approver_id: 'approver-2',
    approver_name: 'Approver Two',
    ...overrides,
  };
}

describe('QmqaWorkflowService', () => {
  const repository = {
    findRecordByIdDetailed: vi.fn(),
    findResponseByQmqaId: vi.fn(),
    findSupplierIdsByUserId: vi.fn(),
    executeTransaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findSupplierIdsByUserId.mockResolvedValue([]);
    saveSupplierResponseContentMock.mockResolvedValue({
      success: true,
      data: { id: 'qmqa-1' },
      message: 'saved',
    });
    saveResponseReviewContentMock.mockResolvedValue({
      success: true,
      data: { id: 'qmqa-1' },
      message: 'saved',
    });
  });

  it('submits draft records into the cycle 1 checker stage', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord())
      .mockResolvedValueOnce(createRecord({ request_status: '3', issuer_remarks: 'submit' }));
    repository.findResponseByQmqaId.mockResolvedValue(null);
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.submitMain('qmqa-1', 'issuer-1', 'submit');

    expect(tx.updateTable).toHaveBeenCalledWith('QMQA');
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '3',
      issuer_remarks: 'submit',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      id: 'qmqa-1',
      status: 'AWAITING_APPROVAL',
      request_status: '3',
      workflowStageCode: '3',
    }));
  });

  it('rejects checker-stage records back to the issuer loop', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '3' }))
      .mockResolvedValueOnce(createRecord({ request_status: '5', checker_remarks: 'revise' }));
    repository.findResponseByQmqaId.mockResolvedValue(null);
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.rejectMain('qmqa-1', 'checker-1', 'revise');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '5',
      checker_remarks: 'revise',
      updateby: 'checker-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'REJECTED',
      request_status: '5',
      workflowStageCode: '5',
    }));
  });

  it('approves cycle 1 approver-stage records into issuer stage', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '4' }))
      .mockResolvedValueOnce(createRecord({ request_status: '10', approver_remarks: 'approved' }));
    repository.findResponseByQmqaId.mockResolvedValue(null);
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.approveMain('qmqa-1', 'approver-1', 'approved');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '10',
      approver_remarks: 'approved',
      updateby: 'approver-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'APPROVED',
      request_status: '10',
      workflowStageCode: '10',
    }));
  });

  it('issues issuer-stage records to the supplier response stage', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '10' }))
      .mockResolvedValueOnce(createRecord({ request_status: '11', issuer_remarks: 'issued' }));
    repository.findResponseByQmqaId.mockResolvedValue(null);
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.issueMain('qmqa-1', 'issuer-1', 'issued');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '11',
      issuer_remarks: 'issued',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'ISSUED',
      request_status: '11',
      workflowStageCode: '11',
    }));
  });

  it('keeps supplier saves at stage 11 while persisting response content separately', async () => {
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '11' }))
      .mockResolvedValueOnce(createRecord({ request_status: '11' }));
    repository.findResponseByQmqaId.mockResolvedValue(null);

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.saveResponse('qmqa-1', 'supplier-attn-1', { initialReport: 'team' });

    expect(saveSupplierResponseContentMock).toHaveBeenCalledWith(
      'qmqa-1',
      'supplier-attn-1',
      { initialReport: 'team' },
      [],
      'initial',
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'ISSUED',
      request_status: '11',
      workflowStageCode: '11',
    }));
  });

  it('submits the supplier initial response from stage 11 into stage 13', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '11' }))
      .mockResolvedValueOnce(createRecord({ request_status: '13' }));
    repository.findResponseByQmqaId.mockResolvedValue(null);
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.submitInitialResponse('qmqa-1', 'supplier-attn-1', { initialReport: 'team' });

    expect(saveSupplierResponseContentMock).toHaveBeenCalledWith(
      'qmqa-1',
      'supplier-attn-1',
      { initialReport: 'team' },
      [],
      'initial',
    );
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '13',
      updateby: 'supplier-attn-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'WITH_INITIAL_REPORT',
      request_status: '13',
      workflowStageCode: '13',
    }));
  });

  it('submits the supplier final response into the final-response stage', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '13' }))
      .mockResolvedValueOnce(createRecord({ request_status: '14' }));
    repository.findResponseByQmqaId.mockResolvedValue(null);
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.submitFinalResponse('qmqa-1', 'supplier-attn-1', { finalReport: 'done' });

    expect(saveSupplierResponseContentMock).toHaveBeenCalledWith(
      'qmqa-1',
      'supplier-attn-1',
      { finalReport: 'done' },
      [],
      'final',
    );
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '14',
      updateby: 'supplier-attn-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'WITH_FINAL_REPORT',
      request_status: '14',
      workflowStageCode: '14',
    }));
  });

  it('submits issuer response review into cycle 2 checker stage with response assignees', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '15' }))
      .mockResolvedValueOnce(createRecord({ request_status: '16' }));
    repository.findResponseByQmqaId
      .mockResolvedValueOnce(createResponse())
      .mockResolvedValueOnce(createResponse())
      .mockResolvedValueOnce(createResponse());
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.submitResponseReview('qmqa-1', 'issuer-1', {
      verification_remarks: 'assigned',
      cycle2_checker_id: 'checker-2',
      cycle2_approver_id: 'approver-2',
    });

    expect(saveResponseReviewContentMock).toHaveBeenCalledWith('qmqa-1', 'issuer-1', {
      verification_remarks: 'assigned',
      cycle2_checker_id: 'checker-2',
      cycle2_approver_id: 'approver-2',
    });
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '16',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RESPONSE_AWAIT_APPROVAL',
      request_status: '16',
      workflowStageCode: '16',
      nextApproverId: 'checker-2',
    }));
  });

  it('routes cycle 2 checker and approver approvals through stages 16 -> 17 -> 19', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '16' }))
      .mockResolvedValueOnce(createRecord({ request_status: '17' }));
    repository.findResponseByQmqaId
      .mockResolvedValueOnce(createResponse())
      .mockResolvedValueOnce(createResponse({ checker_date: new Date('2026-03-14') }));
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const checked = await service.checkResponse('qmqa-1', 'checker-2', 'checked');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      checker_remarks: 'checked',
      updateby: 'checker-2',
    }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '17',
      updateby: 'checker-2',
    }));
    expect(checked.data).toEqual(expect.objectContaining({
      request_status: '17',
      workflowStageCode: '17',
      nextApproverId: 'approver-2',
    }));

    vi.clearAllMocks();
    repository.findSupplierIdsByUserId.mockResolvedValue([]);
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '17' }))
      .mockResolvedValueOnce(createRecord({ request_status: '19' }));
    repository.findResponseByQmqaId
      .mockResolvedValueOnce(createResponse({ checker_date: new Date('2026-03-14') }))
      .mockResolvedValueOnce(createResponse({
        checker_date: new Date('2026-03-14'),
        approver_date: new Date('2026-03-15'),
      }));
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const approved = await service.approveResponse('qmqa-1', 'approver-2', 'approved');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      approver_remarks: 'approved',
      updateby: 'approver-2',
    }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '19',
      updateby: 'approver-2',
    }));
    expect(approved.data).toEqual(expect.objectContaining({
      request_status: '19',
      workflowStageCode: '19',
      nextApproverId: 'issuer-1',
    }));
  });

  it('writes issuer and final rejection loops for cycle 2 review', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '15' }))
      .mockResolvedValueOnce(createRecord({ request_status: '20' }));
    repository.findResponseByQmqaId
      .mockResolvedValueOnce(createResponse())
      .mockResolvedValueOnce(createResponse({ issuer_date: new Date('2026-03-14') }));
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const issuerRejected = await service.rejectResponse('qmqa-1', 'issuer-1', 'redo');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      issuer_remarks: 'redo',
      updateby: 'issuer-1',
    }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '20',
      updateby: 'issuer-1',
    }));
    expect(issuerRejected.data).toEqual(expect.objectContaining({
      status: 'RESPONSE_REJECTED',
      request_status: '20',
      workflowStageCode: '20',
    }));

    vi.clearAllMocks();
    repository.findSupplierIdsByUserId.mockResolvedValue([]);
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '19' }))
      .mockResolvedValueOnce(createRecord({ request_status: '24' }));
    repository.findResponseByQmqaId
      .mockResolvedValueOnce(createResponse({
        checker_date: new Date('2026-03-14'),
        approver_date: new Date('2026-03-15'),
      }))
      .mockResolvedValueOnce(createResponse({
        checker_date: new Date('2026-03-14'),
        approver_date: new Date('2026-03-15'),
        remarks: 'not accepted',
      }));
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const notAccepted = await service.notAcceptResponse('qmqa-1', 'issuer-1', 'not accepted');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      remarks: 'not accepted',
      updateby: 'issuer-1',
    }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '24',
      updateby: 'issuer-1',
    }));
    expect(notAccepted.data).toEqual(expect.objectContaining({
      status: 'RESPONSE_REJECTED',
      request_status: '24',
      workflowStageCode: '24',
    }));
  });

  it('accepts final issuer-stage records into closed status', async () => {
    const tx = createTransactionMock();
    repository.findRecordByIdDetailed
      .mockResolvedValueOnce(createRecord({ request_status: '19' }))
      .mockResolvedValueOnce(createRecord({ request_status: '1' }));
    repository.findResponseByQmqaId
      .mockResolvedValueOnce(createResponse({
        checker_date: new Date('2026-03-14'),
        approver_date: new Date('2026-03-15'),
      }))
      .mockResolvedValueOnce(createResponse({
        checker_date: new Date('2026-03-14'),
        approver_date: new Date('2026-03-15'),
        accept_date: new Date('2026-03-16'),
      }));
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new QmqaWorkflowService(repository as any);
    const result = await service.acceptResponse('qmqa-1', 'issuer-1', 'accepted');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      accept_date: expect.any(Date),
      updateby: 'issuer-1',
    }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '1',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'CLOSED',
      request_status: '1',
      workflowStageCode: '1',
    }));
  });
});
