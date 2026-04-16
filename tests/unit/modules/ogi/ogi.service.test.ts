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
  findUsersWithRolePermission: vi.fn(),
}));

const ogiNotificationMock = vi.hoisted(() => ({
  sendSubmittedNotification: vi.fn(),
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

vi.mock('../../../../src/shared/notifications/ogi-notification.service.js', () => ({
  ogiNotificationService: ogiNotificationMock,
}));

import { OgiService } from '../../../../src/modules/ogi/ogi.service.js';

describe('OgiService legacy workflow alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controlNumberServiceMock.buildOgiDraft.mockResolvedValue('DRF-2026-3-1-SITE');
    controlNumberServiceMock.finalizeOgi.mockResolvedValue('OGI-2026-3-1-SITE');
    controlNumberServiceMock.getControlNoState.mockReturnValue('final');
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    permissionServiceMock.findUsersWithRolePermission.mockResolvedValue([]);
    ogiNotificationMock.sendSubmittedNotification.mockResolvedValue({
      delivered: true,
      transport: 'file',
      referenceId: '/tmp/emails/ogi.json',
      subject: '<OGI> Uploaded - Toshiba Supplier',
      recipients: ['ogi@example.com'],
      localUrl: 'http://localhost:5000/dashboard/ogi-up/view/ogi-1',
      internetUrl: 'https://sqm.example.com/dashboard/ogi-up/view/ogi-1',
    });
    attachmentServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/ogi.txt',
      fileName: 'ogi.txt',
      mimeType: 'text/plain',
    });
    ogiRepositoryMock.findUserContactById = vi.fn().mockResolvedValue(null);
  });

  it('always creates OGI records as drafts even when a legacy status field is passed', async () => {
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
      siteId: 'site-1',
      supplierId: 'supplier-1',
      partId: 'part-1',
      lots: [],
      attachments: [],
      status: 'SUBMITTED',
    } as any, 'user-1');

    expect(controlNumberServiceMock.buildOgiDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 'site-1',
      }),
      expect.anything(),
    );
    expect(controlNumberServiceMock.finalizeOgi).not.toHaveBeenCalled();
    expect(insertedValues).toEqual(expect.objectContaining({
      control_no: 'DRF-2026-3-1-SITE',
      request_status: 'DR',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: 'DRF-2026-3-1-SITE',
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

  it('allows detail reads through explicit reference surfaces even when base read access is denied', async () => {
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService() as any;
    service.resolveRoleViewListFormCodes = vi.fn().mockResolvedValue(new Set());
    service.canReadRecord = vi.fn(() => false);
    service.isSurfaceVisible = vi.fn(() => true);

    await expect(
      service.getRecordById('ogi-1', { userId: 'viewer-1', roleName: 'USER' }, 'search'),
    ).resolves.toEqual(expect.objectContaining({
      ogi_id: 'ogi-1',
    }));
    expect(service.isSurfaceVisible).toHaveBeenCalledWith(
      expect.objectContaining({ ogi_id: 'ogi-1' }),
      { userId: 'viewer-1', roleName: 'USER' },
      new Set(),
      'search',
    );
  });

  it('keeps detail reads blocked without surface when base read access is denied', async () => {
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService() as any;
    service.resolveRoleViewListFormCodes = vi.fn().mockResolvedValue(new Set());
    service.canReadRecord = vi.fn(() => false);
    service.isSurfaceVisible = vi.fn(() => true);

    await expect(service.getRecordById('ogi-1', { userId: 'viewer-1', roleName: 'USER' })).rejects.toMatchObject({
      message: 'You do not have permission to view this OGI record.',
    });
    expect(service.isSurfaceVisible).not.toHaveBeenCalled();
  });

  it('allows attachment downloads through explicit reference surfaces even when base read access is denied', async () => {
    ogiRepositoryMock.findAttachmentOwner.mockResolvedValue({ ogi_id: 'ogi-1' });
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'OGI-001',
        request_status: 'SB',
      },
      lots: [],
      attachments: [],
    });

    const service = new OgiService() as any;
    service.resolveRoleViewListFormCodes = vi.fn().mockResolvedValue(new Set());
    service.canReadRecord = vi.fn(() => false);
    service.isSurfaceVisible = vi.fn(() => true);

    const result = await service.downloadAttachment('att-1', { userId: 'viewer-1', roleName: 'USER' }, 'search');

    expect(result).toEqual(expect.objectContaining({
      filePath: '/tmp/ogi.txt',
      fileName: 'ogi.txt',
    }));
    expect(service.isSurfaceVisible).toHaveBeenCalledWith(
      expect.objectContaining({ ogi_id: 'ogi-1' }),
      { userId: 'viewer-1', roleName: 'USER' },
      new Set(),
      'search',
    );
  });

  it('writes SB when submitting a draft OGI record', async () => {
    let updatedValues: Record<string, unknown> | undefined;

    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'DRF-2026-3-1-SITE',
        site_id: 'site-1',
        site_code: 'SITE',
        site_name: 'Main Site',
        supplier_name: 'Toshiba Supplier',
        submit_date: '2026-03-22T12:00:00.000Z',
        request_status: 'DR',
      },
    });
    ogiRepositoryMock.findUserContactById = vi.fn()
      .mockResolvedValueOnce({
        userId: 'recipient-1',
        email: 'ogi-recipient@example.com',
        name: 'OGI Recipient',
        activeFlag: 1,
      })
      .mockResolvedValueOnce({
        userId: 'user-1',
        email: 'submitter@example.com',
        name: 'Submitter User',
        activeFlag: 1,
      });
    permissionServiceMock.findUsersWithRolePermission.mockResolvedValue([
      { userId: 'recipient-1', fullName: 'OGI Recipient' },
    ]);
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
    expect(ogiNotificationMock.sendSubmittedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'ogi.submitted',
        controlNo: 'OGI-2026-3-1-SITE',
        submittedByName: 'Submitter User',
        to: [{ email: 'ogi-recipient@example.com', name: 'OGI Recipient' }],
      }),
    );
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

  it('submits successfully and warns when no submitted-page recipients are configured', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'DRF-2026-3-1-SITE',
        site_id: 'site-1',
        site_code: 'SITE',
        supplier_name: 'Toshiba Supplier',
        request_status: 'DR',
      },
    });
    permissionServiceMock.findUsersWithRolePermission.mockResolvedValue([]);
    ogiRepositoryMock.executeTransaction.mockImplementation(async (callback: (trx: any) => unknown) => {
      const trx = {
        updateTable: vi.fn(() => ({
          set: () => ({
            where: () => ({
              execute: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        })),
      };

      return callback(trx);
    });

    const service = new OgiService();
    const result = await service.submitRecord('ogi-1', 'user-1');

    expect(result.message).toBe('OGI Record submitted successfully');
    expect(ogiNotificationMock.sendSubmittedNotification).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[ogi] workflow email notification skipped',
      expect.any(String),
    );

    warnSpy.mockRestore();
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

  it('rejects update attempts for the current owner once the record is submitted', async () => {
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
      service.updateRecord('ogi-1', { remarks: 'blocked' } as any, { userId: 'owner-1', roleName: 'USER' }, []),
    ).rejects.toMatchObject({
      message: 'You do not have permission to update this OGI record.',
    });
  });

  it('ignores workflow status fields on generic updates for draft owners', async () => {
    let updatedValues: Record<string, unknown> | undefined;

    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'DRF-2026-3-1-SITE',
        request_status: 'DR',
        incharge_id: 'owner-1',
      },
      lots: [],
      attachments: [],
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
    await service.updateRecord(
      'ogi-1',
      { remarks: 'save only', status: 'SUBMITTED', request_status: 'SB' } as any,
      { userId: 'owner-1', roleName: 'USER' },
      [],
    );

    expect(updatedValues).toEqual(expect.objectContaining({
      remarks: 'save only',
    }));
    expect(updatedValues).not.toHaveProperty('request_status');
    expect(controlNumberServiceMock.finalizeOgi).not.toHaveBeenCalled();
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
