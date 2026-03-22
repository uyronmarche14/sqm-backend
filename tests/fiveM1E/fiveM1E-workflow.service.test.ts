import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiveM1EWorkflowService } from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js';

describe('FiveM1EWorkflowService.canUserDeleteRecord', () => {
  const repositoryMock = {
    findWithApproval: vi.fn(),
  };

  const permissionServiceMock = {
    checkRolePermission: vi.fn(),
    findUsersWithRolePermission: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the creator to delete a draft record', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-001',
      CreatedBy: 'creator-1',
      approval_status: 'DRAFT',
    });

    const service = new FiveM1EWorkflowService(repositoryMock as any, permissionServiceMock as any);
    await expect(service.canUserDeleteRecord('5M-001', 'creator-1', 'USER')).resolves.toBe(true);
  });

  it('allows the creator to delete a RAR record', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-002',
      CreatedBy: 'creator-1',
      approval_status: 'RAR',
    });

    const service = new FiveM1EWorkflowService(repositoryMock as any, permissionServiceMock as any);
    await expect(service.canUserDeleteRecord('5M-002', 'creator-1', 'USER')).resolves.toBe(true);
  });

  it('allows the creator to delete a supplier update record', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-003',
      CreatedBy: 'creator-1',
      approval_status: 'SUPPLIER UPDATE',
    });

    const service = new FiveM1EWorkflowService(repositoryMock as any, permissionServiceMock as any);
    await expect(service.canUserDeleteRecord('5M-003', 'creator-1', 'USER')).resolves.toBe(true);
  });

  it('denies delete during active approval stages', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-004',
      CreatedBy: 'creator-1',
      approval_status: 'FOR APPROVAL',
      approval_seq: 5,
    });

    const service = new FiveM1EWorkflowService(repositoryMock as any, permissionServiceMock as any);
    await expect(service.canUserDeleteRecord('5M-004', 'creator-1', 'USER')).resolves.toBe(false);
  });

  it('denies delete to unrelated users on draft-like records', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-005',
      CreatedBy: 'creator-1',
      approval_status: 'DRAFT',
    });

    const service = new FiveM1EWorkflowService(repositoryMock as any, permissionServiceMock as any);
    await expect(service.canUserDeleteRecord('5M-005', 'outsider-1', 'USER')).resolves.toBe(false);
  });

  it('allows admin override regardless of stage', async () => {
    const service = new FiveM1EWorkflowService(repositoryMock as any, permissionServiceMock as any);
    await expect(service.canUserDeleteRecord('5M-006', 'admin-1', 'TIP_ADMIN')).resolves.toBe(true);
    expect(repositoryMock.findWithApproval).not.toHaveBeenCalled();
  });
});

describe('FiveM1EWorkflowService notifications', () => {
  const workflowPermissionMock = {
    checkRolePermission: vi.fn(),
    findUsersWithRolePermission: vi.fn(),
  };
  const repositoryMock = {
    findWithApproval: vi.fn(),
    updateApprovalStatus: vi.fn(),
    insertStatusRemark: vi.fn(),
    findUserContactsByIds: vi.fn(),
    renameControlNo: vi.fn(),
  };

  const notificationMock = {
    sendWorkflowNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    workflowPermissionMock.checkRolePermission.mockResolvedValue(false);
    workflowPermissionMock.findUsersWithRolePermission.mockResolvedValue([]);
    repositoryMock.findUserContactsByIds.mockResolvedValue([
      { userId: 'supplier-1', fullName: 'Supplier User', email: 'supplier@example.com', activeFlag: 1 },
    ]);
    notificationMock.sendWorkflowNotification.mockResolvedValue({
      delivered: true,
      transport: 'file',
      referenceId: '/tmp/emails/5m1e.json',
      subject: '<5M1E> Submitted',
      recipients: ['submitted@example.com'],
      ccRecipients: [],
      localUrl: 'http://localhost:5000/dashboard/5m1e/view/5m1e-1',
      internetUrl: 'https://sqm.example.com/dashboard/5m1e/view/5m1e-1',
      recipientSource: 'queue-fallback',
    });
  });

  it('sends supplier submit notifications to the Submitted queue fallback when no owner exists', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ID: '5m1e-1',
      ControlNo: '5M1E-0001',
      Title: 'Motor Change',
      supplier_name: 'Toshiba Supplier',
      site_name: 'Main Site',
      CreatedBy: 'supplier-1',
      approval_status: 'DRAFT',
      approval_seq: 0,
    });

    const service = new FiveM1EWorkflowService(
      repositoryMock as any,
      workflowPermissionMock as any,
      notificationMock as any,
    );

    const result = await service.submitApplication('5M1E-0001', 'supplier-1', 'submit');

    expect(repositoryMock.updateApprovalStatus).toHaveBeenCalledWith(
      '5M1E-0001',
      'SUBMITTED',
      expect.objectContaining({ ApprovalSeq: 1 }),
    );
    expect(notificationMock.sendWorkflowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'fivem1e.submitted',
        controlNo: '5M1E-0001',
        pic: 'SUPPLIER',
        action: 'SUBMIT',
        fallbackFormIds: ['5M1EApprovalSecDes-06-17'],
      }),
    );
    expect(result.message).toBe('Application submitted successfully');
  });

  it('does not fail workflow transitions when 5M1E email sending throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repositoryMock.findWithApproval.mockResolvedValue({
      ID: '5m1e-2',
      ControlNo: '5M1E-0002',
      Title: 'Motor Change',
      supplier_name: 'Toshiba Supplier',
      site_name: 'Main Site',
      CreatedBy: 'supplier-1',
      approval_status: 'DRAFT',
      approval_seq: 0,
    });
    notificationMock.sendWorkflowNotification.mockRejectedValueOnce(new Error('smtp unavailable'));

    const service = new FiveM1EWorkflowService(
      repositoryMock as any,
      workflowPermissionMock as any,
      notificationMock as any,
    );

    const result = await service.submitApplication('5M1E-0002', 'supplier-1', 'submit');

    expect(result.message).toBe('Application submitted successfully');
    expect(errorSpy).toHaveBeenCalledWith(
      '[5m1e] workflow email notification failed',
      expect.any(String),
    );

    errorSpy.mockRestore();
  });
});
