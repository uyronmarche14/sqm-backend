import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';
import { NPI_STAGE_DEFINITIONS, NPI_WORKFLOW_STAGE } from '../../../npi/workflow/npi-workflow.constants.js';

export class NpiAssignedAccessRepository {
  async findAssignedNpiAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();
    const checkerDbCode = NPI_STAGE_DEFINITIONS[NPI_WORKFLOW_STAGE.CHECKER].dbCode;
    const approverDbCode = NPI_STAGE_DEFINITIONS[NPI_WORKFLOW_STAGE.APPROVER].dbCode;
    const rejectCheckerDbCode = NPI_STAGE_DEFINITIONS[NPI_WORKFLOW_STAGE.REJECT_CHECKER].dbCode;
    const rejectApproverDbCode = NPI_STAGE_DEFINITIONS[NPI_WORKFLOW_STAGE.REJECT_APPROVER].dbCode;
    const acceptDbCode = NPI_STAGE_DEFINITIONS[NPI_WORKFLOW_STAGE.ACCEPT].dbCode;
    const lotTrackingDbCode = NPI_STAGE_DEFINITIONS[NPI_WORKFLOW_STAGE.LOT_TRACKING].dbCode;

    const approvalAssignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM NPI_LOTS n
      WHERE n.request_status IN (${checkerDbCode}, ${approverDbCode})
        AND (n.checker_id = ${userId} OR n.approver_id = ${userId})
    `.execute(db);

    if (approvalAssignments.rows.length > 0) {
      accessibleForms.add('NPILOT-09-03');
    }

    const rejectedAssignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM NPI_LOTS n
      WHERE n.request_status IN (${rejectCheckerDbCode}, ${rejectApproverDbCode})
        AND n.inspector_id = ${userId}
    `.execute(db);

    if (rejectedAssignments.rows.length > 0) {
      accessibleForms.add('NPILOT-09-04');
    }

    const lotTrackingAssignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM NPI_LOTS n
      WHERE n.request_status IN (${acceptDbCode}, ${lotTrackingDbCode})
        AND n.inspector_id = ${userId}
    `.execute(db);

    if (lotTrackingAssignments.rows.length > 0) {
      accessibleForms.add('NPILOT-09-06');
    }

    return Array.from(accessibleForms);
  }
}

export const npiAssignedAccessRepository = new NpiAssignedAccessRepository();
