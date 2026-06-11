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
      return isSupplierOwner ? ['5M1ESupplier_Submition'] : [];
    case FIVE_M1E_WORKFLOW_STAGE.RAR:
      return isSupplierOwner ? ['5M1ERAR-06-17', '5M1ESupplier_Submition'] : [];
    case FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER:
    case FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER:
      return isCurrentStageOwner ? ['5M1EApprovalSecDes-06-17'] : [];
    case FIVE_M1E_WORKFLOW_STAGE.REVIEWER:
    case FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC:
    case FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER:
    case FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER:
      return isCurrentStageOwner
        ? ['5M1EApprovalSecEnvi-06-17', '5M1EApprovalSecQA-06-17']
        : [];
    case FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE:
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED:
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION:
      return isCurrentStageOwner
        ? ['5M1ERELEASE-06-17', '5M1EApprovalSecSQE-06-17', '5M1EJudgementSec-06-17']
        : [];
    case FIVE_M1E_WORKFLOW_STAGE.RELEASED:
      return isCurrentStageOwner
        ? ['5M1ERELEASE-06-17', '5M1EJudgementSec-06-17']
        : [];
    default:
      return [];
  }
}
