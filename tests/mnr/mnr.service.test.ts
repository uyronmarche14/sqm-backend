import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllDetailed: vi.fn(),
  findByIdDetailed: vi.fn(),
  findLatestResponsesByMnrIds: vi.fn(),
  findAttachmentOwner: vi.fn(),
  executeTransaction: vi.fn(),
}));

const attachmentServiceMock = vi.hoisted(() => ({
  downloadAttachment: vi.fn(),
  deleteStoredAttachments: vi.fn().mockResolvedValue(undefined),
}));

const permissionServiceMock = vi.hoisted(() => ({
  checkRolePermission: vi.fn(),
}));

vi.mock('../../src/modules/mnr/mnr.repository.js', () => ({
  mnrRepository: repositoryMock,
}));

vi.mock('../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
}));

vi.mock('../../src/shared/services/attachment.service.js', () => ({
  attachmentService: attachmentServiceMock,
}));

import { mnrService } from '../../src/modules/mnr/mnr.service.js';

describe('MnrService workflow metadata hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findLatestResponsesByMnrIds.mockResolvedValue([]);
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
  });

  it('includes workflow metadata on detail reads', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-1',
        control_no: 'MNR-001',
        request_status: 'SU',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        actual_initial_report_date: null,
        actual_final_report_date: null,
        remarks: null,
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        issuer_date: null,
        issuer_remarks: null,
        checker_date: null,
        checker_remarks: null,
        approver_date: null,
        approver_remarks: null,
        site_name: 'Site',
        supplier_name: 'Supplier',
        product_name: 'Product',
        model_name: 'Model',
        model_no: 'ModelNo',
        mfg_area_name: 'Area',
        category_name: 'Category',
        mnr_type_name: 'Type',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        attention_name: 'Attention',
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
      },
      details: [],
      response: null,
      verificationEntries: [],
      ccList: [],
      attachments: [],
      responseAttachments: [],
    });

    const result = await mnrService.getRecordById('mnr-1', { userId: 'checker-1' });

    expect(result.workflow).toEqual(expect.objectContaining({
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker',
    }));
    expect(result.mainDetails).toEqual(expect.objectContaining({
      status: 'AWAITING_CHECKED',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      availableActions: ['check-main', 'reject-main'],
    }));
  });

  it('includes actor-aware cycle 1 availableActions on list reads', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-1',
        control_no: 'MNR-001',
        status: 'SU',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Attention',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);

    const result = await mnrService.getAllRecords({ status: 'SUBMITTED' }, { userId: 'checker-1' });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      status: 'AWAITING_CHECKED',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      availableActions: ['check-main', 'reject-main'],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker',
    }));
  });

  it('hydrates cycle 2 next approver names from the latest response row on list reads', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-2',
        control_no: 'MNR-002',
        status: 'RC',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'cycle1-checker',
        approver_id: 'cycle1-approver',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Attention',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);
    repositoryMock.findLatestResponsesByMnrIds.mockResolvedValue([
      {
        mnr_id: 'mnr-2',
        checker_id: 'cycle2-checker',
        checker_name: 'Cycle 2 Checker',
        approver_id: 'cycle2-approver',
        approver_name: 'Cycle 2 Approver',
      },
    ]);

    const result = await mnrService.getAllRecords(
      { status: 'RESPONSE_AWAITING_CHECKED' },
      { userId: 'cycle2-checker' },
    );

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'RESPONSE_AWAITING_CHECKED',
      workflowStage: 'CHECKER_2ND',
      workflowStageCode: '16',
      nextApproverId: 'cycle2-checker',
      nextApproverName: 'Cycle 2 Checker',
      response_checker_id: 'cycle2-checker',
      response_checker_name: 'Cycle 2 Checker',
      response_approver_id: 'cycle2-approver',
      response_approver_name: 'Cycle 2 Approver',
    }));
  });

  it('hydrates final issuer actions for response approval stage 19 on list reads', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-3',
        control_no: 'MNR-003',
        status: 'RV',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        approver_id: 'cycle1-approver',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Attention',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);

    const result = await mnrService.getAllRecords(
      { status: 'RESPONSE_RECEIVED' },
      { userId: 'issuer-1' },
    );

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'RESPONSE_RECEIVED',
      workflowStage: 'ISSUER_3RD',
      workflowStageCode: '19',
      availableActions: ['accept-response', 'not-accept-response'],
      nextApproverId: 'issuer-1',
      nextApproverName: 'Issuer',
    }));
  });

  it('hydrates supplier response actions on issued list reads when attention matches the actor', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-4',
        control_no: 'MNR-004',
        status: 'IS',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'supplier-user-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: new Date('2026-03-12'),
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Supplier User',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);

    const result = await mnrService.getAllRecords(
      { status: 'ISSUED' },
      { userId: 'supplier-user-1' },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      status: 'ISSUED',
      workflowStage: 'SUPPLIER',
      workflowStageCode: '11',
      availableActions: ['save-initial-response', 'submit-initial-response'],
      nextApproverId: 'supplier-user-1',
    }));
  });

  it('grants full queue visibility to non-admin users with MNR queue viewList access', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-5',
        control_no: 'MNR-005',
        status: 'SU',
        date_created: new Date('2026-03-12'),
        supplier_id: 'supplier-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
      },
    ]);
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'MNR-12-03' && action === 'viewlist',
    );

    const result = await mnrService.getAllRecords(
      { status: 'SUBMITTED' },
      { userId: 'viewer-1', roleName: 'INTERNAL USER' },
    );

    expect(result).toHaveLength(1);
  });

  it('keeps non-admin users scoped when they do not have queue viewList access', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-6',
        control_no: 'MNR-006',
        status: 'SU',
        date_created: new Date('2026-03-12'),
        supplier_id: 'supplier-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
      },
    ]);

    const result = await mnrService.getAllRecords(
      { status: 'SUBMITTED' },
      { userId: 'viewer-1', roleName: 'INTERNAL USER' },
    );

    expect(result).toHaveLength(0);
  });

  it('does not let queue viewList widen the mine scope', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-7',
        control_no: 'MNR-007',
        status: 'SU',
        date_created: new Date('2026-03-12'),
        supplier_id: 'supplier-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
      },
    ]);
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'MNR-12-03' && action === 'viewlist',
    );

    const result = await mnrService.getAllRecords(
      { status: 'SUBMITTED', scope: 'mine' },
      { userId: 'viewer-1', roleName: 'INTERNAL USER' },
    );

    expect(result).toHaveLength(0);
  });

  it('does not let queue viewList access bypass active-record detail security', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-8',
        control_no: 'MNR-008',
        request_status: 'SU',
        date_created: new Date('2026-03-12'),
        supplier_id: 'supplier-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        product_name: 'Product',
        model_name: 'Model',
        model_no: 'ModelNo',
        mfg_area_name: 'Area',
        category_name: 'Category',
        mnr_type_name: 'Type',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        attention_name: 'Attention',
      },
      details: [],
      response: null,
      verificationEntries: [],
      ccList: [],
      attachments: [],
      responseAttachments: [],
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'MNR-12-03' && action === 'viewlist',
    );

    await expect(
      mnrService.getRecordById('mnr-8', {
        userId: 'viewer-1',
        roleName: 'INTERNAL USER',
      }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to view this MNR record.',
    });
  });

  it('returns only assigned records when assigned scope is requested', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-9',
        control_no: 'MNR-009',
        status: 'SU',
        date_created: new Date('2026-03-12'),
        supplier_id: 'supplier-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
      },
      {
        id: 'mnr-10',
        control_no: 'MNR-010',
        status: 'SU',
        date_created: new Date('2026-03-12'),
        supplier_id: 'supplier-1',
        encoder_id: 'encoder-2',
        issuer_id: 'issuer-2',
        checker_id: 'checker-2',
        approver_id: 'approver-2',
      },
    ]);

    const result = await mnrService.getAllRecords(
      { status: 'SUBMITTED', scope: 'assigned' },
      { userId: 'checker-1', roleName: 'USER' },
    );

    expect(result.map((record) => record.id)).toEqual(['mnr-9']);
  });

  it('blocks generic updates during approval-owned stages', async () => {
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) =>
      callback({
        selectFrom: vi.fn(() => ({
          select: vi.fn(() => ({
            where: vi.fn(() => ({
              executeTakeFirst: vi.fn().mockResolvedValue({
                mnr_id: 'mnr-11',
                request_status: 'SU',
                report_issuance_8d: 1,
              }),
            })),
          })),
        })),
      }),
    );
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-11',
        control_no: 'MNR-011',
        request_status: 'SU',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
      },
    });

    await expect(
      mnrService.updateRecord(
        'mnr-11',
        { remarks: 'illegal edit' } as any,
        { userId: 'issuer-1', roleName: 'USER' },
      ),
    ).rejects.toMatchObject({
      message: 'You do not have permission to update this MNR record.',
    });
  });

  it('blocks response content saves for unrelated actors', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-11b',
        control_no: 'MNR-011B',
        request_status: 'IS',
        supplier_id: 'supplier-1',
        attention_id: 'supplier-user-1',
      },
      response: null,
    });

    await expect(
      mnrService.saveResponseContent(
        'mnr-11b',
        { d1: 'team' },
        { userId: 'outsider-1', roleName: 'USER' },
      ),
    ).rejects.toMatchObject({
      message: 'You do not have permission to save this MNR record.',
    });
  });

  it('allows deleting rejected pre-issuance records for the owner', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const where = vi.fn(() => ({ execute }));
    const deleteFrom = vi.fn(() => ({ where }));
    const selectFrom = vi.fn((table: string) => {
      if (table === 'MNR_LOTS') {
        return {
          select: vi.fn(() => ({
            where: vi.fn(() => ({
              executeTakeFirst: vi.fn().mockResolvedValue({ mnr_id: 'mnr-12' }),
            })),
          })),
        };
      }

      if (table === 'MNR_ATTACHMENT') {
        return {
          select: vi.fn(() => ({
            where: vi.fn(() => ({
              execute: vi.fn().mockResolvedValue([]),
            })),
          })),
        };
      }

      if (table === 'MNR_RESPONSE') {
        return {
          select: vi.fn(() => ({
            where: vi.fn(() => ({
              execute: vi.fn().mockResolvedValue([]),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    repositoryMock.executeTransaction.mockImplementation(async (callback: any) =>
      callback({ selectFrom, deleteFrom }),
    );
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-12',
        control_no: 'MNR-012',
        request_status: 'RE',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
      },
    });

    const result = await mnrService.deleteRecord('mnr-12', {
      userId: 'issuer-1',
      roleName: 'USER',
    });

    expect(deleteFrom).toHaveBeenCalledWith('MNR_LOTS');
    expect(result).toEqual({
      success: true,
      message: 'Record and all associated data deleted successfully',
    });
  });

  it('denies deleting post-issuance records', async () => {
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) =>
      callback({
        selectFrom: vi.fn((table: string) => {
          if (table === 'MNR_LOTS') {
            return {
              select: vi.fn(() => ({
                where: vi.fn(() => ({
                  executeTakeFirst: vi.fn().mockResolvedValue({ mnr_id: 'mnr-13' }),
                })),
              })),
            };
          }

          if (table === 'MNR_ATTACHMENT' || table === 'MNR_RESPONSE') {
            return {
              select: vi.fn(() => ({
                where: vi.fn(() => ({
                  execute: vi.fn().mockResolvedValue([]),
                })),
              })),
            };
          }

          throw new Error(`Unexpected table ${table}`);
        }),
        deleteFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            execute: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      }),
    );
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-13',
        control_no: 'MNR-013',
        request_status: 'IS',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        attention_id: 'supplier-user-1',
        supplier_id: 'supplier-1',
      },
      response: null,
    });

    await expect(
      mnrService.deleteRecord('mnr-13', { userId: 'issuer-1', roleName: 'USER' }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to delete this MNR record.',
    });
  });

  it('downloads attachments only when the actor can read the owning record', async () => {
    repositoryMock.findAttachmentOwner.mockResolvedValue({
      moduleType: 'mnr-main',
      mnrId: 'mnr-14',
    });
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-14',
        control_no: 'MNR-014',
        request_status: 'SU',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
      },
      response: null,
      details: [],
      verificationEntries: [],
      ccList: [],
      attachments: [],
      responseAttachments: [],
    });
    attachmentServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/mnr.txt',
      fileName: 'mnr.txt',
      mimeType: 'text/plain',
    });

    const result = await mnrService.downloadAttachment('att-1', {
      userId: 'checker-1',
      roleName: 'USER',
    });

    expect(attachmentServiceMock.downloadAttachment).toHaveBeenCalledWith('mnr-main', 'att-1');
    expect(result).toEqual({
      filePath: '/tmp/mnr.txt',
      fileName: 'mnr.txt',
      mimeType: 'text/plain',
    });
  });

  it('denies attachment downloads for unrelated users', async () => {
    repositoryMock.findAttachmentOwner.mockResolvedValue({
      moduleType: 'mnr-main',
      mnrId: 'mnr-15',
    });
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-15',
        control_no: 'MNR-015',
        request_status: 'SU',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
      },
      response: null,
      details: [],
      verificationEntries: [],
      ccList: [],
      attachments: [],
      responseAttachments: [],
    });

    await expect(
      mnrService.downloadAttachment('att-1', { userId: 'outsider-1', roleName: 'USER' }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to download this MNR record.',
    });

    expect(attachmentServiceMock.downloadAttachment).not.toHaveBeenCalled();
  });
});
