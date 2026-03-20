import { beforeEach, describe, expect, it, vi } from 'vitest';

const controlNumberServiceMock = vi.hoisted(() => ({
  finalizeNpi: vi.fn(),
  getControlNoState: vi.fn(),
}));

vi.mock('../../src/shared/services/control-number.service.js', () => ({
  controlNumberService: controlNumberServiceMock,
}));

import { NpiWorkflowService } from '../../src/modules/npi/services/NpiWorkflowService.js';

function createTransactionMock() {
  const execute = vi.fn().mockResolvedValue(undefined);
  const where = vi.fn(() => ({ execute }));
  const set = vi.fn(() => ({ where }));
  const updateTable = vi.fn(() => ({ set }));

  return {
    trx: { updateTable },
    updateTable,
    set,
    where,
    execute,
  };
}

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    npi_lot_id: 'npi-1',
    control_no: 'DRF-2026-3-1-SITE',
    request_status: 'DR',
    site_id: 'site-1',
    site_code: 'SITE',
    inspector_id: 'originator-1',
    checker_id: 'checker-1',
    approver_id: 'approver-1',
    ...overrides,
  };
}

describe('NpiWorkflowService', () => {
  const repository = {
    findByIdDetailed: vi.fn(),
    executeTransaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controlNumberServiceMock.finalizeNpi.mockResolvedValue('IQC-2026-3-1-SITE');
    controlNumberServiceMock.getControlNoState.mockReturnValue('final');
  });

  it('submits draft/rejected records to checker stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord(),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiWorkflowService(repository as any);
    const result = await service.submitForApproval('npi-1', 'originator-1');

    expect(tx.updateTable).toHaveBeenCalledWith('NPI_LOTS');
    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        control_no: 'IQC-2026-3-1-SITE',
        request_status: 'SU',
        updateby: 'originator-1',
      }),
    );
    expect(result.data).toEqual({
      id: 'npi-1',
      recordId: 'npi-1',
      status: 'SU',
      controlNo: 'IQC-2026-3-1-SITE',
      controlNoState: 'final',
    });
  });

  it('moves checker-owned records to approver stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'SU' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiWorkflowService(repository as any);
    const result = await service.checkRecord('npi-1', 'checker-1', undefined, 'looks good');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'CK',
        checker_remarks: 'looks good',
        updateby: 'checker-1',
      }),
    );
    expect(result.data).toEqual({
      id: 'npi-1',
      recordId: 'npi-1',
      status: 'CK',
      controlNo: 'DRF-2026-3-1-SITE',
      controlNoState: 'final',
    });
  });

  it('blocks submit when the site required for final numbering is missing', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ site_id: null, site_code: null }),
    });

    const service = new NpiWorkflowService(repository as any);

    await expect(service.submitForApproval('npi-1', 'originator-1')).rejects.toMatchObject({
      message: 'Site is required before submitting this NPI record.',
    });
  });

  it('moves approver-owned records to accepted stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'CK' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiWorkflowService(repository as any);
    const result = await service.approveRecord('npi-1', 'approver-1', undefined, 'approved');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'AP',
        approver_remarks: 'approved',
        updateby: 'approver-1',
      }),
    );
    expect(result.data).toEqual({
      id: 'npi-1',
      recordId: 'npi-1',
      status: 'AP',
      controlNo: 'DRF-2026-3-1-SITE',
      controlNoState: 'final',
    });
  });

  it('writes checker rejection to the legacy R5 stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'SU' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiWorkflowService(repository as any);
    const result = await service.rejectRecord('npi-1', 'checker-1', undefined, 'defect found');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'R5',
        checker_remarks: 'defect found',
      }),
    );
    expect(result.data).toEqual({
      id: 'npi-1',
      recordId: 'npi-1',
      status: 'R5',
      controlNo: 'DRF-2026-3-1-SITE',
      controlNoState: 'final',
    });
  });

  it('rejects check attempts from non-assigned actors', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'SU' }),
    });

    const service = new NpiWorkflowService(repository as any);

    await expect(service.checkRecord('npi-1', 'someone-else')).rejects.toMatchObject({
      message: 'Only the assigned checker can check this NPI record.',
    });
  });
});
