import { ssiRepository } from '../ssi.repository.js';
import { buildAchievementMetrics, buildSsiRecordFromRow } from '../shared/ssi-shared.js';
import { ssiAccessService } from '../shared/ssi-access.service.js';
import { computeSsiAvailableActions, getNextApprover, getSsiWorkflowStageLabel } from '../workflow/ssi-workflow.js';
import type { SsiActorContext } from '../types/ssi.types.js';

type SearchQuery = {
  keyword?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  month?: string;
};

export class SsiReportService {
  private decorate(actor: SsiActorContext, row: Record<string, unknown>) {
    const base = buildSsiRecordFromRow(row);
    const availableActions = computeSsiAvailableActions(base, actor);
    return {
      ...base,
      availableActions,
      workflowStageLabel: getSsiWorkflowStageLabel(base.status),
      ...getNextApprover(base),
    };
  }

  private async fetchFilteredRecords(actor: SsiActorContext, query: SearchQuery = {}) {
    const statuses = String(query.status || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const rows = await ssiRepository.findAllRecords({
      statuses: statuses.length ? statuses : undefined,
      category: query.category || null,
      keyword: query.keyword || null,
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null,
      month: query.month || null,
    });
    const records = rows.map((row) => this.decorate(actor, row as Record<string, unknown>));
    return ssiAccessService.filterReadableRecords(records, actor, 'history');
  }

  async search(actor: SsiActorContext, query: SearchQuery = {}) {
    return this.fetchFilteredRecords(actor, query);
  }

  async achievement(actor: SsiActorContext, query: SearchQuery = {}) {
    const records = await this.fetchFilteredRecords(actor, query);
    return {
      records,
      metrics: buildAchievementMetrics(records),
    };
  }

  async reports(actor: SsiActorContext, query: SearchQuery = {}) {
    const records = await this.fetchFilteredRecords(actor, query);
    const counts = records.reduce<Record<string, number>>((acc, record) => {
      acc[record.categoryFamily] = (acc[record.categoryFamily] || 0) + 1;
      return acc;
    }, {});
    return {
      records,
      summary: Object.entries(counts).map(([label, value]) => ({ label, value })),
    };
  }

  async calendar() {
    return ssiRepository.findAllPlans(['PLANNED']);
  }
}

export const ssiReportService = new SsiReportService();
