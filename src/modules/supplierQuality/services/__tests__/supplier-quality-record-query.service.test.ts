import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllHeaders: vi.fn(),
  findDetailsByRecordIds: vi.fn(),
  findCcByRecordIds: vi.fn(),
  findHeaderById: vi.fn(),
  findAttachmentOwner: vi.fn(),
}));
const canReadRecordMock = vi.hoisted(() => vi.fn());

vi.mock('../../supplier-quality.repository.js', () => ({
  supplierQualityRepository: repositoryMock,
}));

vi.mock('../supplier-quality-access.service.js', () => ({
  supplierQualityAccessService: {
    canReadRecord: canReadRecordMock,
  },
}));

import { supplierQualityRecordQueryService } from '../supplier-quality-record-query.service.js';

describe('supplierQualityRecordQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canReadRecordMock.mockResolvedValue(true);
  });

  it('returns grouped detail collections and approval metadata on detail reads', async () => {
    repositoryMock.findHeaderById.mockResolvedValue({
      sqpr_lar_id: 'lar-1',
      control_no: 'LAR-001',
      site_id: 'site-1',
      site_name: 'Site One',
      site_code: 'SITE',
      fiscal_year: 2026,
      report_type: 1,
      month: 5,
      file_id: 'att-1',
      file_name: 'cover.pdf',
      file_extension: 'pdf',
      remarks: 'remark',
      date_created: '2026-05-14T00:00:00.000Z',
      worst_lar_remarks: 'summary',
      worst_dppm_remarks: 'dppm',
      incharge_id: 'issuer-1',
      incharge_name: 'Issuer One',
      submit_date: '2026-05-14T01:00:00.000Z',
      incharge_remarks: 'issuer remark',
      checker_id: 'checker-1',
      checker_name: 'Checker One',
      checker_remarks: 'checker remark',
      checker_date: null,
      approver_id: 'approver-1',
      approver_name: 'Approver One',
      approver_remarks: null,
      approver_date: null,
      request_status: '3',
      last_update: '2026-05-14T02:00:00.000Z',
      updateby: 'issuer-1',
    });
    repositoryMock.findDetailsByRecordIds.mockResolvedValue([
      { sqpr_lar_detail_id: 'd1', sqpr_lar_id: 'lar-1', detail_type: 1, supplier_id: 's1', supplier_name: 'Supplier 1', value: 10, remarks: 'a' },
      { sqpr_lar_detail_id: 'd2', sqpr_lar_id: 'lar-1', detail_type: 2, supplier_id: 's2', supplier_name: 'Supplier 2', value: 9, remarks: 'b' },
      { sqpr_lar_detail_id: 'd3', sqpr_lar_id: 'lar-1', detail_type: 3, supplier_id: 's3', supplier_name: 'Supplier 3', value: 8, remarks: 'c' },
      { sqpr_lar_detail_id: 'd4', sqpr_lar_id: 'lar-1', detail_type: 5, supplier_id: 's4', supplier_name: 'Supplier 4', value: 7, remarks: 'd' },
    ]);
    repositoryMock.findCcByRecordIds.mockResolvedValue([
      { sqpr_lar_cc_id: 'cc-1', sqpr_lar_id: 'lar-1', user_id: 'user-1', full_name: 'User One', email: 'user@example.com' },
    ]);

    const record = await supplierQualityRecordQueryService.getById('lar-1', { userId: 'checker-1' });

    expect(record.workflowStageLabel).toBe('AWAITING_CHECKED');
    expect(record.nextApproverId).toBe('approver-1');
    expect(record.coverPageAttachments).toHaveLength(1);
    expect(record.larWorstRows).toHaveLength(1);
    expect(record.larWorstKeyPartsRows).toHaveLength(1);
    expect(record.larWorstMechanicalRows).toHaveLength(1);
    expect(record.larWorstOtherRows).toHaveLength(1);
    expect(record.ccList).toEqual([expect.objectContaining({ userId: 'user-1' })]);
  });

  it('filters assigned list scope through available actions', async () => {
    repositoryMock.findAllHeaders.mockResolvedValue([
      {
        sqpr_lar_id: 'lar-1',
        control_no: 'LAR-001',
        site_id: 'site-1',
        site_name: 'Site One',
        site_code: 'SITE',
        fiscal_year: 2026,
        report_type: 1,
        month: 5,
        file_id: '',
        file_name: '',
        file_extension: '',
        remarks: null,
        date_created: '2026-05-14T00:00:00.000Z',
        worst_lar_remarks: null,
        worst_dppm_remarks: null,
        incharge_id: 'issuer-2',
        incharge_name: 'Issuer Two',
        submit_date: '2026-05-14T01:00:00.000Z',
        incharge_remarks: null,
        checker_id: 'checker-1',
        checker_name: 'Checker One',
        checker_remarks: null,
        checker_date: null,
        approver_id: 'approver-1',
        approver_name: 'Approver One',
        approver_remarks: null,
        approver_date: null,
        request_status: '3',
        last_update: '2026-05-14T02:00:00.000Z',
        updateby: 'issuer-2',
      },
      {
        sqpr_lar_id: 'lar-2',
        control_no: 'LAR-002',
        site_id: 'site-1',
        site_name: 'Site One',
        site_code: 'SITE',
        fiscal_year: 2026,
        report_type: 1,
        month: 5,
        file_id: '',
        file_name: '',
        file_extension: '',
        remarks: null,
        date_created: '2026-05-14T00:00:00.000Z',
        worst_lar_remarks: null,
        worst_dppm_remarks: null,
        incharge_id: 'issuer-2',
        incharge_name: 'Issuer Two',
        submit_date: null,
        incharge_remarks: null,
        checker_id: 'checker-2',
        checker_name: 'Checker Two',
        checker_remarks: null,
        checker_date: null,
        approver_id: 'approver-2',
        approver_name: 'Approver Two',
        approver_remarks: null,
        approver_date: null,
        request_status: '10',
        last_update: '2026-05-14T02:00:00.000Z',
        updateby: 'issuer-2',
      },
    ]);
    repositoryMock.findDetailsByRecordIds.mockResolvedValue([]);
    repositoryMock.findCcByRecordIds.mockResolvedValue([]);

    const records = await supplierQualityRecordQueryService.list({ userId: 'checker-1' }, { scope: 'assigned' });

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('lar-1');
    expect(records[0].availableActions).toContain('check');
  });

  it('validates attachment ownership through record access', async () => {
    repositoryMock.findAttachmentOwner.mockResolvedValue({ sqpr_lar_id: 'lar-1' });
    repositoryMock.findHeaderById.mockResolvedValue({
      sqpr_lar_id: 'lar-1',
      request_status: '3',
      incharge_id: 'issuer-1',
      checker_id: 'checker-1',
      approver_id: 'approver-1',
    });

    const owner = await supplierQualityRecordQueryService.downloadAttachment('att-1', { userId: 'checker-1' });

    expect(owner).toEqual({ sqpr_lar_id: 'lar-1' });
    expect(canReadRecordMock).toHaveBeenCalled();
  });
});
