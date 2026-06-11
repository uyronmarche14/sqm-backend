import { db } from '../../../shared/infrastructure/db.js';
import type {
  NpiDatacat,
  NpiDimensioncat,
  NpiMaterialcert,
  NpiNoisecat,
  NpiVisualcat,
} from '../npi.db.types.js';
import type { NPICreationInput, NPIUpdateInput } from '../npi.schema.js';
import type {
  NpiDataCategoryInput,
  NpiDetailQueryResult,
  NpiDimensionCategoryInput,
  NpiLegacyJudgment,
  NpiLegacyParityMetadata,
  NpiMaterialCertificateInput,
  NpiNoiseCategoryInput,
  NpiResolveFormStatePayload,
  NpiResolveFormStateResponse,
  NpiSectionJudgments,
  NpiSubmitBlocker,
  NpiVisualCategoryInput,
} from '../types/npi.types.js';

const LEGACY_NA_SEVERITY_ID = 'C186A4B2-AA1E-4FC8-96FE-E0498D9C15EF';
const LEGACY_TIGHTENED_SEVERITY_ID = '939FF8ED-FF4F-406C-AD19-7ACF861B9EA2';
const LEGACY_NORMAL_SEVERITY_ID = '8D136CB4-53B1-455B-AA14-8BBA4C2FF048';
const LEGACY_REDUCED_SEVERITY_ID = '01BE43A2-764E-4214-9CFD-73297915200D';

const LEGACY_DEFECT_CLASS_IDS = {
  critical: '8AD6F311-1BD8-43CD-8B00-CDB76F54D1E9',
  major: 'E8B1E1BE-E065-436F-BC08-23D8E28D6EB6',
  minor: '855AD953-1F86-4AB3-98C9-A9FC98640FCC',
} as const;

type RangeCategoryRow = {
  std_min: number | null | undefined;
  std_max: number | null | undefined;
  actual_min?: number | null;
  actual_max?: number | null;
  cpk?: number | null | undefined;
};

type MaterialCategoryRow = {
  judgement?: boolean | number | null;
};

type ResolvedAqlState = {
  aqlMinorDefect: string | null;
  aqlMajorDefect: string | null;
  sampleSize: number;
  criticalReject: number | null;
  majorReject: number | null;
  minorReject: number | null;
  unresolved: boolean;
};

type PreparedPersistState = NpiResolveFormStateResponse & {
  visual_categories: NpiVisualCategoryInput[];
  replaceFlags: {
    data: boolean;
    dimension: boolean;
    noise: boolean;
    material: boolean;
  };
};

function normalizeString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = normalizeString(value).toLowerCase();
  return normalized === '1' || normalized === 'true';
}

function determineDefectClassType(input: { defectclass_id?: string | null; defectclass_name?: string | null }) {
  const defectClassId = normalizeString(input.defectclass_id);
  const defectClassName = normalizeString(input.defectclass_name).toLowerCase();

  if (defectClassId === LEGACY_DEFECT_CLASS_IDS.critical || defectClassName.includes('critical')) {
    return 'critical';
  }
  if (defectClassId === LEGACY_DEFECT_CLASS_IDS.major || defectClassName.includes('major')) {
    return 'major';
  }
  if (defectClassId === LEGACY_DEFECT_CLASS_IDS.minor || defectClassName.includes('minor')) {
    return 'minor';
  }

  return null;
}

export function applySpecialLotQtyCondition(
  severityId: string,
  lotQty: number,
  majorSampleSize: number,
  lotSizeMax: number,
): number {
  if (severityId === LEGACY_TIGHTENED_SEVERITY_ID) {
    return lotQty <= 49 ? lotQty : majorSampleSize;
  }

  if (severityId === LEGACY_NORMAL_SEVERITY_ID) {
    return lotQty <= 31 ? lotQty : majorSampleSize;
  }

  if (severityId === LEGACY_REDUCED_SEVERITY_ID) {
    return lotQty <= 12 ? lotQty : majorSampleSize;
  }

  return lotSizeMax;
}

