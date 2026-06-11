import { ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import {
  spcTrendRepository,
  type SpcTrendAttachmentRow,
} from '../spc-trend.repository.js';
import type { SpcTrendListQuery } from '../spc-trend.schema.js';
import { spcTrendAccessService } from './spc-trend-access.service.js';
import {
  buildSpcTrendRecordView,
  headerLike,
  normalizeKeyword,
  parseIsoDate,
  type SpcTrendActorContext,
} from './spc-trend-shared.js';

export class SpcTrendRecordQueryService {
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

  private buildAttachmentsByRecord(rows: SpcTrendAttachmentRow[]) {
    const attachmentsByRecord = new Map<string, SpcTrendAttachmentRow[]>();

    for (const row of rows) {
      attachmentsByRecord.set(row.spc_id, [...(attachmentsByRecord.get(row.spc_id) || []), row]);
    }

    return attachmentsByRecord;
  }

  async list(actor: SpcTrendActorContext, query: SpcTrendListQuery = {}) {
    const headers = await spcTrendRepository.findAllHeaders();
    const attachments = await spcTrendRepository.findAttachmentsByRecordIds(headers.map((row) => row.spc_id));
    const attachmentsByRecord = this.buildAttachmentsByRecord(attachments);

    const keyword = normalizeKeyword(query.keyword);
    const dateFrom = query.dateFrom ? parseIsoDate(query.dateFrom, new Date(0)) : null;
    const dateTo = query.dateTo ? parseIsoDate(query.dateTo, new Date('2999-12-31')) : null;

    const records = headers.map((header) =>
      buildSpcTrendRecordView(
        header,
        attachmentsByRecord.get(header.spc_id) || [],
        actor,
      ),
    );

    return records.filter((record) => {
      if (!spcTrendAccessService.canReadRecord(headerLike(record), actor)) {
        return false;
      }

      if (query.scope === 'assigned' && (!Array.isArray(record.availableActions) || record.availableActions.length === 0)) {
        return false;
      }

      if (!this.matchesStatus(String(record.status || ''), query.status)) {
        return false;
      }

      if (query.siteId && record.mainDetails?.siteId !== query.siteId) {
        return false;
      }

      if (query.supplierId && record.mainDetails?.supplierId !== query.supplierId) {
        return false;
      }

      if (query.partId && record.mainDetails?.partId !== query.partId) {
        return false;
      }

      const uploadDate = record.uploadDate ? new Date(record.uploadDate) : null;
      if (dateFrom && uploadDate && uploadDate < dateFrom) {
        return false;
      }
      if (dateTo && uploadDate && uploadDate > dateTo) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        record.controlNo,
        record.mainDetails?.siteName,
        record.mainDetails?.siteCode,
        record.mainDetails?.supplierName,
        record.mainDetails?.partCode,
        record.mainDetails?.partName,
        record.mainDetails?.remarks,
        record.attachment?.fileName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }

  async getById(id: string, actor: SpcTrendActorContext) {
    const header = await spcTrendRepository.findHeaderById(id);
    if (!header) {
      throw new NotFoundError('SPC Trend record not found');
    }

    if (!spcTrendAccessService.canReadRecord(header, actor)) {
      throw new ForbiddenError('You do not have access to this SPC Trend record.');
    }

    const attachments = await spcTrendRepository.findAttachmentsByRecordIds([header.spc_id]);
    return buildSpcTrendRecordView(header, attachments, actor);
  }

  async downloadAttachment(attachmentId: string, actor: SpcTrendActorContext) {
    const owner = await spcTrendRepository.findAttachmentOwner(attachmentId);
    if (!owner?.spc_id) {
      throw new NotFoundError('SPC Trend attachment not found');
    }

    const header = await spcTrendRepository.findHeaderById(owner.spc_id);
    if (!header) {
      throw new NotFoundError('SPC Trend record not found');
    }

    if (!spcTrendAccessService.canReadRecord(header, actor)) {
      throw new ForbiddenError('You do not have access to this SPC Trend attachment.');
    }

    return owner;
  }
}

export const spcTrendRecordQueryService = new SpcTrendRecordQueryService();
