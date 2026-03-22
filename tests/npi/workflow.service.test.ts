import { beforeEach, describe, expect, it, vi } from 'vitest';

const controlNumberServiceMock = vi.hoisted(() => ({
  finalizeNpi: vi.fn(),
  getControlNoState: vi.fn(),
}));
const permissionServiceMock = vi.hoisted(() => ({
  checkRolePermission: vi.fn(),
}));

vi.mock('../../src/shared/services/control-number.service.js', () => ({
  controlNumberService: controlNumberServiceMock,
}));

vi.mock('../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
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
    findNotificationContextById: vi.fn(),
    findUserContactById: vi.fn(),
  };
  const notifications = {
    sendWorkflowNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controlNumberServiceMock.finalizeNpi.mockResolvedValue('IQC-2026-3-1-SITE');
    controlNumberServiceMock.getControlNoState.mockReturnValue('final');
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    repository.findNotificationContextById.mockResolvedValue({
      recordId: 'npi-1',
      controlNo: 'IQC-2026-3-1-SITE',
      supplierName: 'Toshiba Supplier',
      inspector: { userId: 'originator-1', email: 'originator@example.com', name: 'Originator User' },
      checker: { userId: 'checker-1', email: 'checker@example.com', name: 'Checker User' },
      approver: { userId: 'approver-1', email: 'approver@example.com', name: 'Approver User' },
      cc: [{ userId: 'cc-1', email: 'cc@example.com', name: 'CC User' }],
    });
    repository.findUserContactById.mockImplementation(async (userId: string) => ({
      userId,
      email: `${userId}@example.com`,
      name:
        userId === 'originator-1'
          ? 'Originator User'
          : userId === 'checker-1'
            ? 'Checker User'
            : userId === 'approver-1'
              ? 'Approver User'
              : userId,
    }));
    notifications.sendWorkflowNotification.mockResolvedValue({
      delivered: true,
      transport: 'file',
      referenceId: '/tmp/emails/npi.json',
      subject: '<NPI> Awaiting Approval - Toshiba Supplier',
      recipients: ['checker@example.com'],
      localUrl: 'http://localhost:5000/dashboard/new-parts/view/npi-1',
      internetUrl: 'https://sqm.example.com/dashboard/new-parts/view/npi-1',
    });
  });

  it('submits draft/rejected records to checker stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord(),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiWorkflowService(repository as any, notifications as any);
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
    expect(notifications.sendWorkflowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'npi.submitted',
        subject: '<NPI> Awaiting Approval - Toshiba Supplier',
        message: 'The report has been submitted by Originator User',
        to: [{ email: 'checker@example.com', name: 'Checker User' }],
        cc: [{ email: 'cc@example.com', name: 'CC User' }],
      }),
    );
  });

  it('moves checker-owned records to approver stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'SU' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiWorkflowService(repository as any, notifications as any);
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

    const service = new NpiWorkflowService(repository as any, notifications as any);

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

    const service = new NpiWorkflowService(repository as any, notifications as any);
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

    const service = new NpiWorkflowService(repository as any, notifications as any);
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

    const service = new NpiWorkflowService(repository as any, notifications as any);

    await expect(service.checkRecord('npi-1', 'someone-else')).rejects.toMatchObject({
      message: 'Only the assigned checker can check this NPI record.',
    });
  });

  it('allows unassigned checker-stage records when role fallback grants the stage permission', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'SU', checker_id: null }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'NPILOT-09-03' && action === 'check',
    );

    const service = new NpiWorkflowService(repository as any, notifications as any);
    const result = await service.checkRecord('npi-1', 'role-checker', undefined, 'checked by role');

    expect(permissionServiceMock.checkRolePermission).toHaveBeenCalledWith('role-checker', 'NPILOT-09-03', 'check');
    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'CK',
        checker_remarks: 'checked by role',
        updateby: 'role-checker',
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

  it('does not fail workflow transition when the NPI email send fails', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord(),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));
    notifications.sendWorkflowNotification.mockRejectedValueOnce(new Error('smtp unavailable'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const service = new NpiWorkflowService(repository as any, notifications as any);
    const result = await service.submitForApproval('npi-1', 'originator-1');

    expect(result.success).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[npi] workflow email notification failed',
      expect.stringContaining('"eventKey":"npi.submitted"'),
    );
  });
});