export function evaluateRangeCategoryRows(
  rows: RangeCategoryRow[],
  requiredCount: number,
): NpiLegacyJudgment {
  if (requiredCount === 0) {
    return 'Accept';
  }

  if (rows.length < requiredCount) {
    return 'Reject';
  }

  for (const row of rows) {
    const actualMin = normalizeNullableNumber(row.actual_min);
    const actualMax = normalizeNullableNumber(row.actual_max);
    const stdMin = normalizeNullableNumber(row.std_min);
    const stdMax = normalizeNullableNumber(row.std_max);

    if (actualMin == null || actualMax == null || stdMin == null || stdMax == null) {
      return 'Reject';
    }

    if (actualMin < stdMin || actualMin > stdMax || actualMax > stdMax || actualMax < stdMin) {
      return 'Reject';
    }
  }

  return 'Accept';
}

export function evaluateMaterialCategoryRows(
  rows: MaterialCategoryRow[],
  requiredCount: number,
): NpiLegacyJudgment {
  if (requiredCount === 0) {
    return 'Accept';
  }

  if (rows.length < requiredCount) {
    return 'Reject';
  }

  for (const row of rows) {
    if (row.judgement == null) {
      return 'Reject';
    }

    if (!normalizeBoolean(row.judgement)) {
      return 'Reject';
    }
  }

  return 'Accept';
}

export function buildOverallJudgment(sectionJudgments: NpiSectionJudgments): NpiLegacyJudgment {
  return Object.values(sectionJudgments).every((value) => value === 'Accept') ? 'Accept' : 'Reject';
}

function buildSubmitBlockers(input: {
  ssiAccept: boolean;
  ogiRefNo: string | null;
  dataRows: RangeCategoryRow[];
  dataRequiredCount: number;
  dimensionRows: RangeCategoryRow[];
  dimensionRequiredCount: number;
  noiseRows: RangeCategoryRow[];
  noiseRequiredCount: number;
  checkerId: string | null;
  approverId: string | null;
  aqlUnresolved: boolean;
}): NpiSubmitBlocker[] {
  const blockers: NpiSubmitBlocker[] = [];

  if (input.ssiAccept) {
    if (!input.ogiRefNo) {
      blockers.push({
        code: 'OGI_REF_REQUIRED',
        message: 'OGI Reference No is required when SSI Accept is selected.',
      });
    }
  } else if (!areRangeRowsComplete(input.dataRows, input.dataRequiredCount)) {
    blockers.push({
      code: 'DATA_CATEGORY_INCOMPLETE',
      message: 'Please complete the data of data category.',
    });
  }

  if (!areRangeRowsComplete(input.dimensionRows, input.dimensionRequiredCount)) {
    blockers.push({
      code: 'DIMENSION_CATEGORY_INCOMPLETE',
      message: 'Please complete the data of dimension category.',
    });
  }

  if (!areRangeRowsComplete(input.noiseRows, input.noiseRequiredCount)) {
    blockers.push({
      code: 'NOISE_CATEGORY_INCOMPLETE',
      message: 'Please complete the data of noise category.',
    });
  }

  if (!input.checkerId) {
    blockers.push({
      code: 'CHECKER_REQUIRED',
      message: 'Please set checker and approver before Submit!',
    });
  }

  if (!input.approverId) {
    blockers.push({
      code: 'APPROVER_REQUIRED',
      message: 'Please set checker and approver before Submit!',
    });
  }

  if (input.aqlUnresolved) {
    blockers.push({
      code: 'AQL_LEVEL_UNRESOLVED',
      message: 'Lot size is out of range of severity.',
    });
  }

  return blockers;
}

function areRangeRowsComplete(rows: RangeCategoryRow[], requiredCount: number): boolean {
  if (requiredCount === 0) {
    return true;
  }

  if (rows.length < requiredCount) {
    return false;
  }

  return rows.every((row) => {
    const actualMin = normalizeNullableNumber(row.actual_min);
    const actualMax = normalizeNullableNumber(row.actual_max);
    const cpk = normalizeNullableNumber(row.cpk);
    return actualMin != null && actualMax != null && cpk != null;
  });
}

