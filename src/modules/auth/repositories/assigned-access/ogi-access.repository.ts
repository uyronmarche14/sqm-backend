import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';

export class OgiAssignedAccessRepository {
  async findAssignedOgiAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const rows = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'OGI-01-02' AS form_id
        FROM OGI o
        WHERE o.request_status = 'DR'
          AND o.incharge_id = ${userId}

        UNION ALL

        SELECT 'OGI-01-03' AS form_id
        FROM OGI o
        WHERE o.request_status IN ('SB', 'SU')
          AND o.incharge_id = ${userId}

        UNION ALL

        SELECT 'OGI-01-04' AS form_id
        FROM OGI o
        WHERE o.request_status IN ('SB', 'SU')
          AND o.incharge_id = ${userId}
      ) ogi_access
    `.execute(db);

    for (const row of rows.rows) {
      accessibleForms.add(row.form_id);
    }

    return Array.from(accessibleForms);
  }
}

export const ogiAssignedAccessRepository = new OgiAssignedAccessRepository();
