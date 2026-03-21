import { beforeEach, describe, expect, it, vi } from 'vitest';

const controlNumberServiceMock = vi.hoisted(() => ({
  buildOgiDraft: vi.fn(),
  finalizeOgi: vi.fn(),
  getControlNoState: vi.fn(),
}));

const ogiRepositoryMock = vi.hoisted(() => ({
  findByIdDetailed: vi.fn(),
  findAllDetailed: vi.fn(),
  findAttachmentOwner: vi.fn(),
  fetchLotsByOgiIds: vi.fn(),
  fetchAttachmentsByOgiIds: vi.fn(),
  getNextSequence: vi.fn(),
  executeTransaction: vi.fn(),
}));

const attachmentServiceMock = vi.hoisted(() => ({
  downloadAttachment: vi.fn(),
}));

const permissionServiceMock = vi.hoisted(() => ({
  checkRolePermission: vi.fn(),
}));

vi.mock('../../../../src/modules/ogi/ogi.repository.js', () => ({
  ogiRepository: ogiRepositoryMock,
}));

vi.mock('../../../../src/shared/services/control-number.service.js', () => ({
  controlNumberService: controlNumberServiceMock,
}));

vi.mock('../../../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
}));

vi.mock('../../../../src/shared/services/attachment.service.js', () => ({
  attachmentService: attachmentServiceMock,
}));

import { OgiService } from '../../../../src/modules/ogi/ogi.service.js';