function sumVisualDefects(rows: NpiVisualCategoryInput[]) {
  return rows.reduce(
    (acc, row) => {
      const defectClassType = determineDefectClassType({ defectclass_id: row.defectclass_id });
      const quantity = normalizeNumber(row.quantity);

      if (defectClassType === 'critical') acc.totalCritical += quantity;
      if (defectClassType === 'major') acc.totalMajor += quantity;
      if (defectClassType === 'minor') acc.totalMinor += quantity;

      return acc;
    },
    {
      totalMinor: 0,
      totalMajor: 0,
      totalCritical: 0,
    },
  );
}

function normalizeVisualCategories(rows?: NpiVisualCategoryInput[] | NpiVisualcat[]): NpiVisualCategoryInput[] {
  return (rows || []).map((row) => ({
    defectclass_id: normalizeString((row as NpiVisualcat | NpiVisualCategoryInput).defectclass_id),
    defect_id: normalizeString((row as NpiVisualcat | NpiVisualCategoryInput).defect_id),
    quantity: normalizeNumber((row as NpiVisualcat | NpiVisualCategoryInput).quantity),
  }));
}

function normalizeDataCategories(rows?: NpiDataCategoryInput[] | NpiDatacat[]): NpiDataCategoryInput[] {
  return (rows || []).map((row) => ({
    partdatacategory_name: normalizeString((row as NpiDatacat | NpiDataCategoryInput).partdatacategory_name),
    std_min: normalizeNumber((row as NpiDatacat | NpiDataCategoryInput).std_min),
    std_max: normalizeNumber((row as NpiDatacat | NpiDataCategoryInput).std_max),
    actual_min: normalizeNullableNumber((row as NpiDatacat | NpiDataCategoryInput).actual_min),
    actual_max: normalizeNullableNumber((row as NpiDatacat | NpiDataCategoryInput).actual_max),
    cpk: normalizeNullableNumber((row as NpiDatacat | NpiDataCategoryInput).cpk),
    remarks: normalizeOptionalString((row as NpiDatacat | NpiDataCategoryInput).remarks) ?? undefined,
  }));
}

function normalizeDimensionCategories(rows?: NpiDimensionCategoryInput[] | NpiDimensioncat[]): NpiDimensionCategoryInput[] {
  return (rows || []).map((row) => ({
    partdimensioncategory_name: normalizeString((row as NpiDimensioncat | NpiDimensionCategoryInput).partdimensioncategory_name),
    std_min: normalizeNumber((row as NpiDimensioncat | NpiDimensionCategoryInput).std_min),
    std_max: normalizeNumber((row as NpiDimensioncat | NpiDimensionCategoryInput).std_max),
    actual_min: normalizeNullableNumber((row as NpiDimensioncat | NpiDimensionCategoryInput).actual_min),
    actual_max: normalizeNullableNumber((row as NpiDimensioncat | NpiDimensionCategoryInput).actual_max),
    cpk: normalizeNullableNumber((row as NpiDimensioncat | NpiDimensionCategoryInput).cpk),
    remarks: normalizeOptionalString((row as NpiDimensioncat | NpiDimensionCategoryInput).remarks) ?? undefined,
  }));
}

function normalizeNoiseCategories(rows?: NpiNoiseCategoryInput[] | NpiNoisecat[]): NpiNoiseCategoryInput[] {
  return (rows || []).map((row) => ({
    partnoisecategory_name: normalizeString((row as NpiNoisecat | NpiNoiseCategoryInput).partnoisecategory_name),
    std_min: normalizeNumber((row as NpiNoisecat | NpiNoiseCategoryInput).std_min),
    std_max: normalizeNumber((row as NpiNoisecat | NpiNoiseCategoryInput).std_max),
    actual_min: normalizeNullableNumber((row as NpiNoisecat | NpiNoiseCategoryInput).actual_min),
    actual_max: normalizeNullableNumber((row as NpiNoisecat | NpiNoiseCategoryInput).actual_max),
    cpk: normalizeNullableNumber((row as NpiNoisecat | NpiNoiseCategoryInput).cpk),
    remarks: normalizeOptionalString((row as NpiNoisecat | NpiNoiseCategoryInput).remarks) ?? undefined,
  }));
}

