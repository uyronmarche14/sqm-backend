import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteStoredAttachmentsMock = vi.hoisted(() => vi.fn());
const buildSupplierQualityDraftMock = vi.hoisted(() => vi.fn());
const assertActionAccessMock = vi.hoisted(() => vi.fn());
const repositoryMock = vi.hoisted(() => ({
  findSiteCode: vi.fn(),
  controlNoExists: vi.fn(),
  executeTransaction: vi.fn(),
  insertRecord: vi.fn(),
  replaceDetails: vi.fn(),
  replaceCc: vi.fn(),
  findHeaderById: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecordTree: vi.fn(),
}));

vi.mock('../../../../shared/services/attachment.service.js', () => ({
  attachmentService: {
    deleteStoredAttachments: deleteStoredAttachmentsMock,
  },
}));

vi.mock('../../../../shared/services/control-number.service.js', () => ({
  controlNumberService: {
    buildSupplierQualityDraft: buildSupplierQualityDraftMock,
  },
}));

vi.mock('../../supplier-quality.repository.js', () => ({
  supplierQualityRepository: repositoryMock,
}));

vi.mock('../supplier-quality-access.service.js', () => ({
  supplierQualityAccessService: {
    assertActionAccess: assertActionAccessMock,
  },
}));

import { supplierQualityRecordCommandService } from '../supplier-quality-record-command.service.js';

function createPayload() {
  return {
    controlNo: 'TMP-LAR',
    mainDetails: {
      siteId: 'site-1',
      fiscalYear: 2026,
      frequency: 1,
      periodLabel: 'May 2026',
      remarks: 'main remark',
    },
    coverPageAttachments: [
      {
        id: 'att-1',
        fileName: 'cover.pdf',
        fileExtension: 'pdf',
        attachmentType: 'COVER',
      },
    ],
    appendixAttachments: [],
    ccList: [
      {
        id: 'cc-1',
        userId: 'cc-user-1',
      },
    ],
    approval: {
      issuer: { userId: 'issuer-1', remarks: 'issuer remark' },
      checker: { userId: 'checker-1', remarks: 'checker remark' },
      approver: { userId: 'approver-1', remarks: 'approver remark' },
    },
    larSummaryRemarks: 'summary',
    larDppmSummaryRemarks: 'dppm summary',
    larWorstRows: [{ id: 'detail-1', supplierId: 'supplier-1', value: 10, remarks: 'worst' }],
    larWorstKeyPartsRows: [{ id: 'detail-2', supplierId: 'supplier-2', value: 8, remarks: 'parts' }],
    larWorstMechanicalRows: [{ id: 'detail-3', supplierId: 'supplier-3', value: 5, remarks: 'mech' }],
    larWorstOtherRows: [{ id: 'detail-4', supplierId: 'supplier-4', value: 3, remarks: 'other' }],
  } as any;
}

describe('supplierQualityRecordCommandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findSiteCode.mockResolvedValue({ site_code: 'SITE' });
    repositoryMock.controlNoExists.mockResolvedValue(false);
    repositoryMock.executeTransaction.mockImplementation(async (callback: any) => callback({}));
    buildSupplierQualityDraftMock.mockReturnValue('DRF-2026-MAY-SITE');
  });

  it('creates a draft record with grouped detail rows and cc rows', async () => {
    const recordId = await supplierQualityRecordCommandService.create(
      createPayload(),
      'issuer-1',
      [{ fieldname: 'files', filename: 'stored-cover.pdf', originalname: 'cover.pdf' }] as any,
    );

    expect(recordId).toBeTruthy();
    expect(repositoryMock.insertRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        control_no: 'TMP-LAR',
        file_id: 'att-1',
        file_name: 'stored-cover.pdf',
      }),
    );
    expect(repositoryMock.replaceDetails).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ detail_type: 1 }),
        expect.objectContaining({ detail_type: 2 }),
        expect.objectContaining({ detail_type: 3 }),
        expect.objectContaining({ detail_type: 5 }),
      ]),
    );
    expect(repositoryMock.replaceCc).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      [expect.objectContaining({ user_id: 'cc-user-1' })],
    );
  });

  it('updates a mutable draft and clears replaced attachment files', async () => {
    repositoryMock.findHeaderById.mockResolvedValue({
      sqpr_lar_id: 'lar-1',
      control_no: 'DRF-2026-MAY-SITE',
      file_id: 'old-att',
      file_name: 'old-cover.pdf',
      file_extension: 'pdf',
      report_type: 1,
      request_status: '2',
      incharge_id: 'issuer-1',
      checker_id: 'checker-1',
      approver_id: 'approver-1',
    });

    const recordId = await supplierQualityRecordCommandService.update(
      'lar-1',
      createPayload(),
      { userId: 'issuer-1' },
      [{ fieldname: 'files', filename: 'new-cover.pdf', originalname: 'cover.pdf' }] as any,
    );

    expect(recordId).toBe('lar-1');
    expect(assertActionAccessMock).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'issuer-1' },
      'update',
      'SQPRLAR-01-01',
      expect.any(String),
    );
    expect(repositoryMock.updateRecord).toHaveBeenCalledWith(
      expect.anything(),
      'lar-1',
      expect.objectContaining({
        file_name: 'new-cover.pdf',
      }),
    );
    expect(deleteStoredAttachmentsMock).toHaveBeenCalledWith('supplier-quality-main', [{ fileName: 'old-cover.pdf' }]);
  });

  it('deletes a draft record tree and cleans up the stored attachment', async () => {
    repositoryMock.findHeaderById.mockResolvedValue({
      sqpr_lar_id: 'lar-1',
      file_name: 'old-cover.pdf',
      request_status: '2',
      incharge_id: 'issuer-1',
      checker_id: 'checker-1',
      approver_id: 'approver-1',
    });

    const recordId = await supplierQualityRecordCommandService.delete('lar-1', { userId: 'issuer-1' });

    expect(recordId).toBe('lar-1');
    expect(repositoryMock.deleteRecordTree).toHaveBeenCalled();
    expect(deleteStoredAttachmentsMock).toHaveBeenCalledWith('supplier-quality-main', [{ fileName: 'old-cover.pdf' }]);
  });
});
