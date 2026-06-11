import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';

export class SupplierQualityAssignedAccessRepository {
  async findAssignedSupplierQualityAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const rows = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'SQPRLAR-01-01' AS form_id
        FROM SQPR_LAR lar
        WHERE lar.request_status = '2'
          AND lar.incharge_id = ${userId}

        UNION ALL

        SELECT 'SQPRLAR-01-03' AS form_id
        FROM SQPR_LAR lar
        WHERE lar.request_status IN ('5', '6')
          AND lar.incharge_id = ${userId}

        UNION ALL

        SELECT 'SQPRLAR-01-05' AS form_id
        FROM SQPR_LAR lar
        WHERE lar.request_status IN ('10', '1')
          AND lar.incharge_id = ${userId}

        UNION ALL

        SELECT 'SQPRLAR-01-02' AS form_id
        FROM SQPR_LAR lar
        WHERE (lar.request_status = '3' AND lar.checker_id = ${userId})
           OR (lar.request_status = '4' AND lar.approver_id = ${userId})
      ) supplier_quality_access
    `.execute(db);

    for (const row of rows.rows) {
      accessibleForms.add(row.form_id);
    }

    return Array.from(accessibleForms);
  }
}

export const supplierQualityAssignedAccessRepository = new SupplierQualityAssignedAccessRepository();
