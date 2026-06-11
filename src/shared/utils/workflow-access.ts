import { ForbiddenError } from '../errors/AppError.js';

export type WorkflowListScope = 'assigned' | 'history' | 'mine';
export type WorkflowListSurface = string;

interface WorkflowListScopeInput {
  scope?: unknown;
  assignedToMe?: unknown;
  surface?: unknown;
}

interface WorkflowScopePredicates<TRecord> {
  isAssigned: (record: TRecord) => boolean;
  isMine?: (record: TRecord) => boolean;
  isHistoryVisible?: (record: TRecord) => boolean;
  isSurfaceVisible?: (record: TRecord, surface: WorkflowListSurface) => boolean;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return false;
}

export function resolveWorkflowListScope(
  input: WorkflowListScopeInput,
  fallback: WorkflowListScope = 'history',
): WorkflowListScope {
  const rawScope = String(input.scope || '').trim().toLowerCase();
  if (rawScope === 'assigned' || rawScope === 'history' || rawScope === 'mine') {
    return rawScope;
  }

  if (toBoolean(input.assignedToMe)) {
    return 'assigned';
  }

  return fallback;
}

export function resolveWorkflowListSurface(
  input: Pick<WorkflowListScopeInput, 'surface'>,
): WorkflowListSurface | undefined {
  const surface = String(input.surface || '').trim().toLowerCase();
  return surface || undefined;
}

export function filterWorkflowRecordsByScope<TRecord>(
  records: TRecord[],
  scope: WorkflowListScope,
  predicates: WorkflowScopePredicates<TRecord>,
): TRecord[] {
  switch (scope) {
    case 'assigned':
      return records.filter((record) => predicates.isAssigned(record));
    case 'mine':
      return records.filter((record) => predicates.isMine?.(record) ?? false);
    case 'history':
    default:
      return records.filter((record) => predicates.isHistoryVisible?.(record) ?? true);
  }
}

export function filterWorkflowRecords<TRecord>(
  records: TRecord[],
  filters: {
    scope: WorkflowListScope;
    surface?: WorkflowListSurface;
  },
  predicates: WorkflowScopePredicates<TRecord>,
): TRecord[] {
  if (filters.surface) {
    return records.filter((record) => predicates.isSurfaceVisible?.(record, filters.surface!) ?? false);
  }

  return filterWorkflowRecordsByScope(records, filters.scope, predicates);
}

export function assertWorkflowRecordAccess(options: {
  allowed: boolean;
  action: 'view' | 'update' | 'delete' | 'download' | 'save';
  moduleName: string;
  recordLabel?: string;
}) {
  if (options.allowed) {
    return;
  }

  const target = options.recordLabel || `${options.moduleName} record`;
  throw new ForbiddenError(`You do not have permission to ${options.action} this ${target}.`);
}
