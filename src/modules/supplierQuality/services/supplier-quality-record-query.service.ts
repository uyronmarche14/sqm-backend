import { NotFoundError, ForbiddenError } from '../../../shared/errors/AppError.js';
import {
  supplierQualityRepository,
  type SupplierQualityCcRow,
  type SupplierQualityDetailRow,
} from '../supplier-quality.repository.js';
import type { SupplierQualityListQuery } from '../supplier-quality.schema.js';
import { supplierQualityAccessService } from './supplier-quality-access.service.js';
import {
  buildSupplierQualityRecordView,
  headerLike,
  normalizeKeyword,
  type SupplierQualityActorContext,
} from './supplier-quality-shared.js';

export class SupplierQualityRecordQueryService {
  private matchesStatus(recordStatus: string, filterStatus?: string) {
    if (!filterStatus || filterStatus === 'all') {
      return true;
    }

    const expected = filterStatus
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    return expected.length === 0 || expected.includes(String(recordStatus || '').trim().toUpperCase());
  }

  private buildDetailsByRecord(rows: SupplierQualityDetailRow[]) {
    const detailsByRecord = new Map<string, SupplierQualityDetailRow[]>();

    for (const row of rows) {
      detailsByRecord.set(row.sqpr_lar_id, [...(detailsByRecord.get(row.sqpr_lar_id) || []), row]);
    }

    return detailsByRecord;
  }

  private buildCcByRecord(rows: SupplierQualityCcRow[]) {
    const ccByRecord = new Map<string, SupplierQualityCcRow[]>();

    for (const row of rows) {
      ccByRecord.set(row.sqpr_lar_id, [...(ccByRecord.get(row.sqpr_lar_id) || []), row]);
    }

    return ccByRecord;
  }

  async list(actor: SupplierQualityActorContext, query: SupplierQualityListQuery = {}) {
    const headers = await supplierQualityRepository.findAllHeaders();
    const details = await supplierQualityRepository.findDetailsByRecordIds(headers.map((row) => row.sqpr_lar_id));
    const ccRows = await supplierQualityRepository.findCcByRecordIds(headers.map((row) => row.sqpr_lar_id));
    const detailsByRecord = this.buildDetailsByRecord(details);
    const ccByRecord = this.buildCcByRecord(ccRows);

    const keyword = normalizeKeyword(query.keyword);
    const fiscalYearFilter = query.fiscalYear ? Number(query.fiscalYear) : undefined;
    const frequencyFilter = query.frequency ? Number(query.frequency) : undefined;

    const hydrated = headers.map((header) =>
      buildSupplierQualityRecordView(
        header,
        detailsByRecord.get(header.sqpr_lar_id) || [],
        ccByRecord.get(header.sqpr_lar_id) || [],
        actor,
      ),
    );

    const visibility = await Promise.all(hydrated.map(async (record) => ({
      record,
      canRead: await supplierQualityAccessService.canReadRecord(headerLike(record), actor),
    })));

    return visibility
      .filter((entry) => entry.canRead)
      .map((entry) => entry.record)
      .filter((record) => {
        if (query.scope === 'assigned' && (!Array.isArray(record.availableActions) || record.availableActions.length === 0)) {
          return false;
        }

        if (!this.matchesStatus(String(record.status || ''), query.status)) {
          return false;
        }

        if (query.siteId && record.mainDetails?.siteId !== query.siteId) {
          return false;
        }

        if (fiscalYearFilter && Number(record.mainDetails?.fiscalYear) !== fiscalYearFilter) {
          return false;
        }

        if (frequencyFilter && Number(record.mainDetails?.frequency) !== frequencyFilter) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return [
          record.controlNo,
          record.mainDetails?.siteName,
          record.mainDetails?.periodLabel,
          record.mainDetails?.remarks,
          record.larSummaryRemarks,
          record.larDppmSummaryRemarks,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      });
  }

  async getById(id: string, actor: SupplierQualityActorContext) {
    const header = await supplierQualityRepository.findHeaderById(id);
    if (!header) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    if (!(await supplierQualityAccessService.canReadRecord(header, actor))) {
      throw new ForbiddenError('You do not have access to this Supplier Quality record.');
    }

    const details = await supplierQualityRepository.findDetailsByRecordIds([header.sqpr_lar_id]);
    const ccRows = await supplierQualityRepository.findCcByRecordIds([header.sqpr_lar_id]);
    return buildSupplierQualityRecordView(header, details, ccRows, actor);
  }

  async downloadAttachment(attachmentId: string, actor: SupplierQualityActorContext) {
    const owner = await supplierQualityRepository.findAttachmentOwner(attachmentId);
    if (!owner?.sqpr_lar_id) {
      throw new NotFoundError('Supplier Quality attachment not found');
    }

    const header = await supplierQualityRepository.findHeaderById(owner.sqpr_lar_id);
    if (!header) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    if (!(await supplierQualityAccessService.canReadRecord(header, actor))) {
      throw new ForbiddenError('You do not have access to this Supplier Quality attachment.');
    }

    return owner;
  }
}

export const supplierQualityRecordQueryService = new SupplierQualityRecordQueryService();
