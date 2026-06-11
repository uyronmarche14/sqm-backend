import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllHeaders: vi.fn(),
  findAttachmentsByRecordIds: vi.fn(),
  findHeaderById: vi.fn(),
  findAttachmentOwner: vi.fn(),
}));

vi.mock('../../spc-trend.repository.js', () => ({
  spcTrendRepository: repositoryMock,
}));

import { spcTrendRecordQueryService } from '../spc-trend-record-query.service.js';

describe('spcTrendRecordQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns canonical attachment fields, count, and compatibility alias on detail reads', async () => {
    repositoryMock.findHeaderById.mockResolvedValue({
      spc_id: 'spc-1',
      control_no: 'SPC-001',
      request_status: '3',
      upload_date: '2026-05-14',
      last_update: '2026-05-14T00:00:00.000Z',
      incharge_id: 'issuer-1',
      incharge_name: 'Issuer One',
      site_id: 'site-1',
      site_name: 'Site One',
      site_code: 'SITE',
      supplier_id: 'supplier-1',
      supplier_name: 'Supplier One',
      part_id: 'part-1',
      part_code: 'PART-1',
      part_name: 'Part One',
      remarks: 'remark',
      submit_date: '2026-05-14T00:00:00.000Z',
      supplier_incharge_id: 'supplier-user-1',
      supplier_incharge_name: 'Supplier User',
      issuer_id: 'issuer-1',
      issuer_name: 'Issuer One',
      checker_id: 'checker-1',
      checker_name: 'Checker One',
      approver_id: 'approver-1',
      approver_name: 'Approver One',
      issuer_remarks: 'issued',
      checker_remarks: 'checked',
      approver_remarks: 'approved',
      checked_at: '2026-05-14T01:00:00.000Z',
      approved_at: null,
      rejected_at: null,
      issued_at: null,
      last_action_by: 'checker-1',
    });
    repositoryMock.findAttachmentsByRecordIds.mockResolvedValue([
      {
        spc_attachment_id: 'att-2',
        spc_id: 'spc-1',
        file_name: 'older.pdf',
        file_extension: 'pdf',
        last_update: '2026-05-14T00:00:00.000Z',
      },
      {
        spc_attachment_id: 'att-1',
        spc_id: 'spc-1',
        file_name: 'newer.pdf',
        file_extension: 'pdf',
        last_update: '2026-05-14T02:00:00.000Z',
      },
    ]);

    const record = await spcTrendRecordQueryService.getById('spc-1', { userId: 'checker-1' });

    expect(record.attachmentCount).toBe(2);
    expect(record.attachments).toHaveLength(2);
    expect(record.attachment?.attachmentId).toBe('att-1');
    expect(record.attachment?.fileUrl).toBe('/api/spc-trend/attachments/att-1');
  });

  it('filters assigned list scope through available actions', async () => {
    repositoryMock.findAllHeaders.mockResolvedValue([
      {
        spc_id: 'spc-1',
        control_no: 'SPC-001',
        request_status: '3',
        upload_date: '2026-05-14',
        last_update: '2026-05-14T00:00:00.000Z',
        incharge_id: 'issuer-1',
        incharge_name: 'Issuer One',
        site_id: 'site-1',
        site_name: 'Site One',
        site_code: 'SITE',
        supplier_id: 'supplier-1',
        supplier_name: 'Supplier One',
        part_id: 'part-1',
        part_code: 'PART-1',
        part_name: 'Part One',
        remarks: null,
        submit_date: null,
        supplier_incharge_id: 'supplier-user-1',
        supplier_incharge_name: 'Supplier User',
        issuer_id: 'issuer-1',
        issuer_name: 'Issuer One',
        checker_id: 'checker-1',
        checker_name: 'Checker One',
        approver_id: 'approver-1',
        approver_name: 'Approver One',
        issuer_remarks: null,
        checker_remarks: null,
        approver_remarks: null,
        checked_at: null,
        approved_at: null,
        rejected_at: null,
        issued_at: null,
        last_action_by: null,
      },
      {
        spc_id: 'spc-2',
        control_no: 'SPC-002',
        request_status: '10',
        upload_date: '2026-05-14',
        last_update: '2026-05-14T00:00:00.000Z',
        incharge_id: 'issuer-2',
        incharge_name: 'Issuer Two',
        site_id: 'site-1',
        site_name: 'Site One',
        site_code: 'SITE',
        supplier_id: 'supplier-1',
        supplier_name: 'Supplier One',
        part_id: 'part-1',
        part_code: 'PART-1',
        part_name: 'Part One',
        remarks: null,
        submit_date: null,
        supplier_incharge_id: 'supplier-user-1',
        supplier_incharge_name: 'Supplier User',
        issuer_id: 'issuer-2',
        issuer_name: 'Issuer Two',
        checker_id: 'checker-2',
        checker_name: 'Checker Two',
        approver_id: 'approver-2',
        approver_name: 'Approver Two',
        issuer_remarks: null,
        checker_remarks: null,
        approver_remarks: null,
        checked_at: null,
        approved_at: null,
        rejected_at: null,
        issued_at: null,
        last_action_by: null,
      },
    ]);
    repositoryMock.findAttachmentsByRecordIds.mockResolvedValue([]);

    const records = await spcTrendRecordQueryService.list({ userId: 'checker-1' }, { scope: 'assigned' });

    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('spc-1');
  });
});
