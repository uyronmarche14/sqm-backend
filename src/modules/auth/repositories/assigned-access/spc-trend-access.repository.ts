import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';
import logger from '../../../../shared/infrastructure/logger.js';

export class SpcTrendAssignedAccessRepository {
  private async workflowTableExists() {
    const result = await sql<{ exists_flag: number }>`
      SELECT CASE
        WHEN OBJECT_ID('dbo.SPC_WORKFLOW', 'U') IS NOT NULL THEN 1
        ELSE 0
      END AS exists_flag
    `.execute(db);

    return Number(result.rows[0]?.exists_flag || 0) === 1;
  }

  async findAssignedSpcTrendAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();
    const hasWorkflowTable = await this.workflowTableExists();

    const baseRows = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'SPC-05-03' AS form_id
        FROM SPC spc
        WHERE spc.request_status IN ('2', '5', '6')
          AND spc.incharge_id = ${userId}
      ) spc_trend_access
    `.execute(db);

    for (const row of baseRows.rows) {
      accessibleForms.add(row.form_id);
    }

    if (!hasWorkflowTable) {
      const legacyRows = await sql<{ form_id: string }>`
        SELECT DISTINCT 'SPC-05-04' AS form_id
        FROM SPC spc
        WHERE spc.request_status IN ('10', '1')
          AND spc.incharge_id = ${userId}
      `.execute(db);

      for (const row of legacyRows.rows) {
        accessibleForms.add(row.form_id);
      }

      logger.warn('SPC Trend assigned-access fallback active because SPC_WORKFLOW is missing', {
        module: 'SPC_TREND',
        userId,
      });

      return Array.from(accessibleForms);
    }

    const workflowRows = await sql<{ form_id: string }>`
      SELECT DISTINCT 'SPC-05-04' AS form_id
      FROM SPC spc
      INNER JOIN SPC_WORKFLOW workflow ON workflow.spc_id = spc.spc_id
      WHERE (spc.request_status = '3' AND workflow.checker_id = ${userId})
         OR (spc.request_status = '4' AND workflow.approver_id = ${userId})
         OR (spc.request_status IN ('10', '1') AND spc.incharge_id = ${userId})
    `.execute(db);

    for (const row of workflowRows.rows) {
      accessibleForms.add(row.form_id);
    }

    return Array.from(accessibleForms);
  }
}

export const spcTrendAssignedAccessRepository = new SpcTrendAssignedAccessRepository();