function normalizeMaterialCertificates(
  rows?: NpiMaterialCertificateInput[] | NpiMaterialcert[],
): NpiMaterialCertificateInput[] {
  return (rows || []).map((row) => ({
    component: normalizeString((row as NpiMaterialcert | NpiMaterialCertificateInput).component),
    description: normalizeString((row as NpiMaterialcert | NpiMaterialCertificateInput).description),
    required_data: normalizeString((row as NpiMaterialcert | NpiMaterialCertificateInput).required_data),
    judgement: (row as NpiMaterialcert | NpiMaterialCertificateInput).judgement ?? null,
    remarks: normalizeOptionalString((row as NpiMaterialcert | NpiMaterialCertificateInput).remarks) ?? undefined,
  }));
}

export class NpiLegacyParityService {
  async prepareForCreate(payload: NPICreationInput): Promise<PreparedPersistState> {
    return this.preparePersistState({
      partId: payload.partId ?? null,
      severityId: payload.severity ?? null,
      lotSize: payload.lotSize ?? 0,
      ssiAccept: payload.ssiAccept ?? 1,
      ogiRefNo: payload.ogiRefNo ?? null,
      checkerId: payload.checkerId || payload.checker_id || null,
      approverId: payload.approverId || payload.approver_id || null,
      visual_categories: normalizeVisualCategories(payload.visual_categories),
      data_categories: payload.data_categories,
      dimension_categories: payload.dimension_categories,
      noise_categories: payload.noise_categories,
      material_certificates: payload.material_certificates,
      existing: null,
      forceReplace: true,
    });
  }

  async prepareForUpdate(
    payload: NPIUpdateInput,
    existing: NpiDetailQueryResult,
  ): Promise<PreparedPersistState> {
    const nextPartId = payload.partId !== undefined ? payload.partId : existing.record.part_id;
    const partChanged = nextPartId !== existing.record.part_id;

    return this.preparePersistState({
      partId: nextPartId,
      severityId: payload.severity !== undefined ? payload.severity : existing.record.severity_id,
      lotSize: payload.lotSize !== undefined ? payload.lotSize : existing.record.lot_size,
      ssiAccept: payload.ssiAccept !== undefined ? payload.ssiAccept : existing.record.ssi_accept,
      ogiRefNo: payload.ogiRefNo !== undefined ? payload.ogiRefNo : existing.record.ogi_ref_no,
      checkerId:
        payload.checkerId !== undefined || payload.checker_id !== undefined
          ? payload.checkerId || payload.checker_id || null
          : existing.record.checker_id,
      approverId:
        payload.approverId !== undefined || payload.approver_id !== undefined
          ? payload.approverId || payload.approver_id || null
          : existing.record.approver_id,
      visual_categories:
        payload.visual_categories !== undefined
          ? normalizeVisualCategories(payload.visual_categories)
          : normalizeVisualCategories(existing.visual_categories),
      data_categories:
        payload.data_categories !== undefined
          ? payload.data_categories
          : undefined,
      dimension_categories:
        payload.dimension_categories !== undefined
          ? payload.dimension_categories
          : undefined,
      noise_categories:
        payload.noise_categories !== undefined
          ? payload.noise_categories
          : undefined,
      material_certificates:
        payload.material_certificates !== undefined
          ? payload.material_certificates
          : undefined,
      existing,
      forceReplace: partChanged,
    });
  }

