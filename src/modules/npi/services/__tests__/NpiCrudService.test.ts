import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NpiCrudService } from '../NpiCrudService';
import { NpiMapper } from '../NpiMapper';

describe('NpiCrudService', () => {
  let service: NpiCrudService;
  let mockRepository: any;
  let insertedValues: any[];
  let updatedValues: any[];

  const createMockTrx = () => ({
    insertInto: vi.fn(() => ({
      values: vi.fn((value) => {
        insertedValues.push(value);
        return {
          execute: vi.fn(),
        };
      }),
    })),
    updateTable: vi.fn(() => ({
      set: vi.fn((value) => {
        updatedValues.push(value);
        return {
          where: vi.fn(() => ({
            execute: vi.fn(),
          })),
        };
      }),
    })),
    deleteFrom: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn(),
      })),
    })),
  });

  beforeEach(() => {
    insertedValues = [];
    updatedValues = [];
    mockRepository = {
      findDefaultInspector: vi.fn().mockResolvedValue('default-inspector'),
      getNextSequence: vi.fn(),
      findByIdDetailed: vi.fn(),
      executeTransaction: vi.fn((callback) => callback(createMockTrx())),
    };

    service = new NpiCrudService(mockRepository, new NpiMapper());
  });

  it('stores corrected lot verification as 1 on create when MNR is selected with increment flag', async () => {
    await service.createRecord(
      {
        controlNo: 'NPI-001',
        siteId: '11111111-1111-1111-1111-111111111111',
        referenceMnrNo: 'MNR-001',
        incrementCorrectedLotVerification: true,
        lotSize: 10,
        inspectionTemp: 25,
        inspectionHum: 50,
        startTime: 800,
        endTime: 900,
        receivedTime: 700,
        endorseTime: 930,
        sampleSize: 5,
        total_minor: 0,
        total_major: 0,
        total_critical: 0,
      } as any,
      'user-1',
      [],
    );

    expect(insertedValues[0]?.corrected_lot_verification).toBe(1);
  });

  it('increments corrected lot verification on update when increment flag is set', async () => {
    mockRepository.findByIdDetailed.mockResolvedValue({
      record: {
        npi_lot_id: 'npi-1',
        corrected_lot_verification: 1,
      },
    });

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: 'MNR-001',
        incrementCorrectedLotVerification: true,
      } as any,
      'user-1',
      [],
    );

    expect(updatedValues[0]?.corrected_lot_verification).toBe(2);
  });

  it('does not change corrected lot verification on update when increment flag is not set', async () => {
    mockRepository.findByIdDetailed.mockResolvedValue({
      record: {
        npi_lot_id: 'npi-1',
        corrected_lot_verification: 3,
      },
    });

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: 'MNR-001',
        remarks: 'No counter change',
      } as any,
      'user-1',
      [],
    );

    expect(updatedValues[0]).not.toHaveProperty('corrected_lot_verification');
  });

  it('caps corrected lot verification at 10', async () => {
    mockRepository.findByIdDetailed.mockResolvedValue({
      record: {
        npi_lot_id: 'npi-1',
        corrected_lot_verification: 10,
      },
    });

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: 'MNR-010',
        incrementCorrectedLotVerification: true,
      } as any,
      'user-1',
      [],
    );

    expect(updatedValues[0]?.corrected_lot_verification).toBe(10);
  });

  it('resets corrected lot verification to 0 when MNR is cleared', async () => {
    mockRepository.findByIdDetailed.mockResolvedValue({
      record: {
        npi_lot_id: 'npi-1',
        corrected_lot_verification: 4,
      },
    });

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: '',
      } as any,
      'user-1',
      [],
    );

    expect(updatedValues[0]?.reference_mnr_no).toBeNull();
    expect(updatedValues[0]?.corrected_lot_verification).toBe(0);
  });
});
