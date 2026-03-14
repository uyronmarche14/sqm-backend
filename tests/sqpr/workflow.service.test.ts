import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../src/shared/errors/AppError.js';
import { SqprWorkflowService } from '../../src/modules/sqpr/workflow/sqpr-workflow.service.js';

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
    sqpr_id: 'sqpr-1',
    control_no: 'SQPR-2026-01-SITE',
    request_status: '2',
    incharge_id: 'issuer-1',
    incharge_name: 'Issuer One',
    checker_id: 'checker-1',
    checker_name: 'Checker One',
    approver_id: 'approver-1',
    approver_name: 'Approver One',
    date_created: new Date('2026-03-14'),
    last_update: new Date('2026-03-14'),
    updateby: 'issuer-1',
    ...overrides,
  };
}

describe('SqprWorkflowService', () => {
  const repository = {
    findByIdDetailed: vi.fn(),
    executeTransaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits draft records into the checker stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'DRF-2026-3-T' }) })
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'SQPR-2026-3-T', request_status: '3', submit_date: new Date('2026-03-14') }) });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new SqprWorkflowService(repository as any);
    const result = await service.submit('sqpr-1', 'issuer-1', 'submit');

    expect(tx.updateTable).toHaveBeenCalledWith('SQPR');
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      control_no: 'SQPR-2026-3-T',
      request_status: '3',
      incharge_remarks: 'submit',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'SUBMITTED',
      request_status: 'SUBM',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
    }));
  });

  it('checks checker-stage records into the approver stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ request_status: '3' }) })
      .mockResolvedValueOnce({ record: createRecord({ request_status: '4', checker_remarks: 'checked' }) });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new SqprWorkflowService(repository as any);
    const result = await service.check('sqpr-1', 'checker-1', 'checked');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '4',
      checker_remarks: 'checked',
      updateby: 'checker-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'SUBMITTED',
      request_status: 'SUBM',
      workflowStage: 'APPROVER',
      workflowStageCode: '4',
    }));
  });

  it('rejects approver-stage records back to the rejected approver loop', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ request_status: '4' }) })
      .mockResolvedValueOnce({ record: createRecord({ request_status: '6', approver_remarks: 'revise' }) });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new SqprWorkflowService(repository as any);
    const result = await service.reject('sqpr-1', 'approver-1', 'revise');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '6',
      approver_remarks: 'revise',
      updateby: 'approver-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'REJECTED',
      request_status: 'RJCT',
      workflowStage: 'REJECT_APPROVER',
      workflowStageCode: '6',
    }));
  });

  it('issues issuer-stage records into the accepted stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ request_status: '10' }) })
      .mockResolvedValueOnce({ record: createRecord({ request_status: '1' }) });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new SqprWorkflowService(repository as any);
    const result = await service.issue('sqpr-1', 'issuer-1');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '1',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'ISSUED',
      request_status: 'ISSU',
      workflowStage: 'ACCEPT',
      workflowStageCode: '1',
    }));
  });

  it('blocks workflow actions for non-assigned actors', async () => {
    repository.findByIdDetailed.mockResolvedValue({ record: createRecord({ request_status: '3' }) });

    const service = new SqprWorkflowService(repository as any);

    await expect(service.check('sqpr-1', 'someone-else', 'checked')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
