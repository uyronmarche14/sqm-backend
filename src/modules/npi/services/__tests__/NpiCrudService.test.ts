import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NpiCrudService } from '../NpiCrudService';
import { NpiMapper } from '../NpiMapper';

vi.mock('../../../../shared/services/control-number.service.js', () => ({
  controlNumberService: {
    buildNpiDraft: vi.fn().mockResolvedValue('TMP-NPI-001'),
    getControlNoState: vi.fn().mockReturnValue('draft'),
  },
}));

vi.mock('../NpiLegacyParityService', () => ({
  npiLegacyParityService: {
    prepareForCreate: vi.fn(async (payload: Record<string, unknown>) => ({
      sampleSize: Number(payload.sampleSize || 0),
      totalMinor: Number(payload.total_minor || 0),
      totalMajor: Number(payload.total_major || 0),
      totalCritical: Number(payload.total_critical || 0),
      visualJudgment: 'Accept',
      overallJudgment: 'Accept',
      aqlMinorDefect: null,
      aqlMajorDefect: null,
      sectionJudgments: {
        visual: 'Accept',
        data: 'Accept',
        dimension: 'Accept',
        noise: 'Accept',
        material: 'Accept',
      },
      submitBlockers: [],
      verificationMode: 'DATA',
      dataCategoryReadOnly: false,
      requiresOgiRefNo: false,
      visual_categories: payload.visual_categories || [],
      data_categories: payload.data_categories || [],
      dimension_categories: payload.dimension_categories || [],
      noise_categories: payload.noise_categories || [],
      material_certificates: payload.material_certificates || [],
      replaceFlags: { data: true, dimension: true, noise: true, material: true },
    })),
    prepareForUpdate: vi.fn(async (_payload: Record<string, unknown>, existing: Record<string, any>) => ({
      sampleSize: Number(existing.record.sample_size || 0),
      totalMinor: Number(existing.record.total_minor || 0),
      totalMajor: Number(existing.record.total_major || 0),
      totalCritical: Number(existing.record.total_critical || 0),
      visualJudgment: 'Accept',
      overallJudgment: 'Accept',
      aqlMinorDefect: null,
      aqlMajorDefect: null,
      sectionJudgments: {
        visual: 'Accept',
        data: 'Accept',
        dimension: 'Accept',
        noise: 'Accept',
        material: 'Accept',
      },
      submitBlockers: [],
      verificationMode: 'DATA',
      dataCategoryReadOnly: false,
      requiresOgiRefNo: false,
      visual_categories: existing.visual_categories || [],
      data_categories: existing.data_categories || [],
      dimension_categories: existing.dimension_categories || [],
      noise_categories: existing.noise_categories || [],
      material_certificates: existing.material_certificates || [],
      replaceFlags: { data: false, dimension: false, noise: false, material: false },
    })),
  },
}));

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

  const buildExistingRecord = (correctedLotVerification: number) => ({
    record: {
      npi_lot_id: 'npi-1',
      request_status: 'DR',
      inspector_id: 'user-1',
      corrected_lot_verification: correctedLotVerification,
      site_id: '11111111-1111-1111-1111-111111111111',
      part_id: '11111111-1111-1111-1111-111111111111',
      lot_size: 10,
      severity_id: '11111111-1111-1111-1111-111111111111',
      ssi_accept: 0,
    },
    attachments: [],
    visual_categories: [],
    data_categories: [],
    dimension_categories: [],
    noise_categories: [],
    material_certificates: [],
    cc_list: [],
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
    mockRepository.findByIdDetailed.mockResolvedValue(buildExistingRecord(1));

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: 'MNR-001',
        incrementCorrectedLotVerification: true,
      } as any,
      { userId: 'user-1' },
      [],
    );

    expect(updatedValues[0]?.corrected_lot_verification).toBe(2);
  });

  it('does not change corrected lot verification on update when increment flag is not set', async () => {
    mockRepository.findByIdDetailed.mockResolvedValue(buildExistingRecord(3));

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: 'MNR-001',
        remarks: 'No counter change',
      } as any,
      { userId: 'user-1' },
      [],
    );

    expect(updatedValues[0]).not.toHaveProperty('corrected_lot_verification');
  });

  it('caps corrected lot verification at 10', async () => {
    mockRepository.findByIdDetailed.mockResolvedValue(buildExistingRecord(10));

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: 'MNR-010',
        incrementCorrectedLotVerification: true,
      } as any,
      { userId: 'user-1' },
      [],
    );

    expect(updatedValues[0]?.corrected_lot_verification).toBe(10);
  });

  it('resets corrected lot verification to 0 when MNR is cleared', async () => {
    mockRepository.findByIdDetailed.mockResolvedValue(buildExistingRecord(4));

    await service.updateRecord(
      'npi-1',
      {
        referenceMnrNo: '',
      } as any,
      { userId: 'user-1' },
      [],
    );

    expect(updatedValues[0]?.reference_mnr_no).toBeNull();
    expect(updatedValues[0]?.corrected_lot_verification).toBe(0);
  });
});