  async evaluateDetailedRecord(data: NpiDetailQueryResult): Promise<NpiLegacyParityMetadata> {
    const prepared = await this.preparePersistState({
      partId: data.record.part_id,
      severityId: data.record.severity_id,
      lotSize: data.record.lot_size,
      ssiAccept: data.record.ssi_accept,
      ogiRefNo: data.record.ogi_ref_no,
      checkerId: data.record.checker_id,
      approverId: data.record.approver_id,
      visual_categories: normalizeVisualCategories(data.visual_categories),
      data_categories: normalizeDataCategories(data.data_categories),
      dimension_categories: normalizeDimensionCategories(data.dimension_categories),
      noise_categories: normalizeNoiseCategories(data.noise_categories),
      material_certificates: normalizeMaterialCertificates(data.material_certificates),
      existing: data,
      forceReplace: false,
    });

    return {
      aqlMinorDefect: prepared.aqlMinorDefect,
      aqlMajorDefect: prepared.aqlMajorDefect,
      sampleSize: prepared.sampleSize,
      visualJudgment: prepared.visualJudgment,
      sectionJudgments: prepared.sectionJudgments,
      overallJudgment: prepared.overallJudgment,
      submitBlockers: prepared.submitBlockers,
      verificationMode: prepared.verificationMode,
      dataCategoryReadOnly: prepared.dataCategoryReadOnly,
      requiresOgiRefNo: prepared.requiresOgiRefNo,
    };
  }

  async resolveFormState(payload: NpiResolveFormStatePayload): Promise<NpiResolveFormStateResponse> {
    const prepared = await this.preparePersistState({
      partId: payload.partId ?? null,
      severityId: payload.severity ?? null,
      lotSize: payload.lotSize ?? 0,
      ssiAccept: payload.ssiAccept ?? 1,
      ogiRefNo: payload.ogiRefNo ?? null,
      checkerId: payload.checkerId ?? null,
      approverId: payload.approverId ?? null,
      visual_categories: normalizeVisualCategories(payload.visual_categories),
      data_categories: payload.data_categories,
      dimension_categories: payload.dimension_categories,
      noise_categories: payload.noise_categories,
      material_certificates: payload.material_certificates,
      existing: null,
      forceReplace: false,
    });

    return {
      aqlMinorDefect: prepared.aqlMinorDefect,
      aqlMajorDefect: prepared.aqlMajorDefect,
      sampleSize: prepared.sampleSize,
      visualJudgment: prepared.visualJudgment,
      sectionJudgments: prepared.sectionJudgments,
      overallJudgment: prepared.overallJudgment,
      submitBlockers: prepared.submitBlockers,
      verificationMode: prepared.verificationMode,
      dataCategoryReadOnly: prepared.dataCategoryReadOnly,
      requiresOgiRefNo: prepared.requiresOgiRefNo,
      data_categories: prepared.data_categories,
      dimension_categories: prepared.dimension_categories,
      noise_categories: prepared.noise_categories,
      material_certificates: prepared.material_certificates,
      totalMinor: prepared.totalMinor,
      totalMajor: prepared.totalMajor,
      totalCritical: prepared.totalCritical,
    };
  }

