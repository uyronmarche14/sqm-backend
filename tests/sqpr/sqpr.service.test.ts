import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllDetailed: vi.fn(),
  findByIdDetailed: vi.fn(),
  findSiteCode: vi.fn(),
  executeTransaction: vi.fn(),
}));

vi.mock('../../src/modules/sqpr/sqpr.repository.js', () => ({
  sqprRepository: repositoryMock,
}));

import { SqprService } from '../../src/modules/sqpr/sqpr.service.js';

describe('SqprService workflow metadata hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
