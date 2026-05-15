import { NotFoundError } from '../../../shared/errors/AppError.js';
import { resolveWorkflowListScope } from '../../../shared/utils/workflow-access.js';
import { ssiRepository } from '../ssi.repository.js';
import { ssiAccessService } from '../shared/ssi-access.service.js';
import { buildSsiRecordFromRow } from '../shared/ssi-shared.js';
import { computeSsiAvailableActions, getNextApprover, getSsiWorkflowStageLabel } from '../workflow/ssi-workflow.js';
import type { SsiActorContext } from '../types/ssi.types.js';

type ListQuery = {
  status?: string;
  assignedToMe?: boolean;
  scope?: string;
  surface?: string;
  reportView?: boolean;
};

export class SsiRecordQueryService {
  private decorate(row: Record<string, unknown>, actor: SsiActorContext) {
    const base = buildSsiRecordFromRow(row);
    const availableActions = computeSsiAvailableActions(base, actor);
    const nextApprover = getNextApprover(base);

    return {
      ...base,
      availableActions,
      workflowStageLabel: getSsiWorkflowStageLabel(base.status),
      ...nextApprover,
    };
  }

  async list(actor: SsiActorContext, query: ListQuery = {}) {
    const statuses = String(query.status || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const scope = resolveWorkflowListScope({
      scope: query.scope,
      assignedToMe: query.assignedToMe,
    });

    const rows = await ssiRepository.findAllRecords({
      statuses: statuses.length ? statuses : undefined,
      reportView: query.reportView,
    });
    const records = rows.map((row) => this.decorate(row as Record<string, unknown>, actor));
    return ssiAccessService.filterReadableRecords(records, actor, scope);
  }

  async getById(id: string, actor: SsiActorContext) {
    const row = await ssiRepository.findRecordById(id);
    if (!row) {
      throw new NotFoundError('SSI record not found');
    }

    const record = this.decorate(row as Record<string, unknown>, actor);
    if (!ssiAccessService.canReadRecord(record, actor)) {
      throw new NotFoundError('SSI record not found');
    }

    return record;
  }
}

export const ssiRecordQueryService = new SsiRecordQueryService();
