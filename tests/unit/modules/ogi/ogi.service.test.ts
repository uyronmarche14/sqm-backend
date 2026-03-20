import { beforeEach, describe, expect, it, vi } from 'vitest';

const ogiRepositoryMock = vi.hoisted(() => ({
  findByIdDetailed: vi.fn(),
  findAllDetailed: vi.fn(),
  fetchLotsByOgiIds: vi.fn(),
  fetchAttachmentsByOgiIds: vi.fn(),
  getNextSequence: vi.fn(),
  executeTransaction: vi.fn(),
}));

vi.mock('../../../../src/modules/ogi/ogi.repository.js', () => ({
  ogiRepository: ogiRepositoryMock,
}));

import { OgiService } from '../../../../src/modules/ogi/ogi.service.js';

describe('OgiService legacy workflow alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const result = await service.getAllRecords();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('SUBMITTED');
  });

  it('writes SB when submitting a draft OGI record', async () => {
    let updatedValues: Record<string, unknown> | undefined;

    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        request_status: 'DR',
      },
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
    const result = await service.submitRecord('ogi-1', 'user-1');

    expect(updatedValues?.request_status).toBe('SB');
    expect(result.message).toBe('OGI Record submitted successfully');
  });
});
