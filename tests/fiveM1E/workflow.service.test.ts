import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiveM1EWorkflowService } from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js';
import { controlNumberService } from '../../src/shared/services/control-number.service.js';
import { BadRequestError } from '../../src/shared/errors/AppError.js';

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    ControlNo: '5M-001',
    CreatedBy: 'creator-1',
    approval_status: 'DRAFT',
    approval_seq: 0,
    mpd_checker: 'mpd-checker-1',
    mpd_checker_name: 'MPD Checker',
    mpd_approver: 'mpd-approver-1',
    mpd_approver_name: 'MPD Approver',
    reviewer: 'reviewer-1',
    reviewer_full_name: 'Reviewer One',
    evaluation_ic: 'eval-1',
    evaluation_ic_name: 'Eval One',
    checker: 'sqe-checker-1',
    checker_full_name: 'SQE Checker',
    approver: 'sqe-approver-1',
    approver_full_name: 'SQE Approver',
    design_approver_id: 'design-approver-1',
    design_approver_name: 'Design Approver',
    envi_approver_id: 'envi-approver-1',
    envi_approve_name: 'Envi Approver',
    qa_checker_id: 'qa-checker-1',
    qa_checker_name: 'QA Checker',
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
    renameControlNo: vi.fn(),
  };
  const permissions = {
    checkRolePermission: vi.fn(),
    findUsersWithRolePermission: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.updateApprovalStatus.mockResolvedValue(undefined);
    repository.insertStatusRemark.mockResolvedValue(undefined);
    repository.renameControlNo.mockResolvedValue(undefined);
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

      if (userId === 'mpd-approver-1') {
        return (
          (formId === '5M1EApprovalSecDes-06-17') &&
          action === 'approve'
        );
      }

      if (userId === 'design-approver-1') {
        return (
          (formId === '5M1EApprovalSecDes-06-17') &&
          action === 'approve'
        );
      }

      if (userId === 'envi-approver-1') {
        return (
          (formId === '5M1EApprovalSecEnvi-06-17') &&
          action === 'approve'
        );
      }

      if (userId === 'qa-checker-1') {
        return (
          (formId === '5M1EApprovalSecQA-06-17') &&
          action === 'check'
        );
      }

      if (userId === 'final-1') {
        return (
          (formId === '5M1EApprovalSecSQE-06-17' || formId === '5M1EJudgementSec-06-17') &&
          (action === 'release' || action === 'edit' || action === 'approve')
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
      controlNoState: 'final',
      status: 'SUBMITTED',
      workflowStageCode: '1',
    }));
  });

  it('finalizes temporary control numbers during the supplier submit step', async () => {
    vi.spyOn(controlNumberService, 'buildFiveM1EFinal').mockResolvedValue('IQA-PT-PROD-00001');
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        ControlNo: 'TMP_20260320-11-42-36-600',
        SiteID: 'site-1',
        CommodityID: 'part-type-1',
        Attribute03: 'product-1',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.submitApplication('TMP_20260320-11-42-36-600', 'creator-1', 'submit');

    expect(controlNumberService.buildFiveM1EFinal).toHaveBeenCalledWith({
      siteId: 'site-1',
      siteCode: undefined,
      partTypeId: 'part-type-1',
      partTypeCode: undefined,
      productId: 'product-1',
      productCode: undefined,
    });
    expect(repository.renameControlNo).toHaveBeenCalledWith(
      'TMP_20260320-11-42-36-600',
      'IQA-PT-PROD-00001',
    );
    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      'IQA-PT-PROD-00001',
      'SUBMITTED',
      expect.objectContaining({
        ApprovalSeq: 1,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: 'IQA-PT-PROD-00001',
      controlNoState: 'final',
      status: 'SUBMITTED',
    }));
  });

  it('falls back to a stable 5M control number when supplier submit lacks resolvable legacy codes', async () => {
    vi.spyOn(controlNumberService, 'buildFiveM1EFinal').mockRejectedValue(
      new BadRequestError('Unable to resolve site code for control number generation.'),
    );
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        ID: 123,
        ControlNo: 'TMP_20260320-12-05-18-197',
      }),
    );

    const expectedControlNo = controlNumberService.buildFiveM1ESubmitted({
      recordId: '123',
      currentControlNo: 'TMP_20260320-12-05-18-197',
    });

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.submitApplication('TMP_20260320-12-05-18-197', 'creator-1', 'submit');

    expect(repository.renameControlNo).toHaveBeenCalledWith(
      'TMP_20260320-12-05-18-197',
      expectedControlNo,
    );
    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      expectedControlNo,
      'SUBMITTED',
      expect.objectContaining({
        ApprovalSeq: 1,
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: expectedControlNo,
      controlNoState: 'final',
      status: 'SUBMITTED',
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

  it('finalizes temporary control numbers when the MPD stage submits procurement data', async () => {
    vi.spyOn(controlNumberService, 'buildFiveM1EFinal').mockResolvedValue('IQA-PT-PROD-00001');
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        ControlNo: 'TMP_20260320-11-42-36-600',
        approval_status: 'SUBMITTED',
        approval_seq: 1,
        SiteID: 'site-1',
        CommodityID: 'part-type-1',
        Attribute03: 'product-1',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.submitApplication('TMP_20260320-11-42-36-600', 'mpd-checker-1', 'procurement complete');

    expect(controlNumberService.buildFiveM1EFinal).toHaveBeenCalledWith({
      siteId: 'site-1',
      siteCode: undefined,
      partTypeId: 'part-type-1',
      partTypeCode: undefined,
      productId: 'product-1',
      productCode: undefined,
    });
    expect(repository.renameControlNo).toHaveBeenCalledWith('TMP_20260320-11-42-36-600', 'IQA-PT-PROD-00001');
    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      'IQA-PT-PROD-00001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 4,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: 'IQA-PT-PROD-00001',
      controlNoState: 'final',
      status: 'FOR APPROVAL',
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

  it('does not grant check actions through role fallback when the SQE checker field is not assigned', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 5,
        checker: null,
        checker_full_name: null,
      }),
    );
    permissions.findUsersWithRolePermission.mockImplementation(async (formId: string, action: string) => {
      if (
        action === 'check' &&
        (formId === '5M1EApprovalSecEnvi-06-17' || formId === '5M1EApprovalSecQA-06-17')
      ) {
        return [{ userId: 'sqe-checker-1', fullName: 'SQE Checker' }];
      }
      return [];
    });

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);

    await expect(service.canUserPerformAction('5M-001', 'sqe-checker-1', 'check')).resolves.toBe(false);
    await expect(service.checkApplication('5M-001', 'sqe-checker-1', 'checked')).rejects.toThrow(
      'Only the assigned SQE checker can check this 5M1E application.',
    );
  });

  it('routes SQE approval through QA checker by default using the branch helper', async () => {
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
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 13,
        AprStatus: 'approved',
        ApproverDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '13',
    }));
  });

  it('moves MPD approver approve to the reviewer stage', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'CHECKED',
        approval_seq: 2,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'mpd-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 3,
        MPDApproverStatus: 'approved',
        MPDAprDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '4',
    }));
  });

  it('routes SQE approval through the design approver stage when design is required', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 6,
        ds_checker_necessary: 'YES',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'sqe-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({ ApprovalSeq: 10 }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      workflowStageCode: '10',
    }));
  });

  it('routes SQE approval through the environment approver stage when environmental is required', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 6,
        envi_checker_necessary: 'YES',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'sqe-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({ ApprovalSeq: 12 }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      workflowStageCode: '12',
    }));
  });

  it('routes SQE approval through the final approver stage when CIP Class C', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 6,
        site_id: '9E8EDBF4-A226-48F7-A780-A8B82CD13A50',
        class_id: '10C66925-75F6-41C6-AEBC-8D6DE526800A',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'sqe-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({ ApprovalSeq: 7 }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      workflowStageCode: '7',
    }));
  });

  it('moves design approver approval through the environment stage when required', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 10,
        envi_checker_necessary: 'YES',
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'design-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({ ApprovalSeq: 12 }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      workflowStageCode: '12',
    }));
  });

  it('moves design approver approval to QA checker by default', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 10,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'design-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({ ApprovalSeq: 13 }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      workflowStageCode: '13',
    }));
  });

  it('moves environment approver approval to QA checker by default', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 12,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'envi-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({ ApprovalSeq: 13 }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      workflowStageCode: '13',
    }));
  });

  it('moves QA checker check to the final approver stage', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 13,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.checkApplication('5M-001', 'qa-checker-1', 'checked by QA');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 7,
        QACheckerStatus: '1',
        QACheckerDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '7',
    }));
  });

  it('moves final approver approval to the for-release stage', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 7,
      }),
    );

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);
    const result = await service.approveApplication('5M-001', 'final-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR RELEASE',
      expect.objectContaining({
        ApprovalSeq: 8,
        FAStatus: 'approved',
        FADtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR RELEASE',
      workflowStageCode: '8',
    }));
  });

  it('does not grant approve actions through role fallback when the SQE approver field is not assigned', async () => {
    repository.findWithApproval.mockResolvedValue(
      createRecord({
        approval_status: 'FOR APPROVAL',
        approval_seq: 6,
        approver: null,
        approver_full_name: null,
      }),
    );
    permissions.findUsersWithRolePermission.mockImplementation(async (formId: string, action: string) => {
      if (
        action === 'approve' &&
        (formId === '5M1EApprovalSecEnvi-06-17' || formId === '5M1EApprovalSecQA-06-17')
      ) {
        return [{ userId: 'sqe-approver-1', fullName: 'SQE Approver' }];
      }
      return [];
    });

    const service = new FiveM1EWorkflowService(repository as any, permissions as any);

    await expect(service.canUserPerformAction('5M-001', 'sqe-approver-1', 'approve')).resolves.toBe(false);
    await expect(service.approveApplication('5M-001', 'sqe-approver-1', 'approved')).rejects.toThrow(
      'Only the assigned SQE approver can approve this 5M1E application.',
    );
  });

  it('routes SQE approved-with-condition through branch logic (not a direct bypass)', async () => {
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
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 13,
        AprStatus: 'approved',
        ApproverDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '13',
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
