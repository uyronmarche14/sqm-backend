import { beforeEach, describe, expect, it, vi } from 'vitest';

const controlNumberServiceMock = vi.hoisted(() => ({
  previewSqmp: vi.fn(),
  getControlNoState: vi.fn(),
}));

const repositoryMock = vi.hoisted(() => ({
  executeTransaction: vi.fn(),
  findByIdDetailed: vi.fn(),
  findAllDetailed: vi.fn(),
  findLatestResponsesBySqmpIds: vi.fn(),
  findSupplierIdsByUserId: vi.fn(),
  findMainAttachmentOwner: vi.fn(),
  findResponseAttachmentOwner: vi.fn(),
}));

const userRepositoryMock = vi.hoisted(() => ({
  findRoleById: vi.fn(),
  findById: vi.fn(),
}));

const permissionServiceMock = vi.hoisted(() => ({
  checkRolePermission: vi.fn(),
}));

const attachmentServiceMock = vi.hoisted(() => ({
  downloadAttachment: vi.fn(),
  syncAttachments: vi.fn().mockResolvedValue({
    persisted: [],
    cleanupQueue: [],
  }),
  deleteStoredAttachments: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/modules/sqmp/sqmp.repository.js', () => ({
  sqmpRepository: repositoryMock,
}));

vi.mock('../../src/modules/users/user.repository.js', () => ({
  userRepository: userRepositoryMock,
}));

vi.mock('../../src/shared/services/control-number.service.js', () => ({
  controlNumberService: controlNumberServiceMock,
}));

vi.mock('../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
}));

vi.mock('../../src/shared/services/attachment.service.js', () => ({
  attachmentService: attachmentServiceMock,
}));

import { MainSqmpService } from '../../src/modules/sqmp/main/main.service';
import { SQMP_WORKFLOW_ACTION } from '../../src/modules/sqmp/workflow/workflow.constants';

const makeTransactionHarness = (resolvedAttentionUserId?: string) => {
  const insertedSqmpValues: any[] = [];
  const updatedSqmpValues: any[] = [];

  const trx = {
    selectFrom: vi.fn(() => ({
      select: vi.fn(() => ({
        where: vi.fn(() => ({
          executeTakeFirst: vi.fn().mockResolvedValue(
            resolvedAttentionUserId ? { user_id: resolvedAttentionUserId } : undefined,
          ),
        })),
      })),
    })),
    insertInto: vi.fn((table: string) => ({
      values: vi.fn((value: unknown) => {
        if (table === 'SQMP') {
          insertedSqmpValues.push(value);
        }

        return {
          execute: vi.fn().mockResolvedValue(undefined),
        };
      }),
    })),
    updateTable: vi.fn((table: string) => ({
      set: vi.fn((value: unknown) => {
        if (table === 'SQMP') {
          updatedSqmpValues.push(value);
        }

        return {
          where: vi.fn(() => ({
            execute: vi.fn().mockResolvedValue(undefined),
          })),
        };
      }),
    })),
    deleteFrom: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  };

  return { trx, insertedSqmpValues, updatedSqmpValues };
};

