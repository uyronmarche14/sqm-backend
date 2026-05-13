import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';

export class SpcTrendAssignedAccessRepository {
  async findAssignedSpcTrendAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const rows = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'SPC-05-03' AS form_id
        FROM SPC spc
        WHERE spc.request_status IN ('2', '5', '6')
          AND spc.incharge_id = ${userId}

        UNION ALL

        SELECT 'SPC-05-04' AS form_id
        FROM SPC spc
        INNER JOIN SPC_WORKFLOW workflow ON workflow.spc_id = spc.spc_id
        WHERE (spc.request_status = '3' AND workflow.checker_id = ${userId})
           OR (spc.request_status = '4' AND workflow.approver_id = ${userId})
           OR (spc.request_status IN ('10', '1') AND spc.incharge_id = ${userId})
      ) spc_trend_access
    `.execute(db);

    for (const row of rows.rows) {
      accessibleForms.add(row.form_id);
    }

    return Array.from(accessibleForms);
  }
}

export const spcTrendAssignedAccessRepository = new SpcTrendAssignedAccessRepository();