  private async preparePersistState(input: {
    partId?: string | null;
    severityId?: string | null;
    lotSize?: number | null;
    ssiAccept?: boolean | number | null;
    ogiRefNo?: string | null;
    checkerId?: string | null;
    approverId?: string | null;
    visual_categories?: NpiVisualCategoryInput[];
    data_categories?: NpiDataCategoryInput[];
    dimension_categories?: NpiDimensionCategoryInput[];
    noise_categories?: NpiNoiseCategoryInput[];
    material_certificates?: NpiMaterialCertificateInput[];
    existing: NpiDetailQueryResult | null;
    forceReplace: boolean;
  }): Promise<PreparedPersistState> {
    const partId = normalizeOptionalString(input.partId);
    const severityId = normalizeOptionalString(input.severityId);
    const lotSize = normalizeNumber(input.lotSize);
    const ssiAccept = normalizeBoolean(input.ssiAccept ?? true);
    const ogiRefNo = normalizeOptionalString(input.ogiRefNo);

    const [templates, aqlState] = await Promise.all([
      this.getCategoryTemplates(partId),
      this.getAqlState(partId, severityId, lotSize),
    ]);

    const dataCategories = normalizeDataCategories(
      input.data_categories !== undefined
        ? input.data_categories
        : input.existing
          ? input.existing.data_categories
          : [],
    );
    const dimensionCategories = normalizeDimensionCategories(
      input.dimension_categories !== undefined
        ? input.dimension_categories
        : input.existing
          ? input.existing.dimension_categories
          : [],
    );
    const noiseCategories = normalizeNoiseCategories(
      input.noise_categories !== undefined
        ? input.noise_categories
        : input.existing
          ? input.existing.noise_categories
          : [],
    );
    const materialCertificates = normalizeMaterialCertificates(
      input.material_certificates !== undefined
        ? input.material_certificates
        : input.existing
          ? input.existing.material_certificates
          : [],
    );

    const resolvedDataCategories =
      input.data_categories !== undefined
        ? dataCategories
        : dataCategories.length > 0 && !input.forceReplace
          ? dataCategories
          : templates.data_categories;
    const resolvedDimensionCategories =
      input.dimension_categories !== undefined
        ? dimensionCategories
        : dimensionCategories.length > 0 && !input.forceReplace
          ? dimensionCategories
          : templates.dimension_categories;
    const resolvedNoiseCategories =
      input.noise_categories !== undefined
        ? noiseCategories
        : noiseCategories.length > 0 && !input.forceReplace
          ? noiseCategories
          : templates.noise_categories;
    const resolvedMaterialCertificates =
      input.material_certificates !== undefined
        ? materialCertificates
        : materialCertificates.length > 0 && !input.forceReplace
          ? materialCertificates
          : templates.material_certificates;

    const visualCategories = normalizeVisualCategories(input.visual_categories);
    const totals = sumVisualDefects(visualCategories);

    const visualJudgment = this.evaluateVisualJudgment({
      aqlState,
      totalCritical: totals.totalCritical,
      totalMajor: totals.totalMajor,
      totalMinor: totals.totalMinor,
    });

    const dataRequiredCount = templates.data_categories.length > 0
      ? templates.data_categories.length
      : resolvedDataCategories.length;
    const dimensionRequiredCount = templates.dimension_categories.length > 0
      ? templates.dimension_categories.length
      : resolvedDimensionCategories.length;
    const noiseRequiredCount = templates.noise_categories.length > 0
      ? templates.noise_categories.length
      : resolvedNoiseCategories.length;
    const materialRequiredCount = templates.material_certificates.length > 0
      ? templates.material_certificates.length
      : resolvedMaterialCertificates.length;

    const sectionJudgments: NpiSectionJudgments = {
      visual: visualJudgment,
      data: ssiAccept ? 'Accept' : evaluateRangeCategoryRows(resolvedDataCategories, dataRequiredCount),
      dimension: evaluateRangeCategoryRows(resolvedDimensionCategories, dimensionRequiredCount),
      noise: evaluateRangeCategoryRows(resolvedNoiseCategories, noiseRequiredCount),
      material: evaluateMaterialCategoryRows(resolvedMaterialCertificates, materialRequiredCount),
    };

    const overallJudgment = buildOverallJudgment(sectionJudgments);
    const submitBlockers = buildSubmitBlockers({
      ssiAccept,
      ogiRefNo,
      dataRows: resolvedDataCategories,
      dataRequiredCount,
      dimensionRows: resolvedDimensionCategories,
      dimensionRequiredCount,
      noiseRows: resolvedNoiseCategories,
      noiseRequiredCount,
      checkerId: normalizeOptionalString(input.checkerId),
      approverId: normalizeOptionalString(input.approverId),
      aqlUnresolved: aqlState.unresolved,
    });

    return {
      aqlMinorDefect: aqlState.aqlMinorDefect,
      aqlMajorDefect: aqlState.aqlMajorDefect,
      sampleSize: aqlState.sampleSize,
      visualJudgment,
      sectionJudgments,
      overallJudgment,
      submitBlockers,
      verificationMode: ssiAccept ? 'SSI' : 'DATA',
      dataCategoryReadOnly: ssiAccept,
      requiresOgiRefNo: ssiAccept,
      data_categories: resolvedDataCategories,
      dimension_categories: resolvedDimensionCategories,
      noise_categories: resolvedNoiseCategories,
      material_certificates: resolvedMaterialCertificates,
      visual_categories: visualCategories,
      totalMinor: totals.totalMinor,
      totalMajor: totals.totalMajor,
      totalCritical: totals.totalCritical,
      replaceFlags: {
        data: input.forceReplace || input.data_categories !== undefined,
        dimension: input.forceReplace || input.dimension_categories !== undefined,
        noise: input.forceReplace || input.noise_categories !== undefined,
        material: input.forceReplace || input.material_certificates !== undefined,
      },
    };
  }

