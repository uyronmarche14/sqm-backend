import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../../src/shared/errors/AppError.js';
import { SQMP_STAGE_CODE } from '../../../../src/modules/sqmp/workflow/workflow.constants.js';

const {
  mockFindRoleById,
  mockFindByUserId,
  mockFindByIdDetailed,
  mockFindSupplierIdsByUserId,
  mockExecuteTransaction,
  mockSaveSupplierResponseContent,
  mockSaveClosureContent,
} = vi.hoisted(() => ({
  mockFindRoleById: vi.fn(),
  mockFindByUserId: vi.fn(),
  mockFindByIdDetailed: vi.fn(),
  mockFindSupplierIdsByUserId: vi.fn(),
  mockExecuteTransaction: vi.fn(),
  mockSaveSupplierResponseContent: vi.fn(),
  mockSaveClosureContent: vi.fn(),
}));

vi.mock('../../../../src/modules/users/user.repository.js', () => ({
  userRepository: {
    findRoleById: mockFindRoleById,
    findById: mockFindByUserId,
  },
}));

vi.mock('../../../../src/modules/sqmp/sqmp.repository.js', () => ({
  sqmpRepository: {
    findByIdDetailed: mockFindByIdDetailed,
    findSupplierIdsByUserId: mockFindSupplierIdsByUserId,
    executeTransaction: mockExecuteTransaction,
  },
}));

vi.mock('../../../../src/modules/sqmp/response/response.service.js', () => ({
  sqmpResponseService: {
    saveSupplierResponseContent: mockSaveSupplierResponseContent,
    saveClosureContent: mockSaveClosureContent,
  },
}));

import { SqmpWorkflowService } from '../../../../src/modules/sqmp/workflow/workflow.service.js';

const buildRecordData = (overrides: Record<string, unknown> = {}) => ({
  record: {
    sqmp_id: 'sqmp-1',
    request_status: SQMP_STAGE_CODE.DRAFT,
    encoder_id: 'encoder-1',
    issuer_id: 'issuer-1',
    checker_id: 'checker-1',
    approver_id: 'approver-1',
    site_id: 'site-1',
    supplier_id: 'supplier-1',
    ...overrides,
  },
  responses: [],
});

describe('SqmpWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindRoleById.mockResolvedValue({ role_name: 'ISSUER' });
    mockFindByUserId.mockResolvedValue({ site_id: 'site-1' });
    mockFindByIdDetailed.mockResolvedValue(buildRecordData());
    mockFindSupplierIdsByUserId.mockResolvedValue([]);
  });

  it('submits a draft SQMP into the checker stage and writes a status remark', async () => {
    const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
    const inserts: Array<{ table: string; values: Record<string, unknown> }> = [];

    const fakeTrx = {
      updateTable: (table: string) => ({
        set: (values: Record<string, unknown>) => ({
          where: () => ({
            execute: async () => {
              updates.push({ table, values });
            },
          }),
        }),
      }),
      insertInto: (table: string) => ({
        values: (values: Record<string, unknown>) => ({
          execute: async () => {
            inserts.push({ table, values });
          },
        }),
      }),
    };

    mockExecuteTransaction.mockImplementation(async (callback: (trx: typeof fakeTrx) => Promise<void>) => {
      await callback(fakeTrx);
    });

    const service = new SqmpWorkflowService();
    const result = await service.submitMain('sqmp-1', 'Submitted to checker', 'issuer-1', 'role-1');

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('sqmp-1');
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe('SQMP');
    expect(updates[0].values.request_status).toBe(SQMP_STAGE_CODE.CHECKER);
    expect(updates[0].values.issuer_remarks).toBe('Submitted to checker');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe('SQMP_STATUS_REMARKS');
    expect(inserts[0].values.request_status).toBe(SQMP_STAGE_CODE.CHECKER);
    expect(inserts[0].values.remarks).toBe('Submitted to checker');
  });

  it('rejects workflow actions from users without the active SQMP assignment', async () => {
    mockFindRoleById.mockResolvedValue({ role_name: 'TIP USER' });
    mockFindByUserId.mockResolvedValue({ site_id: 'other-site' });

    const service = new SqmpWorkflowService();

    await expect(service.submitMain('sqmp-1', 'no access', 'outsider-1', 'role-2')).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockExecuteTransaction).not.toHaveBeenCalled();
  });
});
