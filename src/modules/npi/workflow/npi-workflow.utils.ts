import { NPI_STAGE_DEFINITIONS, NPI_WORKFLOW_ACTION, NPI_WORKFLOW_STAGE, type NpiWorkflowAction, type NpiWorkflowStage } from './npi-workflow.constants.js';
import type { NpiWorkflowActorContext, NpiWorkflowMetadata } from '../types/npi.types.js';
import { isAdminRole } from '../../../shared/utils/admin.utils.js';

const STAGE_ALIASES: Record<string, NpiWorkflowStage> = {
  DR: NPI_WORKFLOW_STAGE.DRAFT,
  DRAFT: NPI_WORKFLOW_STAGE.DRAFT,
  SU: NPI_WORKFLOW_STAGE.CHECKER,
  SUBMITTED: NPI_WORKFLOW_STAGE.CHECKER,
  PD: NPI_WORKFLOW_STAGE.CHECKER,
  PENDING: NPI_WORKFLOW_STAGE.CHECKER,
  CK: NPI_WORKFLOW_STAGE.APPROVER,
  CHECKED: NPI_WORKFLOW_STAGE.APPROVER,
  AP: NPI_WORKFLOW_STAGE.ACCEPT,
  APPROVED: NPI_WORKFLOW_STAGE.ACCEPT,
  R5: NPI_WORKFLOW_STAGE.REJECT_CHECKER,
  REJECT_CHECKER: NPI_WORKFLOW_STAGE.REJECT_CHECKER,
  R6: NPI_WORKFLOW_STAGE.REJECT_APPROVER,
  REJECT_APPROVER: NPI_WORKFLOW_STAGE.REJECT_APPROVER,
  RE: NPI_WORKFLOW_STAGE.REJECT_APPROVER,
  REJECTED: NPI_WORKFLOW_STAGE.REJECT_APPROVER,
  LT: NPI_WORKFLOW_STAGE.LOT_TRACKING,
  LOT_TRACKING: NPI_WORKFLOW_STAGE.LOT_TRACKING,
  LARMONITORING: NPI_WORKFLOW_STAGE.LOT_TRACKING,
  CA: NPI_WORKFLOW_STAGE.CANCELLED,
  CANCELLED: NPI_WORKFLOW_STAGE.CANCELLED,
};

export function normalizeNpiWorkflowStage(status?: string | null): NpiWorkflowStage {
  return STAGE_ALIASES[(status || '').toUpperCase()] || NPI_WORKFLOW_STAGE.DRAFT;
}

export function getNpiDbStatusesForFilter(status?: string | null): string[] | undefined {
  const tokens = String(status || '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return undefined;
  }

  const dbStatuses = new Set<string>();
  let allowAllResults = false;

  for (const token of tokens) {
    if (token === 'ALL' || token === 'SEARCH') {
      allowAllResults = true;
      continue;
    }

    if (
      token === 'PENDING' ||
      token === 'PD' ||
      token === 'SU' ||
      token === 'AAPPROVAL' ||
      token === 'APPROVAL' ||
      token === 'AA' ||
      token === 'AWAITING_CHECKED' ||
      token === 'AWAITING_APPROVAL' ||
      token === 'CHECKED' ||
      token === 'CK'
    ) {
      dbStatuses.add(getNpiDbStatus(NPI_WORKFLOW_STAGE.CHECKER));
      dbStatuses.add(getNpiDbStatus(NPI_WORKFLOW_STAGE.APPROVER));
      continue;
    }

    if (
      token === 'APPROVED' ||
      token === 'AP' ||
      token === 'ACCEPT' ||
      token === 'LOTTRACKING' ||
      token === 'LOT_TRACKING' ||
      token === 'LOT-TRACKING' ||
      token === 'LARMONITORING' ||
      token === 'LT'
    ) {
      dbStatuses.add(getNpiDbStatus(NPI_WORKFLOW_STAGE.ACCEPT));
      dbStatuses.add(getNpiDbStatus(NPI_WORKFLOW_STAGE.LOT_TRACKING));
      continue;
    }

    if (token === 'REJECTED' || token === 'R5' || token === 'R6' || token === 'RE' || token === 'RJ') {
      dbStatuses.add(getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_CHECKER));
      dbStatuses.add(getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_APPROVER));
      continue;
    }

    if (token === 'CANCEL' || token === 'CANCELLED' || token === 'CA') {
      dbStatuses.add(getNpiDbStatus(NPI_WORKFLOW_STAGE.CANCELLED));
      continue;
    }

    const stage = STAGE_ALIASES[token];
    if (stage) {
      dbStatuses.add(getNpiDbStatus(stage));
    }
  }

  if (dbStatuses.size === 0) {
    return allowAllResults ? undefined : [];
  }

  return Array.from(dbStatuses);
}

