import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../src/shared/errors/AppError.js';
const permissionServiceMock = vi.hoisted(() => ({
  checkRolePermission: vi.fn(),
}));

vi.mock('../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
}));

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
    findNotificationContextById: vi.fn(),
    findUserContactById: vi.fn(),
  };
  const notifications = {
    sendWorkflowNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    repository.findNotificationContextById.mockResolvedValue(null);
    repository.findUserContactById.mockResolvedValue(null);
    notifications.sendWorkflowNotification.mockResolvedValue({
      delivered: true,
      transport: 'file',
      referenceId: '/tmp/emails/sqpr.json',
      subject: '<SQPR> Awaiting Approval',
      recipients: ['checker@example.com'],
      localUrl: 'http://localhost:5000/dashboard/sqpr/view/sqpr-1',
      internetUrl: 'https://sqm.example.com/dashboard/sqpr/view/sqpr-1',
    });
  });

  it('submits draft records into the checker stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'DRF-2026-3-T' }) })
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'SQPR-2026-3-T', request_status: '3', submit_date: new Date('2026-03-14') }) });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new SqprWorkflowService(repository as any);
    const result = await service.submit('sqpr-1', 'issuer-1', undefined, 'submit');

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
    const result = await service.check('sqpr-1', 'checker-1', undefined, 'checked');

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
    const result = await service.reject('sqpr-1', 'approver-1', undefined, 'revise');

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

    await expect(service.check('sqpr-1', 'someone-else', undefined, 'checked')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows unassigned checker-stage records when role fallback grants the stage permission', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ request_status: '3', checker_id: null }) })
      .mockResolvedValueOnce({ record: createRecord({ request_status: '4', checker_id: null, checker_remarks: 'checked by role' }) });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'SQPR-03-02' && action === 'check',
    );

    const service = new SqprWorkflowService(repository as any);
    const result = await service.check('sqpr-1', 'role-checker', undefined, 'checked by role');

    expect(permissionServiceMock.checkRolePermission).toHaveBeenCalledWith('role-checker', 'SQPR-03-02', 'check');
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: '4',
      checker_remarks: 'checked by role',
      updateby: 'role-checker',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      workflowStage: 'APPROVER',
      workflowStageCode: '4',
    }));
  });

  it('sends SQPR submit notifications to checker with CC list', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'DRF-2026-3-T', supplier_name: 'Toshiba Supplier' }) })
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'SQPR-2026-3-T', request_status: '3', submit_date: new Date('2026-03-14') }) });
    repository.findNotificationContextById.mockResolvedValue({
      recordId: 'sqpr-1',
      controlNo: 'SQPR-2026-3-T',
      supplierName: 'Toshiba Supplier',
      reportType: 1,
      month: 4,
      fiscalYear: 2026,
      incharge: { userId: 'issuer-1', email: 'issuer@example.com', name: 'Issuer One' },
      checker: { userId: 'checker-1', email: 'checker@example.com', name: 'Checker One' },
      approver: { userId: 'approver-1', email: 'approver@example.com', name: 'Approver One' },
      cc: [{ userId: 'cc-1', email: 'cc@example.com', name: 'CC User' }],
    });
    repository.findUserContactById.mockResolvedValue({
      userId: 'issuer-1',
      email: 'issuer@example.com',
      name: 'Issuer One',
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new SqprWorkflowService(repository as any, notifications as any);
    await service.submit('sqpr-1', 'issuer-1', undefined, 'submit');

    expect(notifications.sendWorkflowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'sqpr.submitted',
        subject: '<SQPR> Awaiting Approval',
        message: 'The report has been submitted by Issuer One',
        to: [{ email: 'checker@example.com', name: 'Checker One' }],
        cc: [{ email: 'cc@example.com', name: 'CC User' }],
        periodLabel: 'April 2026',
      }),
    );
  });

  it('sends SQPR issue notifications to cc recipients and internal actors', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ request_status: '10', supplier_name: 'Toshiba Supplier' }) })
      .mockResolvedValueOnce({ record: createRecord({ request_status: '1' }) });
    repository.findNotificationContextById.mockResolvedValue({
      recordId: 'sqpr-1',
      controlNo: 'SQPR-2026-3-T',
      supplierName: 'Toshiba Supplier',
      reportType: 2,
      month: 2,
      fiscalYear: 2026,
      incharge: { userId: 'issuer-1', email: 'issuer@example.com', name: 'Issuer One' },
      checker: { userId: 'checker-1', email: 'checker@example.com', name: 'Checker One' },
      approver: { userId: 'approver-1', email: 'approver@example.com', name: 'Approver One' },
      cc: [{ userId: 'cc-1', email: 'cc@example.com', name: 'CC User' }],
    });
    repository.findUserContactById.mockResolvedValue({
      userId: 'issuer-1',
      email: 'issuer@example.com',
      name: 'Issuer One',
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new SqprWorkflowService(repository as any, notifications as any);
    await service.issue('sqpr-1', 'issuer-1');

    expect(notifications.sendWorkflowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'sqpr.issued',
        subject: '<SQPR> Issued',
        message: 'The report has been issued by Issuer One',
        to: [{ email: 'cc@example.com', name: 'CC User' }],
        cc: [
          { email: 'approver@example.com', name: 'Approver One' },
          { email: 'checker@example.com', name: 'Checker One' },
          { email: 'issuer@example.com', name: 'Issuer One' },
        ],
        periodLabel: 'Quarter 2 2026',
      }),
    );
  });

  it('does not fail SQPR workflow when the email send throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tx = createTransactionMock();
    repository.findByIdDetailed
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'DRF-2026-3-T', supplier_name: 'Toshiba Supplier' }) })
      .mockResolvedValueOnce({ record: createRecord({ control_no: 'SQPR-2026-3-T', request_status: '3', submit_date: new Date('2026-03-14') }) });
    repository.findNotificationContextById.mockResolvedValue({
      recordId: 'sqpr-1',
      controlNo: 'SQPR-2026-3-T',
      supplierName: 'Toshiba Supplier',
      reportType: 1,
      month: 4,
      fiscalYear: 2026,
      incharge: { userId: 'issuer-1', email: 'issuer@example.com', name: 'Issuer One' },
      checker: { userId: 'checker-1', email: 'checker@example.com', name: 'Checker One' },
      approver: { userId: 'approver-1', email: 'approver@example.com', name: 'Approver One' },
      cc: [],
    });
    repository.findUserContactById.mockResolvedValue({
      userId: 'issuer-1',
      email: 'issuer@example.com',
      name: 'Issuer One',
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));
    notifications.sendWorkflowNotification.mockRejectedValueOnce(new Error('smtp unavailable'));

    const service = new SqprWorkflowService(repository as any, notifications as any);
    const result = await service.submit('sqpr-1', 'issuer-1', undefined, 'submit');

    expect(result.message).toBe('Record submitted successfully');
    expect(errorSpy).toHaveBeenCalledWith(
      '[sqpr] workflow email notification failed',
      expect.any(String),
    );

    errorSpy.mockRestore();
  });
});
