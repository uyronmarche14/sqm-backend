import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';

export class SqprAssignedAccessRepository {
  async findAssignedSqprAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const draftAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'SQPR-03-01' AS form_id
        FROM SQPR s
        WHERE s.request_status = '2'
          AND s.incharge_id = ${userId}

        UNION ALL

        SELECT 'SQPR-03-03' AS form_id
        FROM SQPR s
        WHERE s.request_status IN ('5', '6')
          AND s.incharge_id = ${userId}

        UNION ALL

        SELECT 'SQPR-03-04' AS form_id
        FROM SQPR s
        WHERE s.request_status IN ('10', '1')
          AND s.incharge_id = ${userId}

        UNION ALL

        SELECT 'SQPR-03-02' AS form_id
        FROM SQPR s
        WHERE s.request_status IN ('3', '4')
          AND (s.checker_id = ${userId} OR s.approver_id = ${userId})
      ) sqpr_access
    `.execute(db);

    for (const row of draftAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    return Array.from(accessibleForms);
  }
}

export const sqprAssignedAccessRepository = new SqprAssignedAccessRepository();
