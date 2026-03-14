import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllWithApproval: vi.fn(),
  findWithApproval: vi.fn(),
  updateApprovalStatus: vi.fn(),
  updateByControlNo: vi.fn(),
  replaceParts: vi.fn(),
  replaceAttachments: vi.fn(),
  replaceActionItems: vi.fn(),
  replaceCheckItems: vi.fn(),
  replaceStatusRemarks: vi.fn(),
}));

const workflowServiceMock = vi.hoisted(() => ({
  submitApplication: vi.fn(),
  checkApplication: vi.fn(),
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  releaseApplication: vi.fn(),
}));

vi.mock('../../src/modules/fiveM1E/fiveM1E.repository.js', () => ({
  fiveM1ERepository: repositoryMock,
}));

vi.mock('../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js', () => ({
  fiveM1EWorkflowService: workflowServiceMock,
}));

import { FiveM1EService } from '../../src/modules/fiveM1E/fiveM1E.service.js';
import { FIVE_M1E_WORKFLOW_STAGE } from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.constants.js';

describe('FiveM1EService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds workflow metadata to list reads', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-001',
        CreatedBy: 'creator-1',
        approval_status: 'DRAFT',
        supplier_name: 'Supplier One',
        site_name: 'Site One',
      },
    ]);

    const service = new FiveM1EService();
    const records = await service.getAllApplications(undefined, 'creator-1');

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(expect.objectContaining({
      control_no: '5M-001',
      status: 'DRAFT',
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.DRAFT,
      workflowStageCode: 'DRAFT',
      availableActions: ['submit'],
      supplier_name: 'Supplier One',
      site_name: 'Site One',
    }));
  });

  it('delegates submit to the workflow service', async () => {
    workflowServiceMock.submitApplication.mockResolvedValue({ success: true });

    const service = new FiveM1EService();
    await service.submitApplication('5M-001', 'creator-1');

    expect(workflowServiceMock.submitApplication).toHaveBeenCalledWith('5M-001', 'creator-1');
  });

  it('delegates check to the workflow service', async () => {
    workflowServiceMock.checkApplication.mockResolvedValue({ success: true });

    const service = new FiveM1EService();
    await service.checkApplication('5M-001', 'checker-1', 'checked');

    expect(workflowServiceMock.checkApplication).toHaveBeenCalledWith('5M-001', 'checker-1', 'checked');
  });

  it('delegates approve to the workflow service', async () => {
    workflowServiceMock.approveApplication.mockResolvedValue({ success: true });

    const service = new FiveM1EService();
    await service.approveApplication('5M-001', 'approver-1', 'approved', 'APPROVED');

    expect(workflowServiceMock.approveApplication).toHaveBeenCalledWith(
      '5M-001',
      'approver-1',
      'approved',
      'APPROVED',
    );
  });

  it('delegates reject to the workflow service', async () => {
    workflowServiceMock.rejectApplication.mockResolvedValue({ success: true });

    const service = new FiveM1EService();
    await service.rejectApplication('5M-001', 'checker-1', 'reject');

    expect(workflowServiceMock.rejectApplication).toHaveBeenCalledWith('5M-001', 'checker-1', 'reject');
  });

  it('delegates release to the workflow service', async () => {
    workflowServiceMock.releaseApplication.mockResolvedValue({ success: true });

    const service = new FiveM1EService();
    await service.releaseApplication('5M-001', 'final-1');

    expect(workflowServiceMock.releaseApplication).toHaveBeenCalledWith('5M-001', 'final-1');
  });

  it('uses the stored approval status when updating approval fields', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-001',
      approval_status: 'SUBMITTED',
      envi_approver_necessary: 'NO',
    });
    repositoryMock.updateApprovalStatus.mockResolvedValue(undefined);

    const service = new FiveM1EService();
    await service.updateApplication('5M-001', { reviewer: 'reviewer-1' } as any, [], 'user-1');

    expect(repositoryMock.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'SUBMITTED',
      expect.objectContaining({
        Reviewer: 'reviewer-1',
        ModifiedDate: expect.any(Date),
      }),
    );
  });
});
