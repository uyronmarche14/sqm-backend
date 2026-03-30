import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  createWithApproval: vi.fn(),
  findAllWithApproval: vi.fn(),
  findWithApproval: vi.fn(),
  insertParts: vi.fn(),
  findParts: vi.fn(),
  findAttachments: vi.fn(),
  findActionItems: vi.fn(),
  findCheckItems: vi.fn(),
  findStatusRemarks: vi.fn(),
  findCCUsers: vi.fn(),
  updateApprovalStatus: vi.fn(),
  updateByControlNo: vi.fn(),
  replaceParts: vi.fn(),
  replaceAttachments: vi.fn(),
  replaceActionItems: vi.fn(),
  replaceCheckItems: vi.fn(),
  replaceStatusRemarks: vi.fn(),
  replaceCCUsers: vi.fn(),
  deleteApproval: vi.fn(),
  deleteByControlNo: vi.fn(),
}));

const workflowServiceMock = vi.hoisted(() => ({
  getWorkflowMetadata: vi.fn(),
  canUserUpdateRecord: vi.fn(),
  canUserDeleteRecord: vi.fn(),
  submitApplication: vi.fn(),
  checkApplication: vi.fn(),
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  releaseApplication: vi.fn(),
}));

const attachmentServiceMock = vi.hoisted(() => ({
  getAttachmentInfo: vi.fn(),
  downloadAttachment: vi.fn(),
}));

const assignmentValidationMock = vi.hoisted(() => ({
  validateAssignmentActorForForms: vi.fn(),
}));

vi.mock('../../src/modules/fiveM1E/fiveM1E.repository.js', () => ({
  fiveM1ERepository: repositoryMock,
}));

vi.mock('../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js', () => ({
  fiveM1EWorkflowService: workflowServiceMock,
}));

vi.mock('../../src/shared/utils/assignment-validation.utils.js', () => ({
  validateAssignmentActorForForms: assignmentValidationMock.validateAssignmentActorForForms,
}));

import { FiveM1EService } from '../../src/modules/fiveM1E/fiveM1E.service.js';
import { FIVE_M1E_WORKFLOW_STAGE } from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.constants.js';
import { ForbiddenError, NotFoundError } from '../../src/shared/errors/AppError.js';