describe('OgiService legacy workflow alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controlNumberServiceMock.buildOgiDraft.mockResolvedValue('DRF-2026-3-1-SITE');
    controlNumberServiceMock.finalizeOgi.mockResolvedValue('OGI-2026-3-1-SITE');
    controlNumberServiceMock.getControlNoState.mockReturnValue('final');
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    attachmentServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/ogi.txt',
      fileName: 'ogi.txt',
      mimeType: 'text/plain',
    });
  });

  it('finalizes the control number when create is requested directly as submitted', async () => {
    let insertedValues: Record<string, unknown> | undefined;

    ogiRepositoryMock.executeTransaction.mockImplementation(async (callback: (trx: any) => unknown) => {
      const trx = {
        insertInto: vi.fn(() => ({
          values: (values: Record<string, unknown>) => {
            insertedValues = values;
            return {
              execute: vi.fn().mockResolvedValue(undefined),
            };
          },
        })),
      };

      return callback(trx);
    });

    const service = new OgiService();
    const result = await service.createRecord({
      status: 'SUBMITTED',
      siteId: 'site-1',
      supplierId: 'supplier-1',
      partId: 'part-1',
      lots: [],
      attachments: [],
    } as any, 'user-1');

    expect(controlNumberServiceMock.finalizeOgi).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 'site-1',
      }),
      expect.anything(),
    );
    expect(insertedValues).toEqual(expect.objectContaining({
      control_no: 'OGI-2026-3-1-SITE',
      request_status: 'SB',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: 'OGI-2026-3-1-SITE',
      controlNoState: 'final',
    }));
  });

  it('maps SB database records back to SUBMITTED in list reads', async () => {
    ogiRepositoryMock.findAllDetailed.mockResolvedValue([
      {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
        upload_date: '2026-03-19T00:00:00.000Z',
      },
    ]);
    ogiRepositoryMock.fetchLotsByOgiIds.mockResolvedValue([]);
    ogiRepositoryMock.fetchAttachmentsByOgiIds.mockResolvedValue([]);

    const service = new OgiService();
    const result = await service.getAllRecords({ userId: 'owner-1', roleName: 'ADMIN' });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('SUBMITTED');
  });

  it('does not widen the submitted queue from active queue viewList access alone', async () => {
    ogiRepositoryMock.findAllDetailed.mockResolvedValue([
      {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
        upload_date: '2026-03-19T00:00:00.000Z',
        incharge_id: 'owner-1',
      },
    ]);
    ogiRepositoryMock.fetchLotsByOgiIds.mockResolvedValue([]);
    ogiRepositoryMock.fetchAttachmentsByOgiIds.mockResolvedValue([]);
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string) =>
      formId === 'OGI-01-03',
    );

    const service = new OgiService();
    const result = await service.getAllRecords({ userId: 'viewer-1', roleName: 'USER' });

    expect(result).toHaveLength(0);
  });

  it('allows submitted history visibility only through the OGI search/reference form', async () => {
    ogiRepositoryMock.findAllDetailed.mockResolvedValue([
      {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
        upload_date: '2026-03-19T00:00:00.000Z',
        incharge_id: 'owner-1',
      },
    ]);
    ogiRepositoryMock.fetchLotsByOgiIds.mockResolvedValue([]);
    ogiRepositoryMock.fetchAttachmentsByOgiIds.mockResolvedValue([]);
    permissionServiceMock.checkRolePermission.mockImplementation(async (_userId: string, formId: string) =>
      formId === 'OGI-01-04',
    );

    const service = new OgiService();
    const result = await service.getAllRecords({ userId: 'viewer-1', roleName: 'USER' });

    expect(result).toHaveLength(1);
    expect(result[0]?.control_no).toBe('OGI-001');
  });

  it('rejects detail reads outside owner or queue-wide viewList access', async () => {
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
        upload_date: '2026-03-19T00:00:00.000Z',
        incharge_id: 'owner-1',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService();

    await expect(service.getRecordById('ogi-1', { userId: 'viewer-1', roleName: 'USER' })).rejects.toMatchObject({
      message: 'You do not have permission to view this OGI record.',
    });
  });

  it('writes SB when submitting a draft OGI record', async () => {
    let updatedValues: Record<string, unknown> | undefined;

    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'DRF-2026-3-1-SITE',
        site_id: 'site-1',
        site_code: 'SITE',
        request_status: 'DR',
      },
    });
    ogiRepositoryMock.executeTransaction.mockImplementation(async (callback: (trx: any) => unknown) => {
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

    const service = new OgiService();
    const result = await service.submitRecord('ogi-1', 'user-1');

    expect(updatedValues).toEqual(expect.objectContaining({
      control_no: 'OGI-2026-3-1-SITE',
      request_status: 'SB',
    }));
    expect(result.message).toBe('OGI Record submitted successfully');
  });

  it('blocks submit when the stored record has no resolvable site data', async () => {
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'DRF-2026-3-1-SITE',
        site_id: null,
        site_code: null,
        request_status: 'DR',
      },
    });

    const service = new OgiService();

    await expect(service.submitRecord('ogi-1', 'user-1')).rejects.toMatchObject({
      message: 'Site is required before submitting this OGI record.',
    });
  });

  it('rejects update attempts for unrelated actors', async () => {
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
        incharge_id: 'owner-1',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService();

    await expect(
      service.updateRecord('ogi-1', { remarks: 'blocked' } as any, { userId: 'viewer-1', roleName: 'USER' }, []),
    ).rejects.toMatchObject({
      message: 'You do not have permission to update this OGI record.',
    });
  });

  it('rejects deleting submitted records even for the current owner', async () => {
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
        incharge_id: 'owner-1',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService();

    await expect(
      service.deleteRecord('ogi-1', { userId: 'owner-1', roleName: 'USER' }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to delete this OGI record.',
    });
  });

  it('allows attachment download only for legal record readers', async () => {
    ogiRepositoryMock.findAttachmentOwner.mockResolvedValue({ ogi_id: 'ogi-1' });
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'DR',
        incharge_id: 'owner-1',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService();
    const result = await service.downloadAttachment('att-1', { userId: 'owner-1', roleName: 'USER' });

    expect(attachmentServiceMock.downloadAttachment).toHaveBeenCalledWith('ogi-main', 'att-1');
    expect(result).toEqual(expect.objectContaining({
      fileName: 'ogi.txt',
    }));
  });

  it('rejects attachment download for unrelated actors', async () => {
    ogiRepositoryMock.findAttachmentOwner.mockResolvedValue({ ogi_id: 'ogi-1' });
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
        incharge_id: 'owner-1',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService();

    await expect(
      service.downloadAttachment('att-1', { userId: 'viewer-1', roleName: 'USER' }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to download this OGI record.',
    });
    expect(attachmentServiceMock.downloadAttachment).not.toHaveBeenCalled();
  });
});
