import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';
import { MNR_STAGE_TO_DB_STATUS, MNR_WORKFLOW_STAGE } from '../../../mnr/workflow/mnr-workflow.constants.js';

export class MnrAssignedAccessRepository {
  async findAssignedMnrAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const cycle1Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM MNR_LOTS l
      WHERE l.request_status IN (
        ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.CHECKER]},
        ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.APPROVER]}
      )
        AND (l.checker_id = ${userId} OR l.approver_id = ${userId})
    `.execute(db);

    if (cycle1Assignments.rows.length > 0) {
      accessibleForms.add('MNR-12-03');
    }

    const issuerAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'MNR-12-07' AS form_id
        FROM MNR_LOTS l
        WHERE l.request_status = ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.ISSUER]}
          AND l.issuer_id = ${userId}

        UNION ALL

        SELECT 'MNR-12-09' AS form_id
        FROM MNR_LOTS l
        WHERE l.request_status IN (
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.SUPPLIER]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.FINAL_RESPONSE]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.ISSUER_2ND]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.ISSUER_3RD]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND]}
        )
          AND l.issuer_id = ${userId}

        UNION ALL

        SELECT 'MNR-12-10' AS form_id
        FROM MNR_LOTS l
        WHERE l.request_status IN (
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.FINAL_RESPONSE]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.ISSUER_2ND]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.ISSUER_3RD]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND]}
        )
          AND l.issuer_id = ${userId}

        UNION ALL

        SELECT 'MNR-12-11' AS form_id
        FROM MNR_LOTS l
        WHERE l.request_status = ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND]}
          AND l.issuer_id = ${userId}

        UNION ALL

        SELECT 'MNR-12-12' AS form_id
        FROM MNR_LOTS l
        WHERE l.request_status IN (
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.ACCEPT]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.LOT_TRACKING]}
        )
          AND l.issuer_id = ${userId}
      ) issuer_access
    `.execute(db);

    for (const row of issuerAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    const supplierAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'MNR-12-09' AS form_id
        FROM MNR_LOTS l
        WHERE l.request_status IN (
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.SUPPLIER]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.FINAL_RESPONSE]}
        )
          AND (
            l.attention_id = ${userId}
            OR l.supplier_id IN (
              SELECT su.supplier_id
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
            )
          )

        UNION ALL

        SELECT 'MNR-12-11' AS form_id
        FROM MNR_LOTS l
        WHERE l.request_status IN (
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND]},
          ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.NOT_ACCEPT]}
        )
          AND (
            l.attention_id = ${userId}
            OR l.supplier_id IN (
              SELECT su.supplier_id
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
            )
          )
      ) supplier_access
    `.execute(db);

    for (const row of supplierAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    const cycle2Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM MNR_LOTS l
      WHERE l.request_status IN (
        ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.CHECKER_2ND]},
        ${MNR_STAGE_TO_DB_STATUS[MNR_WORKFLOW_STAGE.APPROVER_2ND]}
      )
        AND EXISTS (
          SELECT 1
          FROM MNR_RESPONSE r
          WHERE r.mnr_id = l.mnr_id
            AND r.last_update = (
              SELECT MAX(r2.last_update)
              FROM MNR_RESPONSE r2
              WHERE r2.mnr_id = l.mnr_id
            )
            AND (r.checker_id = ${userId} OR r.approver_id = ${userId})
        )
    `.execute(db);

    if (cycle2Assignments.rows.length > 0) {
      accessibleForms.add('MNR-12-10');
    }

    return Array.from(accessibleForms);
  }
}

export const mnrAssignedAccessRepository = new MnrAssignedAccessRepository();