  private evaluateVisualJudgment(input: {
    aqlState: ResolvedAqlState;
    totalCritical: number;
    totalMajor: number;
    totalMinor: number;
  }): NpiLegacyJudgment {
    const { aqlState, totalCritical, totalMajor, totalMinor } = input;

    if (
      !aqlState.aqlMajorDefect ||
      !aqlState.aqlMinorDefect ||
      aqlState.criticalReject == null ||
      aqlState.majorReject == null ||
      aqlState.minorReject == null
    ) {
      return 'Accept';
    }

    if (totalCritical >= aqlState.criticalReject) return 'Reject';
    if (totalMajor >= aqlState.majorReject) return 'Reject';
    if (totalMinor >= aqlState.minorReject) return 'Reject';
    return 'Accept';
  }

  private async getCategoryTemplates(partId: string | null) {
    if (!partId) {
      return {
        data_categories: [] as NpiDataCategoryInput[],
        dimension_categories: [] as NpiDimensionCategoryInput[],
        noise_categories: [] as NpiNoiseCategoryInput[],
        material_certificates: [] as NpiMaterialCertificateInput[],
      };
    }

    const [dataCategories, dimensionCategories, noiseCategories, materialCertificates] = await Promise.all([
      db
        .selectFrom('PARTDATACATEGORIES')
        .select(['partdatacategory_name', 'minimum', 'maximum', 'active_flag'])
        .where('part_id', '=', partId)
        .execute(),
      db
        .selectFrom('PARTDIMENSIONCATEGORIES')
        .select(['partdimensioncategory_name', 'minimum', 'maximum', 'active_flag'])
        .where('part_id', '=', partId)
        .execute(),
      db
        .selectFrom('PARTNOISECATEGORIES')
        .select(['partnoisecategory_name', 'minimum', 'maximum', 'active_flag'])
        .where('part_id', '=', partId)
        .execute(),
      db
        .selectFrom('MATERIALCERTS')
        .select(['component', 'required_data', 'materialcert_desc', 'active_flag'])
        .where('part_id', '=', partId)
        .execute(),
    ]);

    return {
      data_categories: dataCategories
        .filter((row) => row.active_flag === true || row.active_flag === 1)
        .map((row) => ({
          partdatacategory_name: normalizeString(row.partdatacategory_name),
          std_min: normalizeNumber(row.minimum),
          std_max: normalizeNumber(row.maximum),
          actual_min: null,
          actual_max: null,
          cpk: null,
          remarks: undefined,
        })),
      dimension_categories: dimensionCategories
        .filter((row) => row.active_flag === true || row.active_flag === 1)
        .map((row) => ({
          partdimensioncategory_name: normalizeString(row.partdimensioncategory_name),
          std_min: normalizeNumber(row.minimum),
          std_max: normalizeNumber(row.maximum),
          actual_min: null,
          actual_max: null,
          cpk: null,
          remarks: undefined,
        })),
      noise_categories: noiseCategories
        .filter((row) => row.active_flag === true || row.active_flag === 1)
        .map((row) => ({
          partnoisecategory_name: normalizeString(row.partnoisecategory_name),
          std_min: normalizeNumber(row.minimum),
          std_max: normalizeNumber(row.maximum),
          actual_min: null,
          actual_max: null,
          cpk: null,
          remarks: undefined,
        })),
      material_certificates: materialCertificates
        .filter((row) => row.active_flag === true || row.active_flag === 1)
        .map((row) => ({
          component: normalizeString(row.component),
          description: normalizeString(row.materialcert_desc),
          required_data: normalizeString(row.required_data),
          judgement: null,
          remarks: undefined,
        })),
    };
  }

