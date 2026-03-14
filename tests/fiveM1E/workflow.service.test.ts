import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiveM1EWorkflowService } from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js';

const CIP_SITE_ID = '9E8EDBF4-A226-48F7-A780-A8B82CD13A50';
const CLASS_C_ID = '10C66925-75F6-41C6-AEBC-8D6DE526800A';

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    ControlNo: '5M-001',
    CreatedBy: 'creator-1',
    approval_status: 'DRAFT',
    approval_seq: 0,
    mpd_pic: 'mpd-pic-1',
    mpd_pic_name: 'MPD PIC',
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
    final_approver: 'final-1',
    fa_full_name: 'Final Approver',
    design_approver_id: 'design-1',
    design_approver_id_name: 'Design Approver',
    envi_approver_id: 'envi-1',
    envi_approver_full_name: 'Environment Approver',
    qa_checker_id: 'qa-1',
    qa_checker_full_name: 'QA Checker',
    site_id: 'SITE-1',
    class_id: 'CLASS-A',
    ds_checker_necessary: 'NO',
    envi_checker_necessary: 'NO',
    ...overrides,
  };
}

describe('FiveM1EWorkflowService', () => {
  const repository = {
    findWithApproval: vi.fn(),
    updateApprovalStatus: vi.fn(),
    insertStatusRemark: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.updateApprovalStatus.mockResolvedValue(undefined);
    repository.insertStatusRemark.mockResolvedValue(undefined);
  });

  it('submits draft applications into MPD checker stage', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord());

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.submitApplication('5M-001', 'creator-1', 'submit');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'SUBMITTED',
      expect.objectContaining({
        ApprovalSeq: 1,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(repository.insertStatusRemark).toHaveBeenCalledWith(
      '5M-001',
      expect.objectContaining({
        remarks: 'submit',
        remark_by: 'creator-1',
        status: 'SUBMITTED',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: '5M-001',
      status: 'SUBMITTED',
      workflowStageCode: '1',
    }));
  });

  it('moves MPD checker applications to MPD approver stage', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'SUBMITTED',
      approval_seq: 1,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.checkApplication('5M-001', 'mpd-checker-1', 'checked');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'CHECKED',
      expect.objectContaining({
        ApprovalSeq: 2,
        MPDCheckerStatus: 1,
        MPDChkrDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: '5M-001',
      status: 'CHECKED',
      workflowStageCode: '2',
    }));
  });

  it('moves MPD approver applications to reviewer stage', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'CHECKED',
      approval_seq: 2,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication('5M-001', 'mpd-approver-1', 'approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 3,
        MPDApproverStatus: 1,
        MPDAprDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: '5M-001',
      status: 'FOR APPROVAL',
      workflowStageCode: '4',
    }));
  });

  it('moves reviewer sequence 500 applications to evaluation IC stage', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'FOR APPROVAL',
      approval_seq: 500,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication('5M-001', 'reviewer-1', 'reviewed');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 501,
        ReviewerStatus: 1,
        IssueDate: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '501',
    }));
  });

  it('moves evaluation IC applications to SQE checker stage', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'FOR APPROVAL',
      approval_seq: 501,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication('5M-001', 'eval-1', 'ic-approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 5,
        EvaluationICStatus: 1,
        EvaluationICDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '5',
    }));
  });

  it('lets a same-person SQE checker jump directly into the design branch', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'FOR APPROVAL',
      approval_seq: 5,
      checker: 'sqe-both-1',
      approver: 'sqe-both-1',
      ds_checker_necessary: 'YES',
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.checkApplication('5M-001', 'sqe-both-1', 'sqe checked');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 10,
        ChkrStatus: '1',
        AprStatus: '1',
        ChkrDtAprd: expect.any(Date),
        ApproverDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '10',
    }));
  });

  it('moves SQE approver applications into the QA checker branch when no other branch applies', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'CHECKED',
      approval_seq: 6,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication('5M-001', 'sqe-approver-1', 'sqe approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 13,
        AprStatus: '1',
        ApproverDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '13',
    }));
  });

  it('moves design approver applications into the environment branch when required', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'FOR APPROVAL',
      approval_seq: 10,
      envi_checker_necessary: 'YES',
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication('5M-001', 'design-1', 'design approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 12,
        DesignApproverStatus: 1,
        DesignApproverDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '12',
    }));
  });

  it('moves environment approver applications into final approval for CIP class C', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'FOR APPROVAL',
      approval_seq: 12,
      site_id: CIP_SITE_ID,
      class_id: CLASS_C_ID,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication('5M-001', 'envi-1', 'environment approved');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 7,
        EnviApproveStatus: 1,
        EnviApproveDtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '7',
    }));
  });

  it('moves final approval into the release gate by default', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'CHECKED',
      approval_seq: 7,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication('5M-001', 'final-1', 'final approved');

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

  it('keeps approved-with-condition as its own branch', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'CHECKED',
      approval_seq: 7,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.approveApplication(
      '5M-001',
      'final-1',
      'conditioned',
      'APPROVED WITH CONDITION',
    );

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'APRDWCOND',
      expect.objectContaining({
        ApprovalSeq: 14,
        FAStatus: 'aprdwcond',
        FADtAprd: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'APRDWCOND',
      workflowStageCode: '14',
    }));
  });

  it('returns SQE approver rejection to the reviewer loop with revised sequence 6', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'CHECKED',
      approval_seq: 6,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.rejectApplication('5M-001', 'sqe-approver-1', 'reject');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'FOR APPROVAL',
      expect.objectContaining({
        ApprovalSeq: 4,
        RevisedSequence: 6,
        AprStatus: null,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'FOR APPROVAL',
      workflowStageCode: '4',
    }));
  });

  it('releases the record into the legacy approved state', async () => {
    repository.findWithApproval.mockResolvedValue(createRecord({
      approval_status: 'FOR RELEASE',
      approval_seq: 8,
    }));

    const service = new FiveM1EWorkflowService(repository as any);
    const result = await service.releaseApplication('5M-001', 'mpd-pic-1');

    expect(repository.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'APPROVED',
      expect.objectContaining({
        ApprovalSeq: 15,
        ModifiedDate: expect.any(Date),
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'APPROVED',
      workflowStageCode: '15',
    }));
  });
});
