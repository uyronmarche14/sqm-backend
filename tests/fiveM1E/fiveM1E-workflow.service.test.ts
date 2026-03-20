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
