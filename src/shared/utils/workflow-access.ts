import { ForbiddenError } from '../errors/AppError.js';

export type WorkflowListScope = 'assigned' | 'history' | 'mine';

interface WorkflowListScopeInput {
  scope?: unknown;
  assignedToMe?: unknown;
}

interface WorkflowScopePredicates<TRecord> {
  isAssigned: (record: TRecord) => boolean;
  isMine?: (record: TRecord) => boolean;
  isHistoryVisible?: (record: TRecord) => boolean;
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
