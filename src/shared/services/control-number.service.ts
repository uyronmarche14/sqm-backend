import { BadRequestError } from '../errors/AppError.js';
import { db } from '../infrastructure/db.js';

export type ControlNoState = 'temporary' | 'draft' | 'final' | 'manual' | 'inherited';

type DBLike = typeof db | any;

type SqmpPreviewInput = {
  fiscalYear?: number | string | null;
  siteId?: string | null;
  siteCode?: string | null;
  semester?: string | number | null;
  series?: string | number | null;
  revision?: string | number | null;
};

type SfrPreviewInput = {
  fiscalYear?: number | string | null;
  frequency?: string | number | null;
  supplierCode?: string | null;
  series?: string | number | null;
};

type SiteLookupInput = {
  siteId?: string | null;
  siteCode?: string | null;
};

type DatedSiteSequenceInput = SiteLookupInput & {
  date?: Date | string | null;
};

type MnrFinalizeInput = DatedSiteSequenceInput & {
  defectCategoryId?: string | null;
  defectCategoryAcronym?: string | null;
};

type QmqaAuditPlanInput = DatedSiteSequenceInput & {
  auditCategoryId?: string | null;
  auditCategoryCode?: string | null;
  auditPlanDate?: Date | string | null;
};

type SqprDraftInput = {
  fiscalYear: number;
  reportType: number;
  month?: number | null;
  siteCode: string;
  prefix?: string;
};

type FiveM1EFinalInput = {
  siteId?: string | null;
  siteCode?: string | null;
  partTypeId?: string | null;
  partTypeCode?: string | null;
  productId?: string | null;
  productCode?: string | null;
};

export class ControlNumberService {
  private static readonly LEGACY_MANUAL_CONTROL_NO_MAX_LENGTH = 20;

  private getExecutor(trxOrDb?: DBLike) {
    return trxOrDb || db;
  }

  private normalizeDate(value?: Date | string | null) {
    if (!value) {
      return new Date();
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private normalizeYear(value?: string | number | null) {
    const year = Number(value);
    if (!Number.isFinite(year) || year <= 0) {
      return new Date().getFullYear();
    }

    return Math.trunc(year);
  }

  private normalizeSiteCode(siteCode?: string | null) {
    return String(siteCode || '').trim().toUpperCase();
  }

  private normalizeManualSeries(value?: string | number | null) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestError('Control number series must be numeric.');
    }

    return String(Math.trunc(parsed));
  }

  private normalizeSqmpSemesterToken(value?: string | number | null) {
    const normalized = String(value || 'A').trim().toUpperCase();
    if (normalized === '2' || normalized === '2ND' || normalized === 'B') {
      return 'B';
    }

    return 'A';
  }

  private ensureLegacyManualControlNoFits(moduleName: string, controlNo: string) {
    if (controlNo.length > ControlNumberService.LEGACY_MANUAL_CONTROL_NO_MAX_LENGTH) {
      throw new BadRequestError(
        `${moduleName} control number exceeds the legacy ${ControlNumberService.LEGACY_MANUAL_CONTROL_NO_MAX_LENGTH}-character limit: ${controlNo}`,
      );
    }

    return controlNo;
  }

