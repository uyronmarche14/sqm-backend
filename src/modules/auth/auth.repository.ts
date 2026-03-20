import { sql } from 'kysely';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { db } from '../../shared/infrastructure/db.js';
import { SQMP_STAGE_CODE } from '../sqmp/workflow/workflow.constants.js';
import { NPI_STAGE_DEFINITIONS, NPI_WORKFLOW_STAGE } from '../npi/workflow/npi-workflow.constants.js';
import { MNR_STAGE_TO_DB_STATUS, MNR_WORKFLOW_STAGE } from '../mnr/workflow/mnr-workflow.constants.js';
import { QMQA_LEGACY_STAGE_CODE, QMQA_WORKFLOW_STAGE } from '../qmqa/workflow/qmqa-workflow.constants.js';
import { buildFiveM1EWorkflowMetadata } from '../fiveM1E/workflow/fiveM1E-workflow.utils.js';
import { FIVE_M1E_WORKFLOW_STAGE } from '../fiveM1E/workflow/fiveM1E-workflow.constants.js';

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

  async findUserById(userId: string) {
    return await this.getQuery()
      .leftJoin('ROLES', 'ROLES.role_id', 'USERS.role_id')
      .selectAll('USERS')
      .select('ROLES.role_name')
      .where('USERS.user_id', '=', userId)
      .executeTakeFirst();
  }

  async findRoleBasedAccessibleForms(userId: string): Promise<string[]> {
    const user = await this.findUserById(userId);

    if (!user?.role_id) {
      return [];
    }

    const records = await db
      .selectFrom('ROLE_ACCESS as ra')
      .innerJoin('FORMS as f', 'ra.form_id', 'f.form_id')
      .select('f.form_name as formName')
      .where('ra.role_id', '=', user.role_id)
      .where('ra.active_flag', '=', 1)
      .where((eb) =>
        eb.or([
          eb('ra.can_view', '=', 1),
          eb('ra.can_viewlist', '=', 1),
        ]),
      )
      .execute();

    return Array.from(
      new Set(
        records
          .map((record) => record.formName)
          .filter((formName): formName is string => Boolean(formName)),
      ),
    );
  }

  async findCurrentUserRoleAccessRecords(userId: string) {
    const user = await this.findUserById(userId);

    if (!user?.role_id) {
      return [];
    }

    return await db
      .selectFrom('ROLE_ACCESS as ra')
      .innerJoin('FORMS as f', 'ra.form_id', 'f.form_id')
      .select([
        'ra.roleaccess_id as id',
        'ra.role_id as roleId',
        'f.form_name as formId',
        'f.form_name as formName',
        'f.form_url as formUrl',
        'f.menu_group as menuGroup',
        'ra.active_flag as isActive',
        'ra.can_view as canView',
        'ra.can_viewlist as canViewList',
        'ra.can_add as canAdd',
        'ra.can_edit as canEdit',
        'ra.can_delete as canDelete',
        'ra.can_approve as canApprove',
        'ra.can_check as canCheck',
        'ra.can_print as canPrint',
        'ra.can_export as canExport',
        'ra.can_attach as canAttach',
        'ra.per_site as perSite',
        'ra.pic as pic',
      ])
      .where('ra.role_id', '=', user.role_id)
      .where('ra.active_flag', '=', 1)
      .execute();
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
            AND r.last_update = (
              SELECT MAX(r2.last_update)
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

        -- QMQA-05-05: With Initial Report - VIEW access for ISSUER
        -- Issuer needs to see this menu to monitor supplier progress on initial reports
        -- Edit/Submit actions are still restricted to suppliers by ensureSupplierActor()
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

        -- QMQA-05-08: With Final Report - ISSUER ONLY
        -- Issuer adds final verification after supplier submits initial
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
        -- QMQA-05-05: With Initial Report - SUPPLIER ONLY
        -- Supplier submits initial report in SUPPLIER (11) or INITIAL_RESPONSE (13) status
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

        -- QMQA-05-08: With Final Report - Supplier gets read-only access
        -- Supplier can view but not edit in FINAL_RESPONSE and later stages
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

    // HYBRID APPROACH: Check BOTH assignment-based AND role-based permissions
    
    // =========================================================================
    // PART 1: Assignment-Based (Query QMQA table for actual assignments)
    // =========================================================================
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

  async findAssignedFiveM1EAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const rows = await sql<Record<string, unknown>>`
      SELECT
        app.ControlNo AS control_no,
        app.CreatedBy AS created_by,
        app.SiteID AS site_id,
        app.Class AS class_id,
        approval.Status AS approval_status,
        approval.ApprovalSeq AS approval_seq,
        approval.MPDPIC AS mpd_pic,
        evalPicUser.full_name AS mpd_pic_name,
        approval.MPDChecker AS mpd_checker,
        approval.MPDCheckerName AS mpd_checker_name,
        approval.MPDApprover AS mpd_approver,
        approval.MPDApproverName AS mpd_approver_name,
        approval.Reviewer AS reviewer,
        reviewerUser.full_name AS reviewer_full_name,
        approval.ReviewerName AS reviewer_name,
        approval.EvaluationIC AS evaluation_ic,
        approval.EvaluationICName AS evaluation_ic_name,
        approval.Checker AS checker,
        checkerUser.full_name AS checker_full_name,
        approval.CheckerName AS checker_name,
        approval.Approver AS approver,
        approverUser.full_name AS approver_full_name,
        approval.ApproverName AS approver_name,
        approval.FinalApprover AS final_approver,
        sqeApproverUser.full_name AS fa_full_name,
        approval.FAName AS fa_name,
        approval.DesignApproverID AS design_approver_id,
        designApproverUser.full_name AS design_approver_id_name,
        approval.DesignApproverName AS design_approver_name,
        approval.EnviApproverID AS envi_approver_id,
        enviApproverUser.full_name AS envi_approver_full_name,
        approval.EnviApproveName AS envi_approve_name,
        approval.QACheckerID AS qa_checker_id,
        sqeCheckerUser.full_name AS qa_checker_full_name,
        approval.QACheckerName AS qa_checker_name,
        approval.DSCheckerNecessary AS ds_checker_necessary,
        approval.DSAppproverNecessary AS ds_approver_necessary,
        approval.EnviCheckerNecessary AS envi_checker_necessary,
        approval.EnviAppproverNecessary AS envi_approver_necessary
      FROM TBL_5M1E_Application app
      LEFT JOIN TBL_5M1E_Approval approval
        ON app.ControlNo = approval.ControlNo
      LEFT JOIN USERS reviewerUser
        ON approval.Reviewer = reviewerUser.user_id
      LEFT JOIN USERS checkerUser
        ON approval.Checker = checkerUser.user_id
      LEFT JOIN USERS approverUser
        ON approval.Approver = approverUser.user_id
      LEFT JOIN USERS evalPicUser
        ON approval.MPDPIC = evalPicUser.user_id
      LEFT JOIN USERS enviApproverUser
        ON approval.EnviApproverID = enviApproverUser.user_id
      LEFT JOIN USERS sqeCheckerUser
        ON approval.QACheckerID = sqeCheckerUser.user_id
      LEFT JOIN USERS sqeApproverUser
        ON approval.FinalApprover = sqeApproverUser.user_id
      LEFT JOIN USERS designApproverUser
        ON approval.DesignApproverID = designApproverUser.user_id
      WHERE
        app.CreatedBy = ${userId}
        OR approval.MPDPIC = ${userId}
        OR approval.MPDChecker = ${userId}
        OR approval.MPDApprover = ${userId}
        OR approval.Reviewer = ${userId}
        OR approval.EvaluationIC = ${userId}
        OR approval.Checker = ${userId}
        OR approval.Approver = ${userId}
        OR approval.FinalApprover = ${userId}
        OR approval.DesignApproverID = ${userId}
        OR approval.EnviApproverID = ${userId}
        OR approval.QACheckerID = ${userId}
    `.execute(db);

    for (const row of rows.rows) {
      const metadata = buildFiveM1EWorkflowMetadata(row, { actorUserId: userId });
      const stage = metadata.workflowStage;
      const isSupplierOwner = String(row.created_by || '') === userId;
      const isStageOwner = metadata.nextApproverId === userId;
      const hasWorkflowActions = metadata.availableActions.length > 0;

      if (
        !hasWorkflowActions &&
        !(
          (stage === FIVE_M1E_WORKFLOW_STAGE.DRAFT && isSupplierOwner) ||
          (stage === FIVE_M1E_WORKFLOW_STAGE.RAR && isSupplierOwner) ||
          (stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE && isSupplierOwner) ||
          (stage === FIVE_M1E_WORKFLOW_STAGE.APPROVED && isStageOwner) ||
          (stage === FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION && isStageOwner) ||
          (stage === FIVE_M1E_WORKFLOW_STAGE.RELEASED && isStageOwner)
        )
      ) {
        continue;
      }

      switch (stage) {
        case FIVE_M1E_WORKFLOW_STAGE.DRAFT:
        case FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE:
          accessibleForms.add('5M1ESupplier_Submition');
          break;
        case FIVE_M1E_WORKFLOW_STAGE.RAR:
          accessibleForms.add('5M1ERAR-06-17');
          accessibleForms.add('5M1ESupplier_Submition');
          break;
        case FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER:
        case FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER:
          accessibleForms.add('5M1EApprovalSecDes-06-17');
          break;
        case FIVE_M1E_WORKFLOW_STAGE.REVIEWER:
        case FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC:
        case FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER:
        case FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER:
        case FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER:
        case FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER:
        case FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER:
        case FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER:
          accessibleForms.add('5M1EApprovalSecEnvi-06-17');
          accessibleForms.add('5M1EApprovalSecQA-06-17');
          break;
        case FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE:
          accessibleForms.add('5M1ERELEASE-06-17');
          accessibleForms.add('5M1EApprovalSecSQE-06-17');
          accessibleForms.add('5M1EJudgementSec-06-17');
          break;
        case FIVE_M1E_WORKFLOW_STAGE.APPROVED:
        case FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION:
          accessibleForms.add('5M1ERELEASE-06-17');
          accessibleForms.add('5M1EApprovalSecSQE-06-17');
          accessibleForms.add('5M1EJudgementSec-06-17');
          break;
        case FIVE_M1E_WORKFLOW_STAGE.RELEASED:
          accessibleForms.add('5M1ERELEASE-06-17');
          accessibleForms.add('5M1EJudgementSec-06-17');
          break;
        default:
          break;
      }
    }

    return Array.from(accessibleForms);
  }
}

export const authRepository = new AuthRepository();
