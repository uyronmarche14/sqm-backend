import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllDetailed: vi.fn(),
  findByIdDetailed: vi.fn(),
  findAttachmentOwner: vi.fn(),
  findSiteCode: vi.fn(),
  executeTransaction: vi.fn(),
}));

const attachmentServiceMock = vi.hoisted(() => ({
  downloadAttachment: vi.fn(),
}));

const permissionServiceMock = vi.hoisted(() => ({
  checkRolePermission: vi.fn(),
}));

vi.mock('../../src/modules/sqpr/sqpr.repository.js', () => ({
  sqprRepository: repositoryMock,
}));

vi.mock('../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
}));

vi.mock('../../src/shared/services/attachment.service.js', () => ({
  attachmentService: attachmentServiceMock,
}));

import { SqprService } from '../../src/modules/sqpr/sqpr.service.js';

describe('SqprService workflow metadata hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    attachmentServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/sqpr.txt',
      fileName: 'sqpr.txt',
      mimeType: 'text/plain',
    });
  });

  it('adds workflow metadata on list reads for the assigned actor', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqpr_id: 'sqpr-1',
        control_no: 'SQPR-2026-01-SITE',
        request_status: '3',
        site_id: 'site-1',
        site_name: 'Site One',
        incharge_id: 'issuer-1',
        incharge_name: 'Issuer One',
        checker_id: 'checker-1',
        checker_name: 'Checker One',
        approver_id: 'approver-1',
        approver_name: 'Approver One',
        date_created: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
        updateby: 'issuer-1',
      },
    ]);

    const service = new SqprService();
    const result = await service.getAllRecords({ status: 'SUBMITTED' }, { userId: 'checker-1' });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      status: 'SUBMITTED',
      request_status: 'SUBM',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      workflowStageLabel: 'Awaiting Checker',
      availableActions: ['check', 'reject'],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker One',
    }));
  });

  it('hydrates detail reads with workflow metadata and child tables', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqpr_id: 'sqpr-2',
        control_no: 'SQPR-2026-02-SITE',
        request_status: '10',
        site_id: 'site-1',
        site_name: 'Site One',
        incharge_id: 'issuer-1',
        incharge_name: 'Issuer One',
        checker_id: 'checker-1',
        checker_name: 'Checker One',
        approver_id: 'approver-1',
        approver_name: 'Approver One',
        date_created: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
        updateby: 'issuer-1',
      },
      attachments: [{ sqpr_attachment_id: 'att-1' }],
      ccList: [{ sqpr_cc_id: 'cc-1' }],
    });

    const service = new SqprService();
    const result = await service.getRecordById('sqpr-2', { userId: 'issuer-1' });

    expect(result).toEqual(expect.objectContaining({
      status: 'APPROVED',
      request_status: 'APRV',
      workflowStage: 'ISSUER',
      workflowStageCode: '10',
      availableActions: ['issue'],
      nextApproverId: 'issuer-1',
      nextApproverName: 'Issuer One',
      attachments: [{ sqpr_attachment_id: 'att-1' }],
      cc_list: [{ sqpr_cc_id: 'cc-1' }],
    }));
  });

  it('does not widen active queue history visibility from SQPR queue viewList alone', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqpr_id: 'sqpr-1',
        control_no: 'SQPR-2026-01-SITE',
        request_status: '3',
        site_id: 'site-1',
        site_name: 'Site One',
        incharge_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        date_created: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
        updateby: 'issuer-1',
      },
    ]);
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string) =>
      formId === 'SQPR-03-02',
    );

    const service = new SqprService();
    const result = await service.getAllRecords(
      { status: 'AWAITING_APPROVAL', scope: 'history' },
      { userId: 'viewer-1', roleName: 'USER' },
    );

    expect(result).toHaveLength(0);
  });

  it('keeps issued history visible only when the role has the SQPR reference viewList form', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        sqpr_id: 'sqpr-accept',
        control_no: 'SQPR-2026-99-SITE',
        request_status: '1',
        site_id: 'site-1',
        site_name: 'Site One',
        incharge_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        date_created: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
        updateby: 'issuer-1',
      },
    ]);
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string) =>
      formId === 'SQPR-03-04',
    );

    const service = new SqprService();
    const result = await service.getAllRecords(
      { status: 'ISSUED', scope: 'history' },
      { userId: 'viewer-1', roleName: 'USER' },
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.workflowStage).toBe('ACCEPT');
  });

  it('rejects detail access when the actor is neither a participant nor queue-wide viewer', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqpr_id: 'sqpr-2',
        control_no: 'SQPR-2026-02-SITE',
        request_status: '3',
        site_id: 'site-1',
        site_name: 'Site One',
        incharge_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        date_created: new Date('2026-03-14'),
        last_update: new Date('2026-03-14'),
        updateby: 'issuer-1',
      },
      attachments: [],
      ccList: [],
    });

    const service = new SqprService();

    await expect(service.getRecordById('sqpr-2', { userId: 'viewer-1', roleName: 'USER' })).rejects.toMatchObject({
      message: 'You do not have permission to view this SQPR record.',
    });
  });

  it('creates draft records with legacy DRF control numbers and numeric storage stages', async () => {
    const inserted: Record<string, any>[] = [];
    repositoryMock.findSiteCode.mockResolvedValue({
      site_id: 'site-1',
      site_name: 'Site One',
      site_code: 'T',
    });
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) => {
      const trx = {
        insertInto: vi.fn(() => ({
          values: (payload: Record<string, any>) => ({
            execute: async () => {
              inserted.push(payload);
            },
          }),
        })),
      };

      return callback(trx);
    });

    const service = new SqprService();
    const result = await service.createRecord({
      site_id: 'site-1',
      fiscal_year: 2026,
      report_type: 1,
      month: 3,
      incharge_id: 'issuer-1',
      checker_id: 'checker-1',
      approver_id: 'approver-1',
      attachments: [],
      cc_list: [],
    } as any, 'issuer-1');

    expect(inserted[0]).toEqual(expect.objectContaining({
      control_no: 'DRF-2026-3-T',
      request_status: '2',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      control_no: 'DRF-2026-3-T',
      request_status: 'DRFT',
      workflowStage: 'DRAFT',
      workflowStageCode: '2',
    }));
  });

  it('rejects update attempts outside the incharge draft-or-returned owner stages', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqpr_id: 'sqpr-approve',
        request_status: '10',
        incharge_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
      },
      attachments: [],
      ccList: [],
    });

    const service = new SqprService();

    await expect(
      service.updateRecord(
        'sqpr-approve',
        { remarks: 'blocked' } as any,
        { userId: 'issuer-1', roleName: 'USER' },
        [],
      ),
    ).rejects.toMatchObject({
      message: 'You do not have permission to update this SQPR record.',
    });
  });

  it('ignores workflow status fields on generic updates for editable owner stages', async () => {
    let updatedValues: Record<string, unknown> | undefined;

    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqpr_id: 'sqpr-draft',
        request_status: '2',
        incharge_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        control_no: 'DRF-2026-3-T',
      },
      attachments: [],
      ccList: [],
    });
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) => {
      const trx = {
        updateTable: vi.fn(() => ({
          set: (values: Record<string, unknown>) => {
            updatedValues = values;
            return {
              where: () => ({
                execute: vi.fn().mockResolvedValue(undefined),
              }),
            };
          },
        })),
      };

      return callback(trx);
    });

    const service = new SqprService();
    await service.updateRecord(
      'sqpr-draft',
      { remarks: 'save only', status: 'APPROVED', request_status: '10' } as any,
      { userId: 'issuer-1', roleName: 'USER' },
      [],
    );

    expect(updatedValues).toEqual(expect.objectContaining({
      remarks: 'save only',
    }));
    expect(updatedValues).not.toHaveProperty('request_status');
  });

  it('rejects deleting issued records even for the originator', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqpr_id: 'sqpr-issued',
        request_status: '11',
        incharge_id: 'issuer-1',
      },
      attachments: [],
      ccList: [],
    });

    const service = new SqprService();

    await expect(
      service.deleteRecord('sqpr-issued', { userId: 'issuer-1', roleName: 'USER' }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to delete this SQPR record.',
    });
  });

  it('allows attachment download only when the actor can read the owning record', async () => {
    repositoryMock.findAttachmentOwner.mockResolvedValue({ sqpr_id: 'sqpr-1' });
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqpr_id: 'sqpr-1',
        request_status: '2',
        incharge_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
      },
      attachments: [],
      ccList: [],
    });

    const service = new SqprService();
    const result = await service.downloadAttachment('att-1', { userId: 'issuer-1', roleName: 'USER' });

    expect(attachmentServiceMock.downloadAttachment).toHaveBeenCalledWith('sqpr-main', 'att-1');
    expect(result).toEqual(expect.objectContaining({
      fileName: 'sqpr.txt',
    }));
  });

  it('rejects attachment download for unrelated actors', async () => {
    repositoryMock.findAttachmentOwner.mockResolvedValue({ sqpr_id: 'sqpr-1' });
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqpr_id: 'sqpr-1',
        request_status: '3',
        incharge_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
      },
      attachments: [],
      ccList: [],
    });

    const service = new SqprService();

    await expect(
      service.downloadAttachment('att-1', { userId: 'viewer-1', roleName: 'USER' }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to download this SQPR record.',
    });
    expect(attachmentServiceMock.downloadAttachment).not.toHaveBeenCalled();
  });
});
