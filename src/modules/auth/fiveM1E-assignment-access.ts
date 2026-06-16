import { FIVE_M1E_FORM_IDS } from '@sqm/permissions-contract';
import {
  normalizeFiveM1EWorkflowStage,
  resolveFiveM1EWorkflowStageOwner,
} from '../fiveM1E/workflow/fiveM1E-workflow.utils.js';
import { FIVE_M1E_WORKFLOW_STAGE } from '../fiveM1E/workflow/fiveM1E-workflow.constants.js';

type FiveM1EAssignmentRow = Record<string, unknown>;

function getString(row: FiveM1EAssignmentRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  return undefined;
}

export function resolveAssignedFiveM1EForms(
  row: FiveM1EAssignmentRow,
  userId: string,
): string[] {
  const stage = normalizeFiveM1EWorkflowStage(row);
  const createdBy = getString(row, 'created_by', 'CreatedBy');
  const owner = resolveFiveM1EWorkflowStageOwner(row, stage);
  const isSupplierOwner = Boolean(createdBy && createdBy === userId);
  const isCurrentStageOwner = Boolean(owner.id && owner.id === userId);

  switch (stage) {
    case FIVE_M1E_WORKFLOW_STAGE.DRAFT:
    case FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE:
      return isSupplierOwner ? [FIVE_M1E_FORM_IDS.SUPPLIER_SUBMISSION] : [];
    case FIVE_M1E_WORKFLOW_STAGE.RAR:
      return isSupplierOwner ? [FIVE_M1E_FORM_IDS.RAR, FIVE_M1E_FORM_IDS.SUPPLIER_SUBMISSION] : [];
    case FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER:
    case FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER:
      return isCurrentStageOwner ? [FIVE_M1E_FORM_IDS.APPROVAL_SEC_DES] : [];
    case FIVE_M1E_WORKFLOW_STAGE.REVIEWER:
    case FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC:
    case FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER:
    case FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER:
      return isCurrentStageOwner
        ? [FIVE_M1E_FORM_IDS.APPROVAL_SEC_ENVI, FIVE_M1E_FORM_IDS.APPROVAL_SEC_QA]
        : [];
    case FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE:
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED:
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION:
      return isCurrentStageOwner
        ? [FIVE_M1E_FORM_IDS.RELEASE, FIVE_M1E_FORM_IDS.APPROVAL_SEC_SQE, FIVE_M1E_FORM_IDS.JUDGEMENT_SEC]
        : [];
    case FIVE_M1E_WORKFLOW_STAGE.RELEASED:
      return isCurrentStageOwner
        ? [FIVE_M1E_FORM_IDS.RELEASE, FIVE_M1E_FORM_IDS.JUDGEMENT_SEC]
        : [];
    default:
      return [];
  }
}