describe('MainSqmpService attention resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controlNumberServiceMock.previewSqmp.mockResolvedValue('SQMP-2026-SITE-0-A');
    controlNumberServiceMock.getControlNoState.mockReturnValue('manual');
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    attachmentServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/test.pdf',
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('resolves SUPPLIERSUSER.Id to USERS.user_id during create', async () => {
    const tx = makeTransactionHarness('attention-user-1');
    repositoryMock.executeTransaction.mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => callback(tx.trx));

    const service = new MainSqmpService();

    await service.createRecord({
      site_id: 'site-1',
      supplier_id: 'supplier-1',
      attention_id: 'supplier-user-link-1',
      fiscal_year: 2026,
      semester: '1ST',
      due_date: '2026-03-20',
    } as any, 'issuer-1', []);

    expect(tx.insertedSqmpValues).toHaveLength(1);
    expect(tx.insertedSqmpValues[0]).toEqual(expect.objectContaining({
      attention_id: 'attention-user-1',
    }));
  });

  it('keeps direct USERS.user_id values during create when no SUPPLIERSUSER row is found', async () => {
    const tx = makeTransactionHarness();
    repositoryMock.executeTransaction.mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => callback(tx.trx));

    const service = new MainSqmpService();

    await service.createRecord({
      site_id: 'site-1',
      supplier_id: 'supplier-1',
      attention_id: 'attention-user-99',
      fiscal_year: 2026,
      semester: '1ST',
      due_date: '2026-03-20',
    } as any, 'issuer-1', []);

    expect(tx.insertedSqmpValues).toHaveLength(1);
    expect(tx.insertedSqmpValues[0]).toEqual(expect.objectContaining({
      attention_id: 'attention-user-99',
    }));
  });

  it('resolves SUPPLIERSUSER.Id to USERS.user_id during update', async () => {
    const tx = makeTransactionHarness('attention-user-2');
    repositoryMock.executeTransaction.mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => callback(tx.trx));
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-1',
        encoder_id: 'issuer-1',
        issuer_id: 'issuer-1',
        checker_id: null,
        approver_id: null,
        site_id: 'site-1',
      },
    });
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'USER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-1' });

    const service = new MainSqmpService();

    await service.updateRecord(
      'sqmp-1',
      { attention_id: 'supplier-user-link-2' } as any,
      'issuer-1',
      'role-1',
      [],
    );

    expect(tx.updatedSqmpValues).toContainEqual(expect.objectContaining({
      attention_id: 'attention-user-2',
    }));
  });

  it('includes cycle 2 availableActions on list records using the latest SQMP_RESPONSE assignee data', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqmp_id: 'sqmp-cycle2-1',
        request_status: '16',
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        issuer_id: 'issuer-1',
        issuer_name: 'Issuer',
        checker_id: 'cycle1-checker',
        approver_id: 'cycle1-approver',
      },
    ]);
    repositoryMock.findLatestResponsesBySqmpIds.mockResolvedValue([
      {
        sqmp_id: 'sqmp-cycle2-1',
        checker_id: 'closure-checker-1',
        checker_name: 'Closure Checker',
        approver_id: 'closure-approver-1',
        approver_name: 'Closure Approver',
      },
    ]);
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue([]);
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'USER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-9' });

    const service = new MainSqmpService();
    const records = await service.getAllRecords('RESPONSE_AWAITING_CHECKED', 'closure-checker-1', 'role-1');

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(expect.objectContaining({
      workflowStageCode: '16',
      availableActions: [
        SQMP_WORKFLOW_ACTION.CHECK_CLOSURE,
        SQMP_WORKFLOW_ACTION.REJECT_CLOSURE,
      ],
      nextApproverId: 'closure-checker-1',
      nextApproverName: 'Closure Checker',
    }));
  });

  it('lets ADMIN read the full SQM Plan queue without viewList', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqmp_id: 'sqmp-1',
        request_status: '3',
        site_id: 'site-a',
        supplier_id: 'supplier-a',
      },
      {
        sqmp_id: 'sqmp-2',
        request_status: '4',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
      },
    ]);
    repositoryMock.findLatestResponsesBySqmpIds.mockResolvedValue([]);
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ADMIN' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-a' });

    const service = new MainSqmpService();
    const records = await service.getAllRecords('AWAITING_APPROVAL', 'admin-1', 'role-admin');

    expect(records).toHaveLength(2);
  });

  it('does not treat MPD as a global SQM Plan reader anymore', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqmp_id: 'sqmp-1',
        request_status: '4',
        site_id: 'site-a',
        supplier_id: 'supplier-a',
        approver_id: 'approver-1',
      },
    ]);
    repositoryMock.findLatestResponsesBySqmpIds.mockResolvedValue([]);
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'MPD USER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-z' });

    const service = new MainSqmpService();
    const records = await service.getAllRecords('AWAITING_APPROVAL', 'mpd-user-1', 'role-mpd');

    expect(records).toHaveLength(0);
  });

  it('does not let non-admin SQM Plan viewList widen active queues', async () => {
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string, action: string) => (
      action === 'viewlist' && formId === 'SQMP-09-03'
    ));
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqmp_id: 'sqmp-1',
        request_status: '3',
        site_id: 'site-a',
        supplier_id: 'supplier-a',
      },
      {
        sqmp_id: 'sqmp-2',
        request_status: '4',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
      },
    ]);
    repositoryMock.findLatestResponsesBySqmpIds.mockResolvedValue([]);
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-z' });

    const service = new MainSqmpService();
    const records = await service.getAllRecords('AWAITING_APPROVAL', 'viewer-1', 'role-viewlist');

    expect(records).toHaveLength(0);
  });

  it('keeps assigned approver visibility even without SQM Plan viewList', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqmp_id: 'sqmp-1',
        request_status: '4',
        site_id: 'site-a',
        supplier_id: 'supplier-a',
        approver_id: 'approver-1',
        approver_name: 'Approver One',
      },
      {
        sqmp_id: 'sqmp-2',
        request_status: '4',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
        approver_id: 'approver-2',
        approver_name: 'Approver Two',
      },
    ]);
    repositoryMock.findLatestResponsesBySqmpIds.mockResolvedValue([]);
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-z' });

    const service = new MainSqmpService();
    const records = await service.getAllRecords('AWAITING_APPROVAL', 'approver-1', 'role-1');

    expect(records).toHaveLength(1);
    expect(records[0]?.sqmp_id).toBe('sqmp-1');
    expect(records[0]?.availableActions).toEqual([
      SQMP_WORKFLOW_ACTION.APPROVE_MAIN,
      SQMP_WORKFLOW_ACTION.REJECT_MAIN,
    ]);
  });

  it('does not allow detail access when the user only has role-based viewList for an active queue record', async () => {
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string, action: string) => (
      action === 'viewlist' && formId === 'SQMP-09-03'
    ));
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-1',
        control_no: 'SQMP-1',
        request_status: '4',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
      },
      mainDocuments: [],
      appendixDocuments: [],
      ccList: [],
      responses: [],
      statusRemarks: [],
    });
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-a' });

    const service = new MainSqmpService();
    await expect(service.getRecordById('sqmp-1', 'viewer-1', 'role-viewlist')).rejects.toThrow(/permission to view/i);
  });

  it('blocks attachment downloads when the user only has queue viewList for an active record', async () => {
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string, action: string) => (
      action === 'viewlist' && formId === 'SQMP-09-03'
    ));
    repositoryMock.findMainAttachmentOwner.mockResolvedValue({
      sqmp_id: 'sqmp-1',
      moduleType: 'sqmp-document',
    });
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-1',
        control_no: 'SQMP-1',
        request_status: '4',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
      },
      mainDocuments: [],
      appendixDocuments: [],
      ccList: [],
      responses: [],
      statusRemarks: [],
    });
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-a' });

    const service = new MainSqmpService();
    await expect(service.downloadMainAttachment('att-1', 'viewer-1', 'role-viewlist')).rejects.toThrow(/permission to view/i);
    expect(attachmentServiceMock.downloadAttachment).not.toHaveBeenCalled();
  });

  it('allows detail access from a reference surface when the user only has reference viewList access', async () => {
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string, action: string) => (
      action === 'viewlist' && formId === 'SQMP-09-13'
    ));
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-2',
        control_no: 'SQMP-2',
        request_status: '11',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
      },
      mainDocuments: [],
      appendixDocuments: [],
      ccList: [],
      responses: [],
      statusRemarks: [],
    });
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-a' });

    const service = new MainSqmpService();
    const record = await service.getRecordById('sqmp-2', 'viewer-1', 'role-viewlist', 'search');

    expect(record).toEqual(expect.objectContaining({
      sqmp_id: 'sqmp-2',
      control_no: 'SQMP-2',
    }));
  });

  it('allows attachment downloads from a reference surface without broadening core read access', async () => {
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string, action: string) => (
      action === 'viewlist' && formId === 'SQMP-09-14'
    ));
    repositoryMock.findMainAttachmentOwner.mockResolvedValue({
      sqmp_id: 'sqmp-3',
      moduleType: 'sqmp-document',
    });
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-3',
        control_no: 'SQMP-3',
        request_status: '1',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
      },
      mainDocuments: [],
      appendixDocuments: [],
      ccList: [],
      responses: [
        {
          response_id: 'response-1',
          request_status: '24',
        },
      ],
      statusRemarks: [],
    });
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-a' });

    const service = new MainSqmpService();
    await service.downloadMainAttachment('att-2', 'viewer-1', 'role-viewlist', 'report');

    expect(attachmentServiceMock.downloadAttachment).toHaveBeenCalledWith('sqmp-document', 'att-2');
  });

  it('allows response attachment downloads from a reference surface when the record is surface-visible', async () => {
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string, action: string) => (
      action === 'viewlist' && formId === 'SQMP-09-14'
    ));
    repositoryMock.findResponseAttachmentOwner.mockResolvedValue({
      sqmp_id: 'sqmp-4',
      moduleType: 'sqmp-response-document',
    });
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-4',
        control_no: 'SQMP-4',
        request_status: '1',
        site_id: 'site-b',
        supplier_id: 'supplier-b',
      },
      mainDocuments: [],
      appendixDocuments: [],
      ccList: [],
      responses: [
        {
          response_id: 'response-4',
          request_status: '24',
        },
      ],
      statusRemarks: [],
    });
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'site-a' });

    const service = new MainSqmpService();
    await service.downloadResponseAttachment('resp-att-1', 'viewer-1', 'role-viewlist', 'report');

    expect(attachmentServiceMock.downloadAttachment).toHaveBeenCalledWith('sqmp-response-document', 'resp-att-1');
  });
});
