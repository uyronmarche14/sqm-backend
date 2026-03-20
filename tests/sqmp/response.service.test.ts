import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findByIdDetailed: vi.fn(),
  findSupplierIdsByUserId: vi.fn(),
  executeTransaction: vi.fn(),
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

import { SqmpResponseService } from '../../src/modules/sqmp/response/response.service';

describe('SqmpResponseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not try to persist issuer_id into SQMP_RESPONSE when saving closure content', async () => {
    const insertedValues: any[] = [];
    const trx = {
      selectFrom: vi.fn(() => ({
        selectAll: vi.fn(() => ({
          where: vi.fn(() => ({
            executeTakeFirst: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      })),
      insertInto: vi.fn((table: string) => ({
        values: vi.fn((value: unknown) => {
          if (table === 'SQMP_RESPONSE') {
            insertedValues.push(value);
          }
          return {
            execute: vi.fn().mockResolvedValue(undefined),
          };
        }),
      })),
      deleteFrom: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue(undefined),
        })),
      })),
      updateTable: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            execute: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      })),
    };

    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-1',
        site_id: 'SITE-1',
        issuer_id: 'issuer-1',
        request_status: '15',
      },
    });
    repositoryMock.executeTransaction.mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => callback(trx));
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'USER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'SITE-1' });

    const service = new SqmpResponseService();

    await service.saveClosureContent(
      'sqmp-1',
      {
        issuer_id: 'issuer-1',
        issuer_remarks: 'closure prepared',
      } as any,
      'issuer-1',
      'role-1',
      [],
    );

    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0]).not.toHaveProperty('issuer_id');
    expect(insertedValues[0]).toEqual(expect.objectContaining({
      issuer_remarks: 'closure prepared',
    }));
  });

  it('allows an attention-assigned supplier user to save supplier response content without SUPPLIERSUSER mapping', async () => {
    const insertedValues: any[] = [];
    const trx = {
      selectFrom: vi.fn(() => ({
        selectAll: vi.fn(() => ({
          where: vi.fn(() => ({
            executeTakeFirst: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      })),
      insertInto: vi.fn((table: string) => ({
        values: vi.fn((value: unknown) => {
          if (table === 'SQMP_RESPONSE') {
            insertedValues.push(value);
          }
          return {
            execute: vi.fn().mockResolvedValue(undefined),
          };
        }),
      })),
      deleteFrom: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue(undefined),
        })),
      })),
      updateTable: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            execute: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      })),
    };

    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-1',
        supplier_id: 'supplier-1',
        attention_id: 'attention-user-1',
        request_status: '11',
      },
    });
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue([]);
    repositoryMock.executeTransaction.mockImplementation(async (callback: (trx: unknown) => Promise<unknown>) => callback(trx));
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'SUPPLIER' });

    const service = new SqmpResponseService();

    await service.saveSupplierResponseContent(
      'sqmp-1',
      {
        remarks: 'supplier response draft',
      } as any,
      'attention-user-1',
      'role-supplier',
      [],
    );

    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0]).toEqual(expect.objectContaining({
      remarks: 'supplier response draft',
    }));
  });

  it('forbids same-site internal users from saving closure content when they are not the assigned issuer', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        sqmp_id: 'sqmp-1',
        site_id: 'SITE-1',
        issuer_id: 'issuer-1',
        request_status: '15',
      },
    });
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'USER' });
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'SITE-1' });

    const service = new SqmpResponseService();

    await expect(
      service.saveClosureContent(
        'sqmp-1',
        {
          issuer_remarks: 'closure prepared',
        } as any,
        'same-site-user',
        'role-1',
        [],
      ),
    ).rejects.toThrow('Only the assigned issuer can save closure content.');
  });
});