describe('FiveM1EService', () => {
  const permissionServiceMock = {
    checkRolePermission: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    assignmentValidationMock.validateAssignmentActorForForms.mockResolvedValue(undefined);
    repositoryMock.findParts.mockResolvedValue([]);
    repositoryMock.findAttachments.mockResolvedValue([]);
    repositoryMock.findActionItems.mockResolvedValue([]);
    repositoryMock.findCheckItems.mockResolvedValue([]);
    repositoryMock.findStatusRemarks.mockResolvedValue([]);
    repositoryMock.findCCUsers.mockResolvedValue([]);
    workflowServiceMock.canUserUpdateRecord.mockResolvedValue(true);
    workflowServiceMock.canUserDeleteRecord.mockResolvedValue(true);
    attachmentServiceMock.getAttachmentInfo.mockResolvedValue({ ID: 'att-1', ControlNo: '5M-001' });
    attachmentServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/file.pdf',
      fileName: 'file.pdf',
      mimeType: 'application/pdf',
    });
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.DRAFT,
      workflowStageCode: 'DRAFT',
      workflowStageLabel: 'Draft',
      availableActions: ['submit'],
      nextApproverId: null,
      nextApproverName: null,
      ownerMode: 'shared-queue',
    });
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
    const records = await service.getAllApplications(undefined, { userId: 'creator-1', roleName: 'USER' });

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

  it('keeps legacy-readable joined labels on list reads', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-001',
        CreatedBy: 'creator-1',
        approval_status: 'DRAFT',
        supplier_name: 'Supplier One',
        vendor_name: 'Vendor One',
        item_name: 'Part One',
        class_name: 'Class One',
        attribute_05_name: 'Rank One',
        attribute_06_name: 'Category One',
      },
    ]);

    const service = new FiveM1EService();
    const records = await service.getAllApplications(undefined, { userId: 'creator-1', roleName: 'USER' });

    expect(records[0]).toEqual(
      expect.objectContaining({
        vendor_name: 'Vendor One',
        item_name: 'Part One',
        class_name: 'Class One',
        attribute_05_name: 'Rank One',
        attribute_06_name: 'Category One',
      }),
    );
  });

  it('defaults legacy non-null create fields to empty strings for draft saves', async () => {
    repositoryMock.createWithApproval.mockResolvedValue({
      ID: 1,
      ControlNo: '5M-TEMP',
    });

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any, attachmentServiceMock as any);
    await service.createApplication(
      {
        title: 'Draft 5M1E',
        vendor_id: 'UNKNOWN',
        item_id: 'item-1',
        status: 'DRAFT',
      } as any,
      'creator-1',
      [],
    );

    expect(repositoryMock.createWithApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        Title: 'Draft 5M1E',
        SupplierCN: '',
        VendorID: 'UNKNOWN',
        ItemID: 'item-1',
        ImpactDate: '',
        CreatedBy: 'creator-1',
        CreateDate: expect.any(Date),
        ModifiedDate: expect.any(Date),
      }),
      'DRAFT',
      expect.any(Object),
    );
  });

  it('rejects procurement assignee mutation on create before persistence', async () => {
    const service = new FiveM1EService(undefined as any, permissionServiceMock as any, attachmentServiceMock as any);

    await expect(
      service.createApplication(
        {
          title: 'Draft 5M1E',
          vendor_id: 'UNKNOWN',
          item_id: 'item-1',
          mpd_approver: 'approver-1',
        } as any,
        'creator-1',
        [],
      ),
    ).rejects.toThrow('5M1E generic save cannot modify mpd_approver during DRAFT');

    expect(repositoryMock.createWithApproval).not.toHaveBeenCalled();
  });

  it('hides unrelated records on assigned scope', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-LOCKED',
        CreatedBy: 'creator-1',
        approval_status: 'FOR APPROVAL',
      },
    ]);
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER,
      workflowStageCode: '6',
      workflowStageLabel: 'Awaiting SQE Approver',
      availableActions: [],
      nextApproverId: 'assigned-approver',
      nextApproverName: 'Assigned Approver',
      ownerMode: 'assigned',
    });

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const records = await service.getAllApplications(
      'FOR APPROVAL',
      { userId: 'outsider-1', roleName: 'USER' },
      'assigned',
    );

    expect(records).toEqual([]);
  });

  it('returns released records to users with release queue role access even when they are not record participants', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-REL',
        CreatedBy: 'creator-1',
        approval_status: 'RELEASE',
      },
    ]);
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.RELEASED,
      workflowStageCode: 'RELEASE',
      workflowStageLabel: 'Released',
      availableActions: [],
      nextApproverId: null,
      nextApproverName: null,
      ownerMode: 'assigned',
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === '5M1ERELEASE-06-17' && (action === 'view' || action === 'viewlist'),
    );

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const records = await service.getAllApplications('RELEASE', { userId: 'viewer-1', roleName: 'USER' });

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(
      expect.objectContaining({
        control_no: '5M-REL',
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.RELEASED,
      }),
    );
  });

  it('returns shared for-approval queue records to role-assigned users on assigned scope', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-FAP',
        CreatedBy: 'creator-1',
        approval_status: 'FAPPROVED',
      },
    ]);
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.REVIEWER,
      workflowStageCode: '4',
      workflowStageLabel: 'Awaiting Reviewer',
      availableActions: ['submit'],
      nextApproverId: null,
      nextApproverName: null,
      ownerMode: 'shared-queue',
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === '5M1EApprovalSecEnvi-06-17' && (action === 'view' || action === 'viewlist'),
    );

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const records = await service.getAllApplications(
      'FAPPROVED',
      { userId: 'approver-1', roleName: 'USER' },
      'assigned',
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(
      expect.objectContaining({
        control_no: '5M-FAP',
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.REVIEWER,
      }),
    );
  });

  it('returns explicitly assigned for-approval rows to role-visible users on the for-approval queue', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-FAP-ASSIGNED',
        CreatedBy: 'creator-1',
        approval_status: 'FOR APPROVAL',
      },
    ]);
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER,
      workflowStageCode: '7',
      workflowStageLabel: 'Awaiting Final Approver',
      availableActions: [],
      nextApproverId: 'other-approver',
      nextApproverName: 'Other Approver',
      ownerMode: 'assigned',
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === '5M1EApprovalSecEnvi-06-17' && (action === 'view' || action === 'viewlist'),
    );

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const records = await service.getAllApplications(
      'FAPPROVED',
      { userId: 'approver-1', roleName: 'USER' },
      'assigned',
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(
      expect.objectContaining({
        control_no: '5M-FAP-ASSIGNED',
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER,
      }),
    );
  });

  it('returns the full for-approval queue to admin even when assigned scope is requested', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-FAP-CHECK',
        CreatedBy: 'creator-1',
        approval_status: 'FOR APPROVAL',
      },
      {
        ID: 2,
        ControlNo: '5M-FAP-APPROVE',
        CreatedBy: 'creator-2',
        approval_status: 'FOR APPROVAL',
      },
    ]);
    workflowServiceMock.getWorkflowMetadata
      .mockResolvedValueOnce({
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER,
        workflowStageCode: '5',
        workflowStageLabel: 'For Checked',
        availableActions: [],
        nextApproverId: 'checker-1',
        nextApproverName: 'Checker One',
        ownerMode: 'assigned',
      })
      .mockResolvedValueOnce({
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER,
        workflowStageCode: '6',
        workflowStageLabel: 'For Approved',
        availableActions: [],
        nextApproverId: 'approver-1',
        nextApproverName: 'Approver One',
        ownerMode: 'assigned',
      });

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const records = await service.getAllApplications(
      'FAPPROVED',
      { userId: 'admin-1', roleName: 'TIP_ADMIN' },
      'assigned',
    );

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.control_no)).toEqual(['5M-FAP-CHECK', '5M-FAP-APPROVE']);
  });

  it('returns full search results to users with the 5M1E search form even when they are not participants', async () => {
    repositoryMock.findAllWithApproval.mockResolvedValue([
      {
        ID: 1,
        ControlNo: '5M-001',
        CreatedBy: 'creator-1',
        approval_status: 'DRAFT',
      },
      {
        ID: 2,
        ControlNo: '5M-002',
        CreatedBy: 'other-user',
        approval_status: 'RELEASE',
      },
    ]);
    workflowServiceMock.getWorkflowMetadata
      .mockResolvedValueOnce({
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.DRAFT,
        workflowStageCode: 'DRAFT',
        workflowStageLabel: 'Draft',
        availableActions: [],
        nextApproverId: null,
        nextApproverName: null,
        ownerMode: 'assigned',
      })
      .mockResolvedValueOnce({
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.RELEASED,
        workflowStageCode: 'RELEASE',
        workflowStageLabel: 'Released',
        availableActions: [],
        nextApproverId: null,
        nextApproverName: null,
        ownerMode: 'assigned',
      });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === '5M1ESEARCH-11-01' && (action === 'view' || action === 'viewlist'),
    );

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const records = await service.getAllApplications('SEARCH', { userId: 'search-user-1', roleName: 'USER' });

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.control_no)).toEqual(['5M-001', '5M-002']);
  });

  it('denies detail read to unrelated users without stage or search visibility', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ID: 1,
      ControlNo: '5M-001',
      CreatedBy: 'creator-1',
      approval_status: 'FOR APPROVAL',
    });
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER,
      workflowStageCode: '7',
      workflowStageLabel: 'Awaiting Final Approver',
      availableActions: [],
      nextApproverId: 'approver-1',
      nextApproverName: 'Approver One',
      ownerMode: 'assigned',
    });

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);

    await expect(
      service.getApplication('5M-001', { userId: 'outsider-1', roleName: 'USER' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repositoryMock.findParts).not.toHaveBeenCalled();
  });

  it('allows detail read to stage-visible users', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ID: 1,
      ControlNo: '5M-001',
      CreatedBy: 'creator-1',
      approval_status: 'FOR APPROVAL',
      supplier_name: 'Supplier One',
    });
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.REVIEWER,
      workflowStageCode: '4',
      workflowStageLabel: 'Awaiting Reviewer',
      availableActions: [],
      nextApproverId: 'reviewer-1',
      nextApproverName: 'Reviewer One',
      ownerMode: 'assigned',
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === '5M1EApprovalSecEnvi-06-17' && (action === 'view' || action === 'viewlist'),
    );

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const record = await service.getApplication('5M-001', { userId: 'stage-reader-1', roleName: 'USER' });

    expect(record).toEqual(
      expect.objectContaining({
        control_no: '5M-001',
        workflowStage: FIVE_M1E_WORKFLOW_STAGE.REVIEWER,
      }),
    );
  });

  it('allows detail read to search-visible users', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ID: 1,
      ControlNo: '5M-002',
      CreatedBy: 'creator-1',
      approval_status: 'RELEASE',
    });
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.RELEASED,
      workflowStageCode: 'RELEASE',
      workflowStageLabel: 'Released',
      availableActions: [],
      nextApproverId: null,
      nextApproverName: null,
      ownerMode: 'assigned',
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === '5M1ESEARCH-11-01' && (action === 'view' || action === 'viewlist'),
    );

    const service = new FiveM1EService(undefined as any, permissionServiceMock as any);
    const record = await service.getApplication('5M-002', { userId: 'search-user-1', roleName: 'USER' });

    expect(record.control_no).toBe('5M-002');
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
      approval_seq: 1,
      envi_approver_necessary: 'NO',
    });
    repositoryMock.updateApprovalStatus.mockResolvedValue(undefined);

    const service = new FiveM1EService();
    await service.updateApplication('5M-001', { mpd_approver: 'approver-1' } as any, [], { userId: 'user-1' });

    expect(repositoryMock.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'SUBMITTED',
      expect.objectContaining({
        MPDApprover: 'approver-1',
        ModifiedDate: expect.any(Date),
      }),
    );
  });

  it('rejects out-of-stage final assignee mutation during evaluation editing', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-001',
      approval_status: 'FOR APPROVAL',
      approval_seq: 4,
      envi_approver_necessary: 'NO',
    });

    const service = new FiveM1EService();

    await expect(
      service.updateApplication(
        '5M-001',
        { final_approver: 'final-1' } as any,
        [],
        { userId: 'reviewer-1' },
      ),
    ).rejects.toThrow('5M1E generic save cannot modify final_approver during REVIEWER');

    expect(repositoryMock.updateApprovalStatus).not.toHaveBeenCalled();
  });

  it('validates allowed stage assignee changes against shared assignment coverage rules', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-001',
      approval_status: 'SUBMITTED',
      approval_seq: 1,
      envi_approver_necessary: 'NO',
    });
    repositoryMock.updateApprovalStatus.mockResolvedValue(undefined);

    const service = new FiveM1EService();
    await service.updateApplication(
      '5M-001',
      { mpd_approver: 'approver-1' } as any,
      [],
      { userId: 'mpd-1' },
    );

    expect(assignmentValidationMock.validateAssignmentActorForForms).toHaveBeenCalledWith(
      'approver-1',
      'approver',
      expect.arrayContaining(['5M1EApprovalSecDes-06-17']),
      expect.objectContaining({ roleLabel: 'mpd_approver' }),
    );
    expect(repositoryMock.updateApprovalStatus).toHaveBeenCalledWith(
      '5M-001',
      'SUBMITTED',
      expect.objectContaining({
        MPDApprover: 'approver-1',
        ModifiedDate: expect.any(Date),
      }),
    );
  });

  it('denies updates to unrelated users even if route middleware is bypassed', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-001',
      approval_status: 'FOR APPROVAL',
    });
    workflowServiceMock.canUserUpdateRecord.mockResolvedValue(false);

    const service = new FiveM1EService();

    await expect(
      service.updateApplication('5M-001', { reviewer: 'reviewer-1' } as any, [], { userId: 'outsider-1' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repositoryMock.updateApprovalStatus).not.toHaveBeenCalled();
  });

  it('cleans status remarks and cc rows when deleting an application', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-001',
      approval_status: 'DRAFT',
    });

    const service = new FiveM1EService();
    await service.deleteApplication('5M-001', { userId: 'creator-1' });

    expect(repositoryMock.replaceStatusRemarks).toHaveBeenCalledWith('5M-001', []);
    expect(repositoryMock.replaceCCUsers).toHaveBeenCalledWith('5M-001', []);
    expect(repositoryMock.deleteApproval).toHaveBeenCalledWith('5M-001');
    expect(repositoryMock.deleteByControlNo).toHaveBeenCalledWith('5M-001');
  });

  it('denies delete to unrelated users even if they hold delete permission upstream', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ControlNo: '5M-001',
      approval_status: 'DRAFT',
    });
    workflowServiceMock.canUserDeleteRecord.mockResolvedValue(false);

    const service = new FiveM1EService();

    await expect(
      service.deleteApplication('5M-001', { userId: 'outsider-1', roleName: 'USER' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repositoryMock.deleteByControlNo).not.toHaveBeenCalled();
  });

  it('allows readable actors to download attachments', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ID: 1,
      ControlNo: '5M-001',
      CreatedBy: 'creator-1',
      approval_status: 'DRAFT',
    });

    const service = new FiveM1EService(
      undefined as any,
      permissionServiceMock as any,
      attachmentServiceMock as any,
    );
    const result = await service.downloadAttachment('att-1', { userId: 'creator-1', roleName: 'USER' });

    expect(attachmentServiceMock.getAttachmentInfo).toHaveBeenCalledWith('5m1e-main', 'att-1');
    expect(attachmentServiceMock.downloadAttachment).toHaveBeenCalledWith('5m1e-main', 'att-1');
    expect(result).toEqual(
      expect.objectContaining({
        fileName: 'file.pdf',
      }),
    );
  });

  it('denies attachment download to unrelated users', async () => {
    repositoryMock.findWithApproval.mockResolvedValue({
      ID: 1,
      ControlNo: '5M-001',
      CreatedBy: 'creator-1',
      approval_status: 'FOR APPROVAL',
    });
    workflowServiceMock.getWorkflowMetadata.mockResolvedValue({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER,
      workflowStageCode: '7',
      workflowStageLabel: 'Awaiting Final Approver',
      availableActions: [],
      nextApproverId: 'approver-1',
      nextApproverName: 'Approver One',
      ownerMode: 'assigned',
    });

    const service = new FiveM1EService(
      undefined as any,
      permissionServiceMock as any,
      attachmentServiceMock as any,
    );

    await expect(
      service.downloadAttachment('att-1', { userId: 'outsider-1', roleName: 'USER' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(attachmentServiceMock.downloadAttachment).not.toHaveBeenCalled();
  });

  it('returns not found for missing attachments', async () => {
    attachmentServiceMock.getAttachmentInfo.mockRejectedValue(new NotFoundError('Attachment not found'));

    const service = new FiveM1EService(
      undefined as any,
      permissionServiceMock as any,
      attachmentServiceMock as any,
    );

    await expect(
      service.downloadAttachment('missing-att', { userId: 'creator-1', roleName: 'USER' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