  private escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildStableHexToken(value: string) {
    let hash = 2166136261;

    for (const char of value) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-8);
  }

  private getRowValue(row: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }

    return null;
  }

  private async resolveSiteCode(input: SiteLookupInput, trxOrDb?: DBLike) {
    const inlineSiteCode = this.normalizeSiteCode(input.siteCode);
    if (inlineSiteCode) {
      return inlineSiteCode;
    }

    if (!input.siteId) {
      throw new BadRequestError('Site is required to build a control number.');
    }

    const site = await this.getExecutor(trxOrDb)
      .selectFrom('MFG_SITES')
      .select(['site_code', 'site_id'])
      .where('site_id', '=', input.siteId)
      .executeTakeFirst();

    const resolved = this.normalizeSiteCode(site?.site_code);
    if (!resolved) {
      throw new BadRequestError('Unable to resolve site code for control number generation.');
    }

    return resolved;
  }

  private async resolveDefectCategoryAcronym(input: MnrFinalizeInput, trxOrDb?: DBLike) {
    const inline = String(input.defectCategoryAcronym || '').trim().toUpperCase();
    if (inline) {
      return inline;
    }

    if (!input.defectCategoryId) {
      throw new BadRequestError('Defect category is required to finalize the MNR control number.');
    }

    const row = await this.getExecutor(trxOrDb)
      .selectFrom('DEFECTCATEGORIES')
      .select(['defectcategory_acronym'])
      .where('defectcategory_id', '=', input.defectCategoryId)
      .executeTakeFirst();

    const resolved = String(row?.defectcategory_acronym || '').trim().toUpperCase();
    if (!resolved) {
      throw new BadRequestError('Unable to resolve defect category acronym for MNR control number generation.');
    }

    return resolved;
  }

  private async resolveAuditCategoryCode(input: QmqaAuditPlanInput, trxOrDb?: DBLike) {
    const inline = String(input.auditCategoryCode || '').trim().toUpperCase();
    if (inline) {
      return inline;
    }

    if (!input.auditCategoryId) {
      throw new BadRequestError('Audit category is required to build the QMQA control number.');
    }

    const row = await this.getExecutor(trxOrDb)
      .selectFrom('AUDITCATEGORY')
      .select(['audit_category_code'])
      .where('audit_category_id', '=', input.auditCategoryId)
      .executeTakeFirst();

    const resolved = String(row?.audit_category_code || '').trim().toUpperCase();
    if (!resolved) {
      throw new BadRequestError('Unable to resolve audit category code for QMQA control number generation.');
    }

    return resolved;
  }

  private async resolvePartTypeCode(input: FiveM1EFinalInput, trxOrDb?: DBLike) {
    const inline = String(input.partTypeCode || '').trim().toUpperCase();
    if (inline) {
      return inline;
    }

    if (!input.partTypeId) {
      throw new BadRequestError('Part type is required to finalize the 5M1E control number.');
    }

    const row = await this.getExecutor(trxOrDb)
      .selectFrom('PARTTYPES')
      .select(['parttype_code'])
      .where('parttype_id', '=', input.partTypeId)
      .executeTakeFirst();

    const resolved = String(row?.parttype_code || '').trim().toUpperCase();
    if (!resolved) {
      throw new BadRequestError('Unable to resolve part type code for 5M1E control number generation.');
    }

    return resolved;
  }

  private async resolveProductCode(input: FiveM1EFinalInput, trxOrDb?: DBLike) {
    const inline = String(input.productCode || '').trim().toUpperCase();
    if (inline) {
      return inline;
    }

    if (!input.productId) {
      throw new BadRequestError('Product is required to finalize the 5M1E control number.');
    }

    const row = await this.getExecutor(trxOrDb)
      .selectFrom('PRODUCTS')
      .select(['product_code'])
      .where('product_id', '=', input.productId)
      .executeTakeFirst();

    const resolved = String(row?.product_code || '').trim().toUpperCase();
    if (!resolved) {
      throw new BadRequestError('Unable to resolve product code for 5M1E control number generation.');
    }

    return resolved;
  }

  private async listControlNumbers(
    tableName: string,
    likePattern: string,
    trxOrDb?: DBLike,
    columnName = 'control_no',
  ) {
    const rows = await this.getExecutor(trxOrDb)
      .selectFrom(tableName)
      .select([columnName])
      .where(columnName, 'like', likePattern)
      .execute();

    return rows
      .map((row: Record<string, unknown>) => this.getRowValue(row, columnName, 'control_no', 'ControlNo'))
      .filter((value: string | null): value is string => Boolean(value));
  }

  private getNextSequence(
    controlNos: string[],
    prefix: string,
    suffix = '',
  ) {
    const matcher = new RegExp(
      `^${this.escapeForRegex(prefix)}(\\d+)${this.escapeForRegex(suffix)}$`,
      'i',
    );

    let maxSequence = 0;
    for (const controlNo of controlNos) {
      const match = controlNo.match(matcher);
      if (!match) {
        continue;
      }

      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) {
        maxSequence = Math.max(maxSequence, parsed);
      }
    }

    return maxSequence + 1;
  }

  async previewSqmp(input: SqmpPreviewInput, trxOrDb?: DBLike) {
    const fiscalYear = this.normalizeYear(input.fiscalYear);
    const siteCode = await this.resolveSiteCode(
      { siteId: input.siteId, siteCode: input.siteCode },
      trxOrDb,
    );
    const series = this.normalizeManualSeries(input.series ?? input.revision ?? 0);
    const semester = this.normalizeSqmpSemesterToken(input.semester);

    return this.ensureLegacyManualControlNoFits(
      'SQMP',
      `SQMP-${fiscalYear}-${siteCode}-${series}-${semester}`,
    );
  }

  async previewSfr(input: SfrPreviewInput) {
    const fiscalYear = this.normalizeYear(input.fiscalYear);
    const frequency = String(input.frequency || '').trim().toUpperCase();
    const supplierCode = String(input.supplierCode || '').trim().toUpperCase();
    const series = this.normalizeManualSeries(input.series ?? 0);

    if (!frequency || !supplierCode) {
      throw new BadRequestError('Frequency and supplier code are required to preview the SFR control number.');
    }

    return this.ensureLegacyManualControlNoFits(
      'SFR',
      `SFR-${fiscalYear}-${frequency}-${supplierCode}-${series}`,
    );
  }

  private async buildDatedSiteSequence(
    tableName: string,
    prefix: string,
    input: DatedSiteSequenceInput,
    trxOrDb?: DBLike,
  ) {
    const siteCode = await this.resolveSiteCode(input, trxOrDb);
    const date = this.normalizeDate(input.date);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1);
    const basePrefix = `${prefix}-${year}-${month}-`;
    const suffix = `-${siteCode}`;
    const controlNos = await this.listControlNumbers(
      tableName,
      `${basePrefix}%${suffix}`,
      trxOrDb,
    );
    const nextSequence = this.getNextSequence(controlNos, basePrefix, suffix);

    return `${basePrefix}${nextSequence}${suffix}`;
  }

  async buildMnrDraft(input: DatedSiteSequenceInput, trxOrDb?: DBLike) {
    return this.buildDatedSiteSequence('MNR_LOTS', 'DRF', input, trxOrDb);
  }

  async finalizeMnr(input: MnrFinalizeInput, trxOrDb?: DBLike) {
    const prefix = await this.resolveDefectCategoryAcronym(input, trxOrDb);
    return this.buildDatedSiteSequence('MNR_LOTS', prefix, input, trxOrDb);
  }

  async buildNpiDraft(input: DatedSiteSequenceInput, trxOrDb?: DBLike) {
    return this.buildDatedSiteSequence('NPI_LOTS', 'DRF', input, trxOrDb);
  }

  async finalizeNpi(input: DatedSiteSequenceInput, trxOrDb?: DBLike) {
    return this.buildDatedSiteSequence('NPI_LOTS', 'IQC', input, trxOrDb);
  }

  async buildOgiDraft(input: DatedSiteSequenceInput, trxOrDb?: DBLike) {
    return this.buildDatedSiteSequence('OGI', 'DRF', input, trxOrDb);
  }

  async finalizeOgi(input: DatedSiteSequenceInput, trxOrDb?: DBLike) {
    return this.buildDatedSiteSequence('OGI', 'OGI', input, trxOrDb);
  }

  async buildQmqaAuditPlan(input: QmqaAuditPlanInput, trxOrDb?: DBLike) {
    const auditPlanDate = input.auditPlanDate ?? input.date;
    const siteCode = await this.resolveSiteCode(
      { siteId: input.siteId, siteCode: input.siteCode },
      trxOrDb,
    );
    const auditCategoryCode = await this.resolveAuditCategoryCode(input, trxOrDb);
    const date = this.normalizeDate(auditPlanDate);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1);
    const basePrefix = `${auditCategoryCode}-${year}-${month}-`;
    const suffix = `-${siteCode}`;
    const controlNos = await this.listControlNumbers(
      'QMQA_AUDIT_PLAN',
      `${basePrefix}%${suffix}`,
      trxOrDb,
    );
    const nextSequence = this.getNextSequence(controlNos, basePrefix, suffix);

    return `${basePrefix}${nextSequence}${suffix}`;
  }

  buildSqprDraft(input: SqprDraftInput) {
    const prefix = String(input.prefix || 'DRF').trim().toUpperCase();
    const normalizedSiteCode = this.normalizeSiteCode(input.siteCode);
    const controlPeriod = input.reportType === 1
      ? String(input.month || 1)
      : Number(input.month || 1) === 1
        ? 'A'
        : 'B';

    return `${prefix}-${input.fiscalYear}-${controlPeriod}-${normalizedSiteCode}`;
  }

  finalizeSqpr(controlNo: string, finalPrefix = 'SQPR') {
    const normalizedControlNo = String(controlNo || '').trim();
    if (normalizedControlNo.toUpperCase().startsWith('DRF-')) {
      return normalizedControlNo.replace(/^DRF-/i, `${String(finalPrefix).trim().toUpperCase()}-`);
    }

    return normalizedControlNo;
  }

  buildFiveM1ETemporary(now = new Date()) {
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `TMP_${year}${month}${day}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`;
  }

  buildFiveM1ESubmitted(input: { recordId?: string | number | null; currentControlNo?: string | null }) {
    const seed = `${String(input.recordId || '').trim()}|${String(input.currentControlNo || '').trim()}|5M1E`;
    return `5M-${this.buildStableHexToken(seed)}`;
  }

  async buildFiveM1EFinal(input: FiveM1EFinalInput, trxOrDb?: DBLike) {
    const siteCode = await this.resolveSiteCode(
      { siteId: input.siteId, siteCode: input.siteCode },
      trxOrDb,
    );
    const partTypeCode = await this.resolvePartTypeCode(input, trxOrDb);
    const productCode = await this.resolveProductCode(input, trxOrDb);
    const prefix = `${siteCode}-${partTypeCode}-${productCode}-`;
    const controlNos = await this.listControlNumbers(
      'TBL_5M1E_Application',
      `${prefix}%`,
      trxOrDb,
      'ControlNo',
    );
    const nextSequence = this.getNextSequence(controlNos, prefix);

    return `${prefix}${String(nextSequence).padStart(5, '0')}`;
  }

  getControlNoState(controlNo: string | null | undefined, inherited = false): ControlNoState {
    if (inherited) {
      return 'inherited';
    }

    const normalized = String(controlNo || '').trim().toUpperCase();
    if (normalized.startsWith('TMP_')) {
      return 'temporary';
    }
    if (normalized.startsWith('DRF-')) {
      return 'draft';
    }
    if (normalized.startsWith('SQMP-') || normalized.startsWith('SFR-')) {
      return 'manual';
    }

    return 'final';
  }
}

export const controlNumberService = new ControlNumberService();
