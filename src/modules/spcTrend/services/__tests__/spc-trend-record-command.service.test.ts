import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncAttachmentsMock = vi.hoisted(() => vi.fn());
const deleteStoredAttachmentsMock = vi.hoisted(() => vi.fn());
const buildSpcDraftMock = vi.hoisted(() => vi.fn());
const assertActionAccessMock = vi.hoisted(() => vi.fn());
const repositoryMock = vi.hoisted(() => ({
  findSite: vi.fn(),
  controlNoExists: vi.fn(),
  executeTransaction: vi.fn(),
  insertRecord: vi.fn(),
  upsertWorkflow: vi.fn(),
  findHeaderById: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecordTree: vi.fn(),
  findAttachmentsByRecordIds: vi.fn(),
}));

vi.mock('../../../../shared/services/attachment.service.js', () => ({
  attachmentService: {
    syncAttachments: syncAttachmentsMock,
    deleteStoredAttachments: deleteStoredAttachmentsMock,
  },
}));

vi.mock('../../../../shared/services/control-number.service.js', () => ({
  controlNumberService: {
    buildSpcDraft: buildSpcDraftMock,
  },
}));

vi.mock('../../spc-trend.repository.js', () => ({
  spcTrendRepository: repositoryMock,
}));

vi.mock('../spc-trend-access.service.js', () => ({
  spcTrendAccessService: {
    assertActionAccess: assertActionAccessMock,
  },
}));

import { spcTrendRecordCommandService } from '../spc-trend-record-command.service.js';

function createPayload() {
  return {
    controlNo: 'TMP-SPC',
    uploadDate: '2026-05-14',
    mainDetails: {
      siteId: 'site-1',
      supplierId: 'supplier-1',
      partId: 'part-1',
      supplierInchargeId: 'supplier-user-1',
      remarks: 'remark',
    },
    attachment: {
      attachmentId: 'att-1',
      fileName: 'report.pdf',
      fileExtension: 'pdf',
      action: 'existing',
    },
    approval: {
      issuer: { userId: 'issuer-1', remarks: 'issuer' },
      checker: { userId: 'checker-1', remarks: 'checker' },
      approver: { userId: 'approver-1', remarks: 'approver' },
    },
  } as any;
}

describe('spcTrendRecordCommandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findSite.mockResolvedValue({ site_code: 'SITE' });
    repositoryMock.controlNoExists.mockResolvedValue(false);
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) => callback({}));
    buildSpcDraftMock.mockResolvedValue('DRF-2026-SITE-001');
    syncAttachmentsMock.mockResolvedValue({
      cleanupQueue: [{ fileName: 'old.pdf' }],
    });
  });

  it('creates a draft record and clears replaced attachment files after sync', async () => {
    const recordId = await spcTrendRecordCommandService.create(
      createPayload(),
      'user-1',
      [{ fieldname: 'files', filename: 'stored.pdf', originalname: 'report.pdf' }],
    );

    expect(recordId).toBeTruthy();
    expect(repositoryMock.insertRecord).toHaveBeenCalled();
    expect(repositoryMock.upsertWorkflow).toHaveBeenCalled();
    expect(syncAttachmentsMock).toHaveBeenCalled();
    expect(deleteStoredAttachmentsMock).toHaveBeenCalledWith('spc-trend-main', [{ fileName: 'old.pdf' }]);
  });

  it('updates a mutable draft through the attachment sync path', async () => {
    repositoryMock.findHeaderById.mockResolvedValue({
      spc_id: 'spc-1',
      incharge_id: 'issuer-1',
      upload_date: '2026-05-14',
      checked_at: null,
      approved_at: null,
      rejected_at: null,
      issued_at: null,
    });

    const recordId = await spcTrendRecordCommandService.update(
      'spc-1',
      createPayload(),
      { userId: 'issuer-1' },
      [],
    );

    expect(recordId).toBe('spc-1');
    expect(assertActionAccessMock).toHaveBeenCalledWith(expect.anything(), { userId: 'issuer-1' }, 'update');
    expect(repositoryMock.updateRecord).toHaveBeenCalled();
    expect(syncAttachmentsMock).toHaveBeenCalled();
    expect(deleteStoredAttachmentsMock).toHaveBeenCalledWith('spc-trend-main', [{ fileName: 'old.pdf' }]);
  });

  it('deletes a draft record tree and cleans up all stored attachments', async () => {
    repositoryMock.findHeaderById.mockResolvedValue({
      spc_id: 'spc-1',
      incharge_id: 'issuer-1',
      request_status: '2',
    });
    repositoryMock.findAttachmentsByRecordIds.mockResolvedValue([
      { file_name: 'report.pdf' },
      { file_name: 'older.pdf' },
    ]);

    const recordId = await spcTrendRecordCommandService.delete('spc-1', { userId: 'issuer-1' });

    expect(recordId).toBe('spc-1');
    expect(repositoryMock.deleteRecordTree).toHaveBeenCalled();
    expect(deleteStoredAttachmentsMock).toHaveBeenCalledWith('spc-trend-main', [
      { fileName: 'report.pdf' },
      { fileName: 'older.pdf' },
    ]);
  });
});
