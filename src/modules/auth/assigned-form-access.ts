import { authRepository } from './auth.repository.js';

const ASSIGNED_WORKFLOW_FORM_FETCHERS = {
  SQM_PLAN: (userId: string) => authRepository.findAssignedSqmpAccessibleForms(userId),
  NEWPARTS: (userId: string) => authRepository.findAssignedNpiAccessibleForms(userId),
  MNR: (userId: string) => authRepository.findAssignedMnrAccessibleForms(userId),
  QMQA: (userId: string) => authRepository.findAssignedQmqaAccessibleForms(userId),
  QMQA_MEDIA: (userId: string) => authRepository.findAssignedQmqaMediaAccessibleForms(userId),
  SQPR: (userId: string) => authRepository.findAssignedSqprAccessibleForms(userId),
  '5M1E': (userId: string) => authRepository.findAssignedFiveM1EAccessibleForms(userId),
} as const;

export type AssignedWorkflowModule = keyof typeof ASSIGNED_WORKFLOW_FORM_FETCHERS;
export type AssignedFormFetcher = (userId: string) => Promise<string[]>;

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
    Object.values(ASSIGNED_WORKFLOW_FORM_FETCHERS).map((fetcher) => fetcher(userId)),
  );

  return Array.from(new Set(assignedGroups.flat()));
}
