import { authRepository } from './auth.repository.js';
import logger from '../../shared/infrastructure/logger.js';

const ASSIGNED_WORKFLOW_FORM_FETCHERS = {
  SQM_PLAN: (userId: string) => authRepository.findAssignedSqmpAccessibleForms(userId),
  NEWPARTS: (userId: string) => authRepository.findAssignedNpiAccessibleForms(userId),
  OGI: (userId: string) => authRepository.findAssignedOgiAccessibleForms(userId),
  MNR: (userId: string) => authRepository.findAssignedMnrAccessibleForms(userId),
  QMQA: (userId: string) => authRepository.findAssignedQmqaAccessibleForms(userId),
  QMQA_MEDIA: (userId: string) => authRepository.findAssignedQmqaMediaAccessibleForms(userId),
  SQPR: (userId: string) => authRepository.findAssignedSqprAccessibleForms(userId),
  SUPPLIER_QUALITY: (userId: string) => authRepository.findAssignedSupplierQualityAccessibleForms(userId),
  SPC_TREND: (userId: string) => authRepository.findAssignedSpcTrendAccessibleForms(userId),
  '5M1E': (userId: string) => authRepository.findAssignedFiveM1EAccessibleForms(userId),
} as const;

export type AssignedWorkflowModule = keyof typeof ASSIGNED_WORKFLOW_FORM_FETCHERS;
export type AssignedFormFetcher = (userId: string) => Promise<string[]>;

async function runAssignedAccessFetcher(
  moduleName: AssignedWorkflowModule,
  fetcher: AssignedFormFetcher,
  userId: string,
) {
  try {
    return await fetcher(userId);
  } catch (error) {
    logger.warn('Assigned workflow access lookup failed; continuing without module-specific forms', {
      moduleName,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export function getAssignedWorkflowFormFetcher(moduleName?: string | null): AssignedFormFetcher | null {
  if (!moduleName) {
    return null;
  }

  return ASSIGNED_WORKFLOW_FORM_FETCHERS[
    moduleName as AssignedWorkflowModule
  ] || null;
}

export async function getAssignedWorkflowAccessibleForms(userId: string): Promise<string[]> {
  const assignedGroups = await Promise.all(
    Object.entries(ASSIGNED_WORKFLOW_FORM_FETCHERS).map(([moduleName, fetcher]) =>
      runAssignedAccessFetcher(moduleName as AssignedWorkflowModule, fetcher, userId),
    ),
  );

  return Array.from(new Set(assignedGroups.flat()));
}
