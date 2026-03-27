import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';
import { QMQA_LEGACY_STAGE_CODE, QMQA_WORKFLOW_STAGE } from '../../../qmqa/workflow/qmqa-workflow.constants.js';

export class QmqaAssignedAccessRepository {
  async findAssignedQmqaAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const cycle1Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM QMQA q
      WHERE q.request_status IN (
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER]},
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER]},
        'AA',
        'AC',
        'SU',
        'CK'
      )
        AND (q.checker_id = ${userId} OR q.approver_id = ${userId})
    `.execute(db);

    if (cycle1Assignments.rows.length > 0) {
      accessibleForms.add('QMQA-05-03');
    }

    const issuerAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'QMQA-05-06' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER]},
          'AP'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-05-05' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.SUPPLIER]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          'IS',
          'WI'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-05-08' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.FINAL_RESPONSE]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_3RD]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND]},
          'WI',
          'WF',
          'RA'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-05-09' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_3RD]},
          'RA'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-05-10' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT]},
          'RJ'
        )
          AND q.issuer_id = ${userId}
      ) issuer_access
    `.execute(db);

    for (const row of issuerAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    const supplierAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'QMQA-05-05' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.SUPPLIER]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          'IS',
          'WI'
        )
          AND (
            q.attention_id = ${userId}
            OR EXISTS (
              SELECT 1
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
                AND su.supplier_id = (
                  SELECT ap.supplier_id
                  FROM QMQA_AUDIT_PLAN ap
                  WHERE ap.qmqa_audit_plan_id = q.qmqa_audit_plan_id
                )
            )
          )

        UNION ALL

        SELECT 'QMQA-05-08' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.FINAL_RESPONSE]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT]},
          'WF',
          'RJ'
        )
          AND (
            q.attention_id = ${userId}
            OR EXISTS (
              SELECT 1
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
                AND su.supplier_id = (
                  SELECT ap.supplier_id
                  FROM QMQA_AUDIT_PLAN ap
                  WHERE ap.qmqa_audit_plan_id = q.qmqa_audit_plan_id
                )
            )
          )

        UNION ALL

        SELECT 'QMQA-05-10' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT]},
          'RJ'
        )
          AND (
            q.attention_id = ${userId}
            OR EXISTS (
              SELECT 1
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
                AND su.supplier_id = (
                  SELECT ap.supplier_id
                  FROM QMQA_AUDIT_PLAN ap
                  WHERE ap.qmqa_audit_plan_id = q.qmqa_audit_plan_id
                )
            )
          )
      ) supplier_access
    `.execute(db);

    for (const row of supplierAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    const cycle2Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM QMQA q
      WHERE q.request_status IN (
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER_2ND]},
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER_2ND]},
        'RA'
      )
        AND EXISTS (
          SELECT 1
          FROM QMQA_RESPONSE r
          WHERE r.qmqa_id = q.qmqa_id
            AND r.last_update = (
              SELECT MAX(r2.last_update)
              FROM QMQA_RESPONSE r2
              WHERE r2.qmqa_id = q.qmqa_id
            )
            AND (r.checker_id = ${userId} OR r.approver_id = ${userId})
        )
    `.execute(db);

    if (cycle2Assignments.rows.length > 0) {
      accessibleForms.add('QMQA-05-09');
    }

    return Array.from(accessibleForms);
  }

  async findAssignedQmqaMediaAccessibleForms(userId: string): Promise<string[]> {
    console.log('🎬 [QMQA_MEDIA] Starting permission check for user:', userId);
    const accessibleForms = new Set<string>();

    console.log('📋 [QMQA_MEDIA] Checking assignment-based permissions...');
    const cycle1Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM QMQA q
      WHERE q.request_status IN (
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER]},
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER]},
        'AA',
        'AC',
        'SU',
        'CK'
      )
        AND (q.checker_id = ${userId} OR q.approver_id = ${userId})
    `.execute(db);

    if (cycle1Assignments.rows.length > 0) {
      accessibleForms.add('QMQA-MEDIA-03');
    }

    const issuerAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'QMQA-MEDIA-06' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER]},
          'AP'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-MEDIA-05' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.SUPPLIER]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          'IS',
          'WI'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-MEDIA-08' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.FINAL_RESPONSE]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_3RD]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND]},
          'WI',
          'WF',
          'RA'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-MEDIA-09' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_3RD]},
          'RA'
        )
          AND q.issuer_id = ${userId}

        UNION ALL

        SELECT 'QMQA-MEDIA-10' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT]},
          'RJ'
        )
          AND q.issuer_id = ${userId}
      ) issuer_access
    `.execute(db);

    for (const row of issuerAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    const supplierAssignments = await sql<{ form_id: string }>`
      SELECT DISTINCT form_id
      FROM (
        SELECT 'QMQA-MEDIA-05' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.SUPPLIER]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE]},
          'IS',
          'WI'
        )
          AND (
            q.attention_id = ${userId}
            OR EXISTS (
              SELECT 1
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
                AND su.supplier_id = (
                  SELECT ap.supplier_id
                  FROM QMQA_AUDIT_PLAN ap
                  WHERE ap.qmqa_audit_plan_id = q.qmqa_audit_plan_id
                )
            )
          )

        UNION ALL

        SELECT 'QMQA-MEDIA-08' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.FINAL_RESPONSE]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT]},
          'WF',
          'RJ'
        )
          AND (
            q.attention_id = ${userId}
            OR EXISTS (
              SELECT 1
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
                AND su.supplier_id = (
                  SELECT ap.supplier_id
                  FROM QMQA_AUDIT_PLAN ap
                  WHERE ap.qmqa_audit_plan_id = q.qmqa_audit_plan_id
                )
            )
          )

        UNION ALL

        SELECT 'QMQA-MEDIA-10' AS form_id
        FROM QMQA q
        WHERE q.request_status IN (
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND]},
          ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT]},
          'RJ'
        )
          AND (
            q.attention_id = ${userId}
            OR EXISTS (
              SELECT 1
              FROM SUPPLIERSUSER su
              WHERE su.user_id = ${userId}
                AND su.supplier_id = (
                  SELECT ap.supplier_id
                  FROM QMQA_AUDIT_PLAN ap
                  WHERE ap.qmqa_audit_plan_id = q.qmqa_audit_plan_id
                )
            )
          )
      ) supplier_access
    `.execute(db);

    for (const row of supplierAssignments.rows) {
      accessibleForms.add(row.form_id);
    }

    const cycle2Assignments = await sql<{ has_access: number }>`
      SELECT TOP 1 1 AS has_access
      FROM QMQA q
      WHERE q.request_status IN (
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER_2ND]},
        ${QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER_2ND]},
        'RA'
      )
        AND EXISTS (
          SELECT 1
          FROM QMQA_RESPONSE r
          WHERE r.qmqa_id = q.qmqa_id
            AND r.last_update = (
              SELECT MAX(r2.last_update)
              FROM QMQA_RESPONSE r2
              WHERE r2.qmqa_id = q.qmqa_id
            )
            AND (r.checker_id = ${userId} OR r.approver_id = ${userId})
        )
    `.execute(db);

    if (cycle2Assignments.rows.length > 0) {
      accessibleForms.add('QMQA-MEDIA-09');
    }

    return Array.from(accessibleForms);
  }
}

export const qmqaAssignedAccessRepository = new QmqaAssignedAccessRepository();
