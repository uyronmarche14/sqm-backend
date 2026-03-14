import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiveM1EWorkflowService } from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js';

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    ControlNo: '5M-001',
    CreatedBy: 'creator-1',
    approval_status: 'DRAFT',
    approval_seq: 0,
    mpd_checker: 'mpd-checker-1',
    mpd_checker_name: 'MPD Checker',
    reviewer: 'reviewer-1',
    reviewer_full_name: 'Reviewer One',
    evaluation_ic: 'eval-1',
    evaluation_ic_name: 'Eval One',
    checker: 'sqe-checker-1',
    checker_full_name: 'SQE Checker',
    approver: 'sqe-approver-1',
    approver_full_name: 'SQE Approver',
    final_approver: 'final-1',
    fa_full_name: 'Final Approver',
    ...overrides,
  };
}

describe('FiveM1EWorkflowService', () => {
  const repository = {
    findWithApproval: vi.fn(),
    updateApprovalStatus: vi.fn(),
    insertStatusRemark: vi.fn(),
  };
  const permissions = {
    checkRolePermission: vi.fn(),
    findUsersWithRolePermission: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.updateApprovalStatus.mockResolvedValue(undefined);
    repository.insertStatusRemark.mockResolvedValue(undefined);
    permissions.checkRolePermission.mockImplementation(async (userId: string, formId: string, action: string) => {
      if (userId === 'creator-1') {
        return formId === '5M1EMAIN-11-01' && action === 'submit';
      }

      if (userId === 'mpd-checker-1') {
        return formId === '5M1EApprovalSecDes-06-17' && (action === 'submit' || action === 'edit');
      }

      if (userId === 'reviewer-1') {
        return (
          (formId === '5M1EApprovalSecEnvi-06-17' || formId === '5M1EApprovalSecQA-06-17') &&
          (action === 'submit' || action === 'edit')
        );
      }

      if (userId === 'sqe-checker-1') {
        return (
          (formId === '5M1EApprovalSecEnvi-06-17' || formId === '5M1EApprovalSecQA-06-17') &&
          action === 'check'
        );
      }

      if (userId === 'sqe-approver-1') {
        return (
          (formId === '5M1EApprovalSecEnvi-06-17' || formId === '5M1EApprovalSecQA-06-17') &&
          action === 'approve'
        );
      }

      if (userId === 'final-1') {
        return (
          (formId === '5M1EApprovalSecSQE-06-17' || formId === '5M1EJudgementSec-06-17') &&
          (action === 'release' || action === 'edit')
        );
      }

      if (userId === 'role-editor-1') {
        return formId === '5M1EApprovalSecDes-06-17' && action === 'edit';
      }

      if (userId === 'release-role-1') {
        return (
          (formId === '5M1EApprovalSecSQE-06-17' || formId === '5M1EJudgementSec-06-17') &&
          action === 'release'
        );
      }

      return false;
    });
    permissions.findUsersWithRolePermission.mockResolvedValue([]);
  });

  it('submits draft applications into the submitted stage', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord());

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.submitApplication('5M-001', 'creator-1', 'submit');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'SUBMITTED',
      expect.objectContaining({
        ApprovalSeq: 1,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: '5M-001',
      status: 'SUBMITTED',
      workflowStageCode: '1',
    }));
  });

  it('submits draft applications by numeric row id using the canonical control number', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        ID: 66,
        ControlNo: '5M-001',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    await service.submitApplication('66', 'creator-1', 'submit');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'SUBMITTED',
      expect.objectContaining({
        ApprovalSeq: 1,
      }),
    );
  });

  it('allows the creator to submit a draft when they only have 5M1E new-form access', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord());

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const canSubmit = await service.canUserPerformAction('5M-001', 'creator-1', 'submit');

    expect(canSubmit).toBe(true);
    expect(permissions.checkRolePermission).toHaveBeenCalledWith('creator-1', '5M1EMAIN-11-01', 'submit');
  });

  it('lets the assigned MPD user save submitted records in place', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'SUBMITTED',
        approval_seq: 1,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const canEdit = await service.canUserUpdateRecord('5M-001', 'mpd-checker-1');

    expect(canEdit).toBe(true);
    expect(permissions.checkRolePermission).toHaveBeenCalledWith('mpd-checker-1', '5M1EApprovalSecDes-06-17', 'edit');
  });

  it('allows submitted-stage editing through role access even when the explicit owner is someone else', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'SUBMITTED',
        approval_seq: 1,
        mpd_checker: 'different-owner-1',
      }),
    );
    permissions.findUsersWithRolePermission.mockImplementation(async (formId: string, action: string) => {
      if (formId === '5M1EApprovalSecDes-06-17' && action === 'edit') {
        return [{ userId: 'role-editor-1', fullName: 'Role Editor' }];
      }
      return [];
    });

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const canEdit = await service.canUserUpdateRecord('5M-001', 'role-editor-1');

    expect(canEdit).toBe(true);
  });

  it('moves submitted MPD records into for approval on submit', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'SUBMITTED',
        approval_seq: 1,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.submitApplication('5M-001', 'mpd-checker-1', 'procurement complete');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 4,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '4',
    }));
  });

  it('moves submitted MPD records into for approval by numeric row id using the canonical control number', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        ID: 77,
        ControlNo: '5M-777',
        approval_status: 'SUBMITTED',
        approval_seq: 1,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    await service.submitApplication('77', 'mpd-checker-1', 'procurement complete');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-777',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 4,
      }),
    );
  });

  it('moves the evaluation editor into the checker stage on submit', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 4,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.submitApplication('5M-001', 'reviewer-1', 'assigned checker/approver');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 5,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '5',
    }));
  });

  it('allows a for-approval editor with role access to save and submit without explicit owner match', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 4,
        reviewer: 'different-reviewer',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);

    await expect(service.canUserUpdateRecord('5M-001', 'reviewer-1')).resolves.toBe(true);
    await expect(service.canUserPerformAction('5M-001', 'reviewer-1', 'submit')).resolves.toBe(true);
  });

  it('keeps checked records in for approval for the approver', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 5,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.checkApplication('5M-001', 'sqe-checker-1', 'checked');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 6,
        ChkrStatus: '1',
        ChkrDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '6',
    }));
  });

  it('moves the assigned approver to approved on approve', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 6,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'sqe-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'APPROVED',
      expect.objectContaining({
        ApprovalSeq: 7,
        AprStatus: 'approved',
        ApproverDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'APPROVED',
      workflowStageCode: '15',
    }));
  });

  it('moves the assigned approver to approved with condition when requested', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 6,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'sqe-approver-1', 'conditional', 'APRDWCOND');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'APRDWCOND',
      expect.objectContaining({
        ApprovalSeq: 14,
        AprStatus: 'aprdwcond',
        ApproverDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'APRDWCOND',
      workflowStageCode: '14',
    }));
  });

  it('lets the assigned final owner release approved-with-condition records', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'APRDWCOND',
        approval_seq: 14,
        final_approver: 'final-1',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const canEdit = await service.canUserUpdateRecord('5M-001', 'final-1');
    const result = await service.releaseApplication('5M-001', 'final-1');

    expect(canEdit).toBe(true);
    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'RELEASE',
      expect.objectContaining({
        ApprovalSeq: 15,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RELEASE',
      workflowStageCode: 'RELEASE',
    }));
  });

  it('falls back to role access for final release when no explicit final owner is assigned', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'APPROVED',
        approval_seq: 7,
        final_approver: null,
      }),
    );
    permissions.findUsersWithRolePermission.mockImplementation(async (formId: string, action: string) => {
      if (
        action === 'release' &&
        (formId === '5M1EApprovalSecSQE-06-17' || formId === '5M1EJudgementSec-06-17')
      ) {
        return [{ userId: 'release-role-1', fullName: 'Release Role User' }];
      }
      return [];
    });

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const canRelease = await service.canUserPerformAction('5M-001', 'release-role-1', 'release');

    expect(canRelease).toBe(true);
  });
});
