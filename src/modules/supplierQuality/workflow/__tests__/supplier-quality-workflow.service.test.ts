import { beforeEach, describe, expect, it, vi } from 'vitest';

const finalizeSupplierQualityMock = vi.hoisted(() => vi.fn());
const repositoryMock = vi.hoisted(() => ({
  findHeaderById: vi.fn(),
  executeTransaction: vi.fn(),
  updateRecord: vi.fn(),
}));
const getByIdMock = vi.hoisted(() => vi.fn());
const assertActionAccessMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../shared/services/control-number.service.js', () => ({
  controlNumberService: {
    finalizeSupplierQuality: finalizeSupplierQualityMock,
  },
}));

vi.mock('../../supplier-quality.repository.js', () => ({
  supplierQualityRepository: repositoryMock,
}));

vi.mock('../../services/supplier-quality-record-query.service.js', () => ({
  supplierQualityRecordQueryService: {
    getById: getByIdMock,
  },
}));

vi.mock('../../services/supplier-quality-access.service.js', () => ({
  supplierQualityAccessService: {
    assertActionAccess: assertActionAccessMock,
  },
}));

import { supplierQualityWorkflowService } from '../supplier-quality-workflow.service.js';

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    sqpr_lar_id: 'lar-1',
    control_no: 'DRF-2026-MAY-SITE',
    request_status: '2',
    incharge_id: 'issuer-1',
    checker_id: 'checker-1',
    approver_id: 'approver-1',
    incharge_remarks: null,
    checker_remarks: null,
    approver_remarks: null,
    approver_date: null,
    ...overrides,
  };
}

describe('supplierQualityWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) => callback({}));
    finalizeSupplierQualityMock.mockReturnValue('LAR-2026-MAY-SITE');
    getByIdMock.mockResolvedValue({ id: 'lar-1', status: 'AWAITING_CHECKED' });
  });

  it('submits draft records and finalizes the control number', async () => {
    repositoryMock.findHeaderById.mockResolvedValue(createRecord());

    const result = await supplierQualityWorkflowService.submit('lar-1', {
      userId: 'issuer-1',
      remarks: 'submit remark',
    });

    expect(assertActionAccessMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: 'issuer-1' }), 'submit', 'SQPRLAR-01-01', expect.any(String));
    expect(finalizeSupplierQualityMock).toHaveBeenCalledWith('DRF-2026-MAY-SITE');
    expect(repositoryMock.updateRecord).toHaveBeenCalledWith(
      expect.anything(),
      'lar-1',
      expect.objectContaining({
        control_no: 'LAR-2026-MAY-SITE',
        request_status: '3',
      }),
    );
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('moves checker-stage records to the approver stage', async () => {
    repositoryMock.findHeaderById.mockResolvedValue(createRecord({ request_status: '3' }));
    getByIdMock.mockResolvedValue({ id: 'lar-1', status: 'AWAITING_APPROVAL' });

    await supplierQualityWorkflowService.check('lar-1', {
      userId: 'checker-1',
      remarks: 'checked',
    });

    expect(repositoryMock.updateRecord).toHaveBeenCalledWith(
      expect.anything(),
      'lar-1',
      expect.objectContaining({
        request_status: '4',
        checker_remarks: 'checked',
      }),
    );
  });

  it('rejects invalid workflow transitions', async () => {
    repositoryMock.findHeaderById.mockResolvedValue(createRecord({ request_status: '1' }));

    await expect(
      supplierQualityWorkflowService.check('lar-1', { userId: 'checker-1' }),
    ).rejects.toMatchObject({
      message: 'Only records awaiting check can be checked.',
    });
  });
});
