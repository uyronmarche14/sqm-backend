import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  executeTransaction: vi.fn(),
  findByIdDetailed: vi.fn(),
  findAllDetailed: vi.fn(),
  findLatestResponsesBySqmpIds: vi.fn(),
  findSupplierIdsByUserId: vi.fn(),
}));

const userRepositoryMock = vi.hoisted(() => ({
  findRoleById: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../../src/modules/sqmp/sqmp.repository.js', () => ({
  sqmpRepository: repositoryMock,
}));

vi.mock('../../src/modules/users/user.repository.js', () => ({
  userRepository: userRepositoryMock,
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
});
