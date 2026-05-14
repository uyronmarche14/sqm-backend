import { beforeEach, describe, expect, it, vi } from 'vitest';

const finalizeSpcMock = vi.hoisted(() => vi.fn());
const repositoryMock = vi.hoisted(() => ({
  findHeaderById: vi.fn(),
  executeTransaction: vi.fn(),
  updateRecord: vi.fn(),
  updateWorkflow: vi.fn(),
}));
const getByIdMock = vi.hoisted(() => vi.fn());
const assertActionAccessMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../shared/services/control-number.service.js', () => ({
  controlNumberService: {
    finalizeSpc: finalizeSpcMock,
  },
}));

vi.mock('../../spc-trend.repository.js', () => ({
  spcTrendRepository: repositoryMock,
}));

vi.mock('../../services/spc-trend-record-query.service.js', () => ({
  spcTrendRecordQueryService: {
    getById: getByIdMock,
  },
}));

vi.mock('../../services/spc-trend-access.service.js', () => ({
  spcTrendAccessService: {
    assertActionAccess: assertActionAccessMock,
  },
}));

import { spcTrendWorkflowService } from '../spc-trend-workflow.service.js';

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    spc_id: 'spc-1',
    control_no: 'DRF-2026-SITE-001',
    request_status: '2',
    site_id: 'site-1',
    site_code: 'SITE',
    upload_date: '2026-05-14',
    incharge_id: 'issuer-1',
    issuer_remarks: null,
    checker_remarks: null,
    approver_remarks: null,
    checker_id: 'checker-1',
    approver_id: 'approver-1',
    ...overrides,
  };
}

describe('spcTrendWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) => callback({}));
    finalizeSpcMock.mockResolvedValue('SPC-2026-SITE-001');
    getByIdMock.mockResolvedValue({ id: 'spc-1', status: 'AWAITING_CHECKED' });
  });

  it('submits draft records and finalizes the control number', async () => {
    repositoryMock.findHeaderById.mockResolvedValue(createRecord());

    const result = await spcTrendWorkflowService.submit('spc-1', {
      userId: 'issuer-1',
      remarks: 'submit',
    });

    expect(assertActionAccessMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: 'issuer-1' }), 'submit', 'SPC-05-03');
    expect(finalizeSpcMock).toHaveBeenCalled();
    expect(repositoryMock.updateRecord).toHaveBeenCalledWith(
      expect.anything(),
      'spc-1',
      expect.objectContaining({
        control_no: 'SPC-2026-SITE-001',
        request_status: '3',
      }),
    );
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('moves checker-stage records to the approver stage', async () => {
    repositoryMock.findHeaderById.mockResolvedValue(createRecord({ request_status: '3' }));
    getByIdMock.mockResolvedValue({ id: 'spc-1', status: 'AWAITING_APPROVAL' });

    await spcTrendWorkflowService.check('spc-1', {
      userId: 'checker-1',
      remarks: 'checked',
    });

    expect(repositoryMock.updateRecord).toHaveBeenCalledWith(
      expect.anything(),
      'spc-1',
      expect.objectContaining({ request_status: '4' }),
    );
    expect(repositoryMock.updateWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      'spc-1',
      expect.objectContaining({ checker_remarks: 'checked' }),
    );
  });

  it('rejects invalid workflow transitions', async () => {
    repositoryMock.findHeaderById.mockResolvedValue(createRecord({ request_status: '10' }));

    await expect(
      spcTrendWorkflowService.check('spc-1', { userId: 'checker-1' }),
    ).rejects.toMatchObject({
      message: 'Only records awaiting check can be checked.',
    });
  });
});
