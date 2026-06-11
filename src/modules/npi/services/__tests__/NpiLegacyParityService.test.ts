import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NpiLegacyParityService,
  applySpecialLotQtyCondition,
  buildOverallJudgment,
  evaluateMaterialCategoryRows,
  evaluateRangeCategoryRows,
} from '../NpiLegacyParityService';

const LEGACY_NA_SEVERITY_ID = 'C186A4B2-AA1E-4FC8-96FE-E0498D9C15EF';
const LEGACY_TIGHTENED_SEVERITY_ID = '939FF8ED-FF4F-406C-AD19-7ACF861B9EA2';
const DEFAULT_AQL_STATE = {
  aqlMinorDefect: '1.0',
  aqlMajorDefect: '0.65',
  sampleSize: 10,
  criticalReject: 1,
  majorReject: 2,
  minorReject: 3,
  unresolved: false,
} as const;

describe('NpiLegacyParityService helpers', () => {
  it('applies the tightened-severity special lot quantity override', () => {
    expect(applySpecialLotQtyCondition(LEGACY_TIGHTENED_SEVERITY_ID, 40, 80, 125)).toBe(40);
    expect(applySpecialLotQtyCondition(LEGACY_TIGHTENED_SEVERITY_ID, 60, 80, 125)).toBe(80);
  });

  it('treats incomplete range category rows as reject', () => {
    expect(
      evaluateRangeCategoryRows(
        [{ std_min: 1, std_max: 2, actual_min: 1.1, actual_max: null, cpk: 1.33 }],
        1,
      ),
    ).toBe('Reject');
  });

  it('treats false material certificate rows as reject', () => {
    expect(evaluateMaterialCategoryRows([{ judgement: false }], 1)).toBe('Reject');
    expect(evaluateMaterialCategoryRows([{ judgement: true }], 1)).toBe('Accept');
  });

  it('builds overall judgment as reject when any section rejects', () => {
    expect(
      buildOverallJudgment({
        visual: 'Accept',
        data: 'Accept',
        dimension: 'Reject',
        noise: 'Accept',
        material: 'Accept',
      }),
    ).toBe('Reject');
  });
});

