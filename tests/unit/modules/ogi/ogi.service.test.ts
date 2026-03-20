import { beforeEach, describe, expect, it, vi } from 'vitest';

const controlNumberServiceMock = vi.hoisted(() => ({
  buildOgiDraft: vi.fn(),
  finalizeOgi: vi.fn(),
  getControlNoState: vi.fn(),
}));

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

vi.mock('../../../../src/shared/services/control-number.service.js', () => ({
  controlNumberService: controlNumberServiceMock,
}));

import { OgiService } from '../../../../src/modules/ogi/ogi.service.js';

describe('OgiService legacy workflow alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controlNumberServiceMock.buildOgiDraft.mockResolvedValue('DRF-2026-3-1-SITE');
    controlNumberServiceMock.finalizeOgi.mockResolvedValue('OGI-2026-3-1-SITE');
    controlNumberServiceMock.getControlNoState.mockReturnValue('final');
  });

  it('finalizes the control number when create is requested directly as submitted', async () => {
    let insertedValues: Record<string, unknown> | undefined;

    ogiRepositoryMock.executeTransaction.mockImplementation(async (callback: (trx: any) => unknown) => {
      const trx = {
        insertInto: vi.fn(() => ({
          values: (values: Record<string, unknown>) => {
            insertedValues = values;
            return {
              execute: vi.fn().mockResolvedValue(undefined),
            };
          },
        })),
      };

      return callback(trx);
    });

    const service = new OgiService();
    const result = await service.createRecord({
      status: 'SUBMITTED',
      siteId: 'site-1',
      supplierId: 'supplier-1',
      partId: 'part-1',
      lots: [],
      attachments: [],
    } as any, 'user-1');

    expect(controlNumberServiceMock.finalizeOgi).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 'site-1',
      }),
      expect.anything(),
    );
    expect(insertedValues).toEqual(expect.objectContaining({
      control_no: 'OGI-2026-3-1-SITE',
      request_status: 'SB',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      controlNo: 'OGI-2026-3-1-SITE',
      controlNoState: 'final',
    }));
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
        control_no: 'DRF-2026-3-1-SITE',
        site_id: 'site-1',
        site_code: 'SITE',
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

    expect(updatedValues).toEqual(expect.objectContaining({
      control_no: 'OGI-2026-3-1-SITE',
      request_status: 'SB',
    }));
    expect(result.message).toBe('OGI Record submitted successfully');
  });

  it('blocks submit when the stored record has no resolvable site data', async () => {
    ogiRepositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        ogi_id: 'ogi-1',
        control_no: 'DRF-2026-3-1-SITE',
        site_id: null,
        site_code: null,
        request_status: 'DR',
      },
    });

    const service = new OgiService();

    await expect(service.submitRecord('ogi-1', 'user-1')).rejects.toMatchObject({
      message: 'Site is required before submitting this OGI record.',
    });
  });
});
