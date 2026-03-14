import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NpiCrudService } from '../../src/modules/npi/services/NpiCrudService.js';
import { NpiMapper } from '../../src/modules/npi/services/NpiMapper.js';

function createTransactionRecorder() {
  const inserted: Array<{ table: string; values: Record<string, unknown> }> = [];
  const deleted: Array<{ table: string; where: [string, string, unknown] }> = [];
  const updated: Array<{ table: string; values: Record<string, unknown>; where: [string, string, unknown] }> = [];

  const insertInto = vi.fn((table: string) => ({
    values: (values: Record<string, unknown>) => ({
      execute: async () => {
        inserted.push({ table, values });
      },
    }),
  }));

  const deleteFrom = vi.fn((table: string) => ({
    where: (column: string, op: string, value: unknown) => ({
      execute: async () => {
        deleted.push({ table, where: [column, op, value] });
      },
    }),
  }));

  const updateTable = vi.fn((table: string) => ({
    set: (values: Record<string, unknown>) => ({
      where: (column: string, op: string, value: unknown) => ({
        execute: async () => {
          updated.push({ table, values, where: [column, op, value] });
        },
      }),
    }),
  }));

  return {
    trx: { insertInto, deleteFrom, updateTable },
    inserted,
    deleted,
    updated,
  };
}

describe('NpiCrudService legacy child-table parity', () => {
  const repository = {
    findAllDetailed: vi.fn(),
    findByIdDetailed: vi.fn(),
    findDefaultInspector: vi.fn(),
    getNextSequence: vi.fn(),
    executeTransaction: vi.fn(),
  };
  const mapper = new NpiMapper();

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findDefaultInspector.mockResolvedValue('inspector-default');
    repository.getNextSequence.mockResolvedValue(null);
  });

  it('persists restored noise categories and material certificates on create', async () => {
    const tx = createTransactionRecorder();
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.createRecord(
      {
        siteId: 'site-1',
        noise_categories: [
          {
            partnoisecategory_name: 'Noise A',
            std_min: 1,
            std_max: 2,
            actual_min: 1.2,
            actual_max: 1.8,
          },
        ],
        material_certificates: [
          {
            component: 'Tin',
            description: 'Material cert',
            required_data: 'RoHS',
            judgement: true,
          },
        ],
      } as any,
      'originator-1',
      [],
    );

    expect(tx.inserted.some((entry) => entry.table === 'NPI_NOISECAT')).toBe(true);
    expect(tx.inserted.some((entry) => entry.table === 'NPI_MATERIALCERT')).toBe(true);
    expect(
      tx.inserted.find((entry) => entry.table === 'NPI_MATERIALCERT')?.values.judgement,
    ).toBe(1);
  });

  it('persists checker and approver when the frontend sends snake_case approval fields', async () => {
    const tx = createTransactionRecorder();
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.createRecord(
      {
        siteId: 'site-1',
        inspector_id: 'inspector-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        inspector_remarks: 'inspector remark',
        checker_remarks: 'checker remark',
        approver_remarks: 'approver remark',
      } as any,
      'originator-1',
      [],
    );

    expect(tx.inserted.find((entry) => entry.table === 'NPI_LOTS')?.values).toEqual(
      expect.objectContaining({
        inspector_id: 'inspector-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        inspector_remarks: 'inspector remark',
        checker_remarks: 'checker remark',
        approver_remarks: 'approver remark',
      }),
    );
  });

  it('replaces restored noise/material rows on update', async () => {
    const tx = createTransactionRecorder();
    repository.findByIdDetailed.mockResolvedValue({
      record: { npi_lot_id: 'npi-1' },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.updateRecord(
      'npi-1',
      {
        noise_categories: [
          {
            partnoisecategory_name: 'Noise B',
            std_min: 2,
            std_max: 3,
          },
        ],
        material_certificates: [
          {
            component: 'Copper',
            description: 'Updated cert',
            required_data: 'COC',
            judgement: false,
          },
        ],
      } as any,
      'originator-1',
      [],
    );

    expect(tx.deleted).toContainEqual({
      table: 'NPI_NOISECAT',
      where: ['npi_lot_id', '=', 'npi-1'],
    });
    expect(tx.deleted).toContainEqual({
      table: 'NPI_MATERIALCERT',
      where: ['npi_lot_id', '=', 'npi-1'],
    });
    expect(tx.inserted.some((entry) => entry.table === 'NPI_NOISECAT')).toBe(true);
    expect(tx.inserted.some((entry) => entry.table === 'NPI_MATERIALCERT')).toBe(true);
  });

  it('updates checker and approver when the frontend sends snake_case approval fields', async () => {
    const tx = createTransactionRecorder();
    repository.findByIdDetailed.mockResolvedValue({
      record: { npi_lot_id: 'npi-1' },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.updateRecord(
      'npi-1',
      {
        checker_id: 'checker-2',
        approver_id: 'approver-2',
        checker_remarks: 'checked',
        approver_remarks: 'approved',
      } as any,
      'originator-1',
      [],
    );

    expect(tx.updated).toContainEqual({
      table: 'NPI_LOTS',
      values: expect.objectContaining({
        checker_id: 'checker-2',
        approver_id: 'approver-2',
        checker_remarks: 'checked',
        approver_remarks: 'approved',
      }),
      where: ['npi_lot_id', '=', 'npi-1'],
    });
  });
});
