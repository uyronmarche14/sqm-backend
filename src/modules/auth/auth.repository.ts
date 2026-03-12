import { sql } from 'kysely';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { db } from '../../shared/infrastructure/db.js';
import { SQMP_STAGE_CODE } from '../sqmp/workflow/workflow.constants.js';

export class AuthRepository extends BaseRepository<'USERS'> {
  constructor() {
    super('USERS');
  }

  /**
   * Retrieves a User by their exact email, joining their role name.
   */
  async findByEmail(email: string) {
    return await this.getQuery()
      .leftJoin('ROLES', 'ROLES.role_id', 'USERS.role_id')
      .selectAll('USERS')
      .select('ROLES.role_name')
      .where('email', '=', email)
      .executeTakeFirst();
  }

  async findById(userId: string) {
    return await this.getQuery()
      .leftJoin('ROLES', 'ROLES.role_id', 'USERS.role_id')
      .selectAll('USERS')
      .select('ROLES.role_name')
      .where('USERS.user_id', '=', userId)
      .executeTakeFirst();
  }

  // NOTE: If your users are authenticated against AD (Active Directory), 
  // you might just insert them or fetch them, rather than storing their password_hash.
  // For the sake of the blueprint, we assume standard JWT + local storage.
  
  /**
   * Updates the User's last login date or refresh token (if stored in DB)
   */
  async updateUserToken(_userId: number, _refreshToken: string | null) {
    // Implement token saving logic if storing in DB for revoking later.
    // Example: await db.updateTable('USERS').set({ refresh_token: refreshToken }).where('user_id', '=', userId).execute();
  }

  async findAssignedSqmpAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const cycle1Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM SQMP s
      WHERE s.request_status IN (${SQMP_STAGE_CODE.CHECKER}, ${SQMP_STAGE_CODE.APPROVER})
        AND (s.checker_id = ${userId} OR s.approver_id = ${userId})
    `.execute(db);

    if (cycle1Assignments.rows.length > 0) {
      accessibleForms.add('SQMP-09-03');
    }

    const cycle2Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM SQMP s
      WHERE s.request_status IN (${SQMP_STAGE_CODE.CHECKER_2ND}, ${SQMP_STAGE_CODE.APPROVER_2ND})
        AND EXISTS (
          SELECT 1
          FROM SQMP_RESPONSE r
          WHERE r.sqmp_id = s.sqmp_id
            AND r.response_date = (
              SELECT MAX(r2.response_date)
              FROM SQMP_RESPONSE r2
              WHERE r2.sqmp_id = s.sqmp_id
            )
            AND (r.checker_id = ${userId} OR r.approver_id = ${userId})
        )
    `.execute(db);

    if (cycle2Assignments.rows.length > 0) {
      accessibleForms.add('SQMP-09-07');
      accessibleForms.add('SQMP-09-09');
    }

    const issuerAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'SQMP-09-04' AS form_id
        FROM SQMP s
        WHERE s.request_status = ${SQMP_STAGE_CODE.ISSUER}
          AND s.issuer_id = ${userId}

        UNION ALL

        SELECT 'SQMP-09-05' AS form_id
        FROM SQMP s
        WHERE s.request_status IN (${SQMP_STAGE_CODE.SUPPLIER}, '13', '14')
          AND s.issuer_id = ${userId}

        UNION ALL

        SELECT 'SQMP-09-06' AS form_id
        FROM SQMP s
        WHERE s.request_status IN (
          ${SQMP_STAGE_CODE.ISSUER_2ND},
          ${SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND},
          ${SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND}
        )
          AND s.issuer_id = ${userId}

        UNION ALL

        SELECT 'SQMP-09-07' AS form_id
        FROM SQMP s
        WHERE s.request_status = ${SQMP_STAGE_CODE.ISSUER_3RD}
          AND s.issuer_id = ${userId}
      ) issuer_access
    `.execute(db);

    for (const row of issuerAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    const supplierResponseAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'SQMP-09-06' AS form_id
        FROM SQMP s
        WHERE s.request_status IN (${SQMP_STAGE_CODE.SUPPLIER}, '13', '14')
          AND (
            s.attention_id = ${userId}
            OR s.supplier_id IN (
              SELECT su.supplier_id
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
            )
          )

        UNION ALL

        SELECT 'SQMP-09-08' AS form_id
        FROM SQMP s
        WHERE s.request_status IN (${SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER}, '20')
          AND (
            s.attention_id = ${userId}
            OR s.supplier_id IN (
              SELECT su.supplier_id
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
            )
          )
      ) supplier_access
    `.execute(db);

    for (const row of supplierResponseAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    return Array.from(accessibleForms);
  }
}

export const authRepository = new AuthRepository();
