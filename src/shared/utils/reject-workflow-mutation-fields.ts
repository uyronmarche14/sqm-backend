import { BadRequestError } from '../errors/AppError.js';

const DEFAULT_WORKFLOW_MUTATION_FIELDS = ['status', 'request_status'] as const;

function hasMeaningfulValue(value: unknown) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}

export function assertNoWorkflowMutationFields(
  payload: Record<string, unknown> | undefined,
  moduleName: string,
  forbiddenFields: readonly string[] = DEFAULT_WORKFLOW_MUTATION_FIELDS,
) {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  const presentFields = forbiddenFields.filter(
    (field) => Object.prototype.hasOwnProperty.call(payload, field) && hasMeaningfulValue(payload[field]),
  );

  if (presentFields.length === 0) {
    return;
  }

  throw new BadRequestError(
    `${moduleName} workflow state cannot be changed through the generic save endpoint. Use the dedicated workflow action instead.`,
  );
}