describe('NpiLegacyParityService parity evaluator', () => {
  let service: NpiLegacyParityService;

  beforeEach(() => {
    service = new NpiLegacyParityService();
  });

  it('marks manual data mode incomplete rows as reject and raises legacy submit blockers', async () => {
    vi.spyOn(service as never, 'getCategoryTemplates').mockResolvedValue({
      data_categories: [{ partdatacategory_name: 'Thickness', std_min: 1, std_max: 2, actual_min: null, actual_max: null, cpk: null }],
      dimension_categories: [{ partdimensioncategory_name: 'Width', std_min: 1, std_max: 2, actual_min: null, actual_max: null, cpk: null }],
      noise_categories: [{ partnoisecategory_name: 'Noise', std_min: 1, std_max: 2, actual_min: null, actual_max: null, cpk: null }],
      material_certificates: [{ component: 'Body', description: 'Cert', required_data: 'RoHS', judgement: null }],
    });
    vi.spyOn(service as never, 'getAqlState').mockResolvedValue({ ...DEFAULT_AQL_STATE, unresolved: true });

    const resolved = await service.resolveFormState({
      partId: 'part-1',
      severity: 'severity-1',
      lotSize: 100,
      ssiAccept: false,
      ogiRefNo: '',
    });

    expect(resolved.verificationMode).toBe('DATA');
    expect(resolved.dataCategoryReadOnly).toBe(false);
    expect(resolved.sectionJudgments).toMatchObject({
      visual: 'Accept',
      data: 'Reject',
      dimension: 'Reject',
      noise: 'Reject',
      material: 'Reject',
    });
    expect(resolved.overallJudgment).toBe('Reject');
    expect(resolved.submitBlockers.map((entry) => entry.code)).toEqual([
      'DATA_CATEGORY_INCOMPLETE',
      'DIMENSION_CATEGORY_INCOMPLETE',
      'NOISE_CATEGORY_INCOMPLETE',
      'CHECKER_REQUIRED',
      'APPROVER_REQUIRED',
      'AQL_LEVEL_UNRESOLVED',
    ]);
  });

  it('enforces OGI reference in SSI mode and auto-accepts the data category', async () => {
    vi.spyOn(service as never, 'getCategoryTemplates').mockResolvedValue({
      data_categories: [{ partdatacategory_name: 'Thickness', std_min: 1, std_max: 2, actual_min: null, actual_max: null, cpk: null }],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
    });
    vi.spyOn(service as never, 'getAqlState').mockResolvedValue(DEFAULT_AQL_STATE);

    const resolved = await service.resolveFormState({
      partId: 'part-1',
      severity: 'severity-1',
      lotSize: 100,
      ssiAccept: true,
      ogiRefNo: '',
      checkerId: 'checker-1',
      approverId: 'approver-1',
    });

    expect(resolved.verificationMode).toBe('SSI');
    expect(resolved.dataCategoryReadOnly).toBe(true);
    expect(resolved.requiresOgiRefNo).toBe(true);
    expect(resolved.sectionJudgments.data).toBe('Accept');
    expect(resolved.submitBlockers.map((entry) => entry.code)).toEqual(['OGI_REF_REQUIRED']);
  });

  it('rejects the visual section when totals hit the AQL reject threshold', async () => {
    vi.spyOn(service as never, 'getCategoryTemplates').mockResolvedValue({
      data_categories: [],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
    });
    vi.spyOn(service as never, 'getAqlState').mockResolvedValue(DEFAULT_AQL_STATE);

    const resolved = await service.resolveFormState({
      partId: 'part-1',
      severity: 'severity-1',
      lotSize: 100,
      ssiAccept: false,
      visual_categories: [
        { defectclass_id: 'E8B1E1BE-E065-436F-BC08-23D8E28D6EB6', defect_id: 'defect-1', quantity: 2 },
      ],
      checkerId: 'checker-1',
      approverId: 'approver-1',
    });

    expect(resolved.totalMajor).toBe(2);
    expect(resolved.visualJudgment).toBe('Reject');
    expect(resolved.sectionJudgments.visual).toBe('Reject');
    expect(resolved.overallJudgment).toBe('Reject');
  });

  it('preserves existing child rows when the part is unchanged on update', async () => {
    vi.spyOn(service as never, 'getCategoryTemplates').mockResolvedValue({
      data_categories: [{ partdatacategory_name: 'Template', std_min: 0, std_max: 0, actual_min: null, actual_max: null, cpk: null }],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
    });
    vi.spyOn(service as never, 'getAqlState').mockResolvedValue(DEFAULT_AQL_STATE);

    const resolved = await service.prepareForUpdate(
      {},
      {
        record: {
          part_id: 'part-1',
          severity_id: 'severity-1',
          lot_size: 100,
          ssi_accept: 0,
          ogi_ref_no: null,
          checker_id: 'checker-1',
          approver_id: 'approver-1',
        },
        attachments: [],
        visual_categories: [],
        data_categories: [
          {
            partdatacategory_name: 'Existing',
            std_min: 1,
            std_max: 2,
            actual_min: 1.1,
            actual_max: 1.9,
            cpk: 1.33,
            remarks: 'keep me',
          },
        ],
        dimension_categories: [],
        noise_categories: [],
        material_certificates: [],
        cc_list: [],
      } as never,
    );

    expect(resolved.data_categories[0]?.partdatacategory_name).toBe('Existing');
    expect(resolved.replaceFlags.data).toBe(false);
  });

  it('reseeds child rows from templates when the part changes on update', async () => {
    vi.spyOn(service as never, 'getCategoryTemplates').mockResolvedValue({
      data_categories: [{ partdatacategory_name: 'Seeded', std_min: 5, std_max: 10, actual_min: null, actual_max: null, cpk: null }],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
    });
    vi.spyOn(service as never, 'getAqlState').mockResolvedValue(DEFAULT_AQL_STATE);

    const resolved = await service.prepareForUpdate(
      { partId: 'part-2' } as never,
      {
        record: {
          part_id: 'part-1',
          severity_id: 'severity-1',
          lot_size: 100,
          ssi_accept: 0,
          ogi_ref_no: null,
          checker_id: 'checker-1',
          approver_id: 'approver-1',
        },
        attachments: [],
        visual_categories: [],
        data_categories: [
          {
            partdatacategory_name: 'Existing',
            std_min: 1,
            std_max: 2,
            actual_min: 1.1,
            actual_max: 1.9,
            cpk: 1.33,
            remarks: 'replace me',
          },
        ],
        dimension_categories: [],
        noise_categories: [],
        material_certificates: [],
        cc_list: [],
      } as never,
    );

    expect(resolved.data_categories[0]?.partdatacategory_name).toBe('Seeded');
    expect(resolved.replaceFlags.data).toBe(true);
  });

  it('returns the legacy NA severity as unresolved false with zeroed AQL state', async () => {
    const unresolved = await (service as never).getAqlState('part-1', LEGACY_NA_SEVERITY_ID, 100);

    expect(unresolved).toEqual({
      aqlMinorDefect: null,
      aqlMajorDefect: null,
      sampleSize: 0,
      criticalReject: null,
      majorReject: null,
      minorReject: null,
      unresolved: false,
    });
  });
});