export function getNpiDbStatus(stage: NpiWorkflowStage): string {
  return NPI_STAGE_DEFINITIONS[stage].dbCode;
}

export function getNpiLegacyStageCode(stage: NpiWorkflowStage): number {
  return NPI_STAGE_DEFINITIONS[stage].legacyStageCode;
}

export function getNpiWorkflowStatus(stage: NpiWorkflowStage): string {
  return NPI_STAGE_DEFINITIONS[stage].workflowStatus;
}

function uniqueActions(actions: NpiWorkflowAction[]): NpiWorkflowAction[] {
  return [...new Set(actions)];
}

export function buildNpiWorkflowMetadata(
  record: Record<string, unknown>,
  actor?: NpiWorkflowActorContext,
): NpiWorkflowMetadata {
  const stage = normalizeNpiWorkflowStage(String(record.request_status || ''));
  const stageDefinition = NPI_STAGE_DEFINITIONS[stage];
  const userId = actor?.userId || '';
  const roleName = actor?.roleName || '';
  const admin = isAdminRole(roleName);

  const inspectorId = String(record.inspector_id || '');
  const checkerId = String(record.checker_id || '');
  const approverId = String(record.approver_id || '');

  let availableActions: NpiWorkflowAction[] = [];
  let nextApproverId: string | null = null;
  let nextApproverName: string | null = null;

  switch (stage) {
    case NPI_WORKFLOW_STAGE.DRAFT:
    case NPI_WORKFLOW_STAGE.REJECT_CHECKER:
    case NPI_WORKFLOW_STAGE.REJECT_APPROVER:
      if (admin || (userId && userId === inspectorId)) {
        availableActions = [NPI_WORKFLOW_ACTION.SUBMIT];
      }
      nextApproverId = checkerId || null;
      nextApproverName = checkerId ? String(record.checker_name || checkerId) : null;
      break;
    case NPI_WORKFLOW_STAGE.CHECKER:
      if (admin || (userId && userId === checkerId)) {
        availableActions = [NPI_WORKFLOW_ACTION.CHECK, NPI_WORKFLOW_ACTION.REJECT];
      }
      nextApproverId = approverId || null;
      nextApproverName = approverId ? String(record.approver_name || approverId) : null;
      break;
    case NPI_WORKFLOW_STAGE.APPROVER:
      if (admin || (userId && userId === approverId)) {
        availableActions = [NPI_WORKFLOW_ACTION.APPROVE, NPI_WORKFLOW_ACTION.REJECT];
      }
      break;
    case NPI_WORKFLOW_STAGE.ACCEPT:
      nextApproverId = null;
      nextApproverName = null;
      break;
    case NPI_WORKFLOW_STAGE.LOT_TRACKING:
    case NPI_WORKFLOW_STAGE.CANCELLED:
      break;
  }

  return {
    workflowStage: stage,
    workflowStageCode: stageDefinition.legacyStageCode,
    workflowStageLabel: stageDefinition.label,
    workflowStatus: stageDefinition.workflowStatus,
    availableActions: uniqueActions(availableActions),
    nextApproverId,
    nextApproverName,
  };
}

/**
 * Resolve the "owner" of the record at the current workflow stage.
 * Used by ensureActor Layer 2 (Assignment Lock).
 */
export function getNpiStageOwnerId(record: Record<string, unknown>): string | null {
  const stage = normalizeNpiWorkflowStage(String(record.request_status || ''));
  switch (stage) {
    case NPI_WORKFLOW_STAGE.DRAFT:
    case NPI_WORKFLOW_STAGE.REJECT_CHECKER:
    case NPI_WORKFLOW_STAGE.REJECT_APPROVER:
      return (record.inspector_id as string) || null;
    case NPI_WORKFLOW_STAGE.CHECKER:
      return (record.checker_id as string) || null;
    case NPI_WORKFLOW_STAGE.APPROVER:
      return (record.approver_id as string) || null;
    default:
      return null;
  }
}