  private async getAqlState(
    partId: string | null,
    severityId: string | null,
    lotSize: number,
  ): Promise<ResolvedAqlState> {
    if (!partId || !severityId || lotSize <= 0) {
      return {
        aqlMinorDefect: null,
        aqlMajorDefect: null,
        sampleSize: 0,
        criticalReject: null,
        majorReject: null,
        minorReject: null,
        unresolved: false,
      };
    }

    if (severityId === LEGACY_NA_SEVERITY_ID) {
      return {
        aqlMinorDefect: null,
        aqlMajorDefect: null,
        sampleSize: 0,
        criticalReject: null,
        majorReject: null,
        minorReject: null,
        unresolved: false,
      };
    }

    const part = await db
      .selectFrom('PARTS')
      .select(['aql_id'])
      .where('part_id', '=', partId)
      .executeTakeFirst();

    if (!part?.aql_id) {
      return {
        aqlMinorDefect: null,
        aqlMajorDefect: null,
        sampleSize: 0,
        criticalReject: null,
        majorReject: null,
        minorReject: null,
        unresolved: false,
      };
    }

    const rows = await db
      .selectFrom('AQLLEVEL as al')
      .innerJoin('AQL as a', 'al.aql_id', 'a.aql_id')
      .leftJoin('AQLLEVELCLASS as alc', 'al.aqllevel_id', 'alc.aqllevel_id')
      .leftJoin('DEFECTCLASS as dc', 'alc.defectclass_id', 'dc.defectclass_id')
      .select([
        'al.lot_size_max',
        'al.severity_id',
        'a.minor as aql_minor',
        'a.major as aql_major',
        'alc.samplesize',
        'alc.reject',
        'alc.defectclass_id',
        'dc.defectclass_name',
      ])
      .where('al.aql_id', '=', part.aql_id)
      .where('al.severity_id', '=', severityId)
      .where('al.lot_size_min', '<=', lotSize)
      .where('al.lot_size_max', '>=', lotSize)
      .execute();

    if (rows.length === 0) {
      return {
        aqlMinorDefect: null,
        aqlMajorDefect: null,
        sampleSize: 0,
        criticalReject: null,
        majorReject: null,
        minorReject: null,
        unresolved: true,
      };
    }

    const majorRow = rows.find((row) => determineDefectClassType(row) === 'major');
    const criticalRow = rows.find((row) => determineDefectClassType(row) === 'critical');
    const minorRow = rows.find((row) => determineDefectClassType(row) === 'minor');
    const firstRow = rows[0];

    return {
      aqlMinorDefect: normalizeOptionalString(firstRow.aql_minor),
      aqlMajorDefect: normalizeOptionalString(firstRow.aql_major),
      sampleSize: applySpecialLotQtyCondition(
        severityId,
        lotSize,
        normalizeNumber(majorRow?.samplesize),
        normalizeNumber(firstRow.lot_size_max),
      ),
      criticalReject: normalizeNullableNumber(criticalRow?.reject),
      majorReject: normalizeNullableNumber(majorRow?.reject),
      minorReject: normalizeNullableNumber(minorRow?.reject),
      unresolved: false,
    };
  }
}

export const npiLegacyParityService = new NpiLegacyParityService();
