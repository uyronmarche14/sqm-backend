import { db } from '../infrastructure/db.js';
import {
  getAssignmentActions,
  type AssignmentCoverageResult,
  getAssignmentRoleActions,
  getCompatibleFormCodes,
  getLegacyFormMapping,
  getModuleFormCodes,
  isWorkflowModule,
  type AssignmentRole,
} from '@sqm/permissions-contract';
import {
  getAssignedWorkflowFormFetcher,
} from '../../modules/auth/assigned-form-access.js';
import type { AssignedFormFetcher } from '../../modules/auth/assigned-form-access.js';
import { isAdminRole } from '../utils/admin.utils.js';

/**
 * Backend Permission Service
 * 
 * Ported from frontend evaluator.ts to ensure backend enforcement parity.
 */

export type PermissionAction = 
  | 'view' 
  | 'add' 
  | 'edit' 
  | 'delete' 
  | 'approve' 
  | 'check' 
  | 'print' 
  | 'export' 
  | 'viewlist' 
  | 'attach'
  | 'submit'
  | 'reject'
  | 'issue'
  | 'release';

export interface AssignmentCoverageRequest {
  formId: string;
  assignmentRole: AssignmentRole;
}

export interface PermissionEligibleUser {
  userId: string;
  fullName: string | null;
}

export type WorkflowPermissionModule =
  | 'SQM_PLAN'
  | 'NEWPARTS'
  | 'OGI'
  | 'MNR'
  | 'QMQA'
  | 'QMQA_MEDIA'
  | 'SQPR'
  | 'SUPPLIER_QUALITY'
  | 'SPC_TREND'
  | '5M1E';

const PERMISSION_ACTION_SET: ReadonlySet<PermissionAction> = new Set([
  'view',
  'add',
  'edit',
  'delete',
  'approve',
  'check',
  'print',
  'export',
  'viewlist',
  'attach',
  'submit',
  'reject',
  'issue',
  'release',
]);

export class PermissionService {
  private hasPermissionValue(value: unknown): boolean {
    return value === true || value === 1;
  }

  private recordGrantsAction(permission: Record<string, unknown>, action: PermissionAction): boolean {
    switch (action) {
      case 'view':
        return this.hasPermissionValue(permission.can_view);
      case 'viewlist':
        return this.hasPermissionValue(permission.can_viewlist);
      case 'add':
        return this.hasPermissionValue(permission.can_add);
      case 'edit':
      case 'issue':
        return this.hasPermissionValue(permission.can_edit);
      case 'submit':
        return this.hasPermissionValue(permission.can_edit) || this.hasPermissionValue(permission.can_add);
      case 'delete':
        return this.hasPermissionValue(permission.can_delete);
      case 'approve':
      case 'reject':
      case 'release':
        return this.hasPermissionValue(permission.can_approve);
      case 'check':
        return this.hasPermissionValue(permission.can_check);
      case 'print':
        return this.hasPermissionValue(permission.can_print);
      case 'export':
        return this.hasPermissionValue(permission.can_export);
      case 'attach':
        return this.hasPermissionValue(permission.can_attach);
      default:
        return false;
    }
  }

  private getAssignedFormFetcher(formId: string): AssignedFormFetcher | null {
    const legacyForm = getLegacyFormMapping(formId);
    return getAssignedWorkflowFormFetcher(legacyForm?.module);
  }

  private getAssignedAccessChecker(formId: string) {
    const fetchAssignedForms = this.getAssignedFormFetcher(formId);

    if (fetchAssignedForms) {
      return (userId: string, action: PermissionAction) =>
        this.hasAssignedWorkflowFormAccess(userId, formId, action, fetchAssignedForms);
    }

    return async (_userId: string, _action: PermissionAction) => false;
  }

  private async resolveFormTargets(formId: string): Promise<string[]> {
    const targets = new Set<string>(getCompatibleFormCodes(formId));
    for (const compatibleId of getCompatibleFormCodes(formId)) {
      targets.add(compatibleId);
    }

    const formNames = Array.from(targets);
    const mappedForms = await db.selectFrom('FORMS')
      .select(['form_id', 'form_name'])
      .where('form_name', 'in', formNames)
      .execute();

    for (const mappedForm of mappedForms) {
      if (mappedForm?.form_id) {
        targets.add(mappedForm.form_id);
      }
      if (mappedForm?.form_name) {
        targets.add(mappedForm.form_name);
      }
    }

    return Array.from(targets);
  }

  private getActionsFromPermissionRecord(permission: Record<string, unknown>): PermissionAction[] {
    const actions = new Set<PermissionAction>();
    const has = (value: unknown) => this.hasPermissionValue(value);

    if (has(permission.can_view)) {
      actions.add('view');
    }

    if (has(permission.can_viewlist)) {
      actions.add('viewlist');
    }

    if (has(permission.can_add)) {
      actions.add('add');
    }

    if (has(permission.can_edit)) {
      actions.add('edit');
      actions.add('submit');
      actions.add('issue');
    }

    if (has(permission.can_delete)) {
      actions.add('delete');
    }

    if (has(permission.can_approve)) {
      actions.add('approve');
      actions.add('reject');
      actions.add('release');
    }

    if (has(permission.can_check)) {
      actions.add('check');
    }

    if (has(permission.can_export)) {
      actions.add('export');
    }

    if (has(permission.can_attach)) {
      actions.add('attach');
    }

    return Array.from(actions);
  }

  private normalizePermissionActions(actions: readonly string[]): PermissionAction[] {
    return actions.filter((action): action is PermissionAction =>
      PERMISSION_ACTION_SET.has(action as PermissionAction),
    );
  }

  private async resolveUserRole(userId: string) {
    return await db.selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .select(['u.role_id', 'r.role_name'])
      .where('u.user_id', '=', userId)
      .executeTakeFirst();
  }

  private async getRolePermissionRecords(userId: string, formId: string) {
    const user = await this.resolveUserRole(userId);
    if (!user?.role_id) {
      return [];
    }

    const formTargets = await this.resolveFormTargets(formId);
    if (formTargets.length === 0) {
      return [];
    }

    const query = db.selectFrom('ROLE_ACCESS')
      .where('role_id', '=', user.role_id)
      .where('active_flag', '=', 1);

    return await (
      formTargets.length === 1
        ? query.where('form_id', '=', formTargets[0])
        : query.where('form_id', 'in', formTargets)
    )
      .selectAll()
      .execute();
  }

  private async hasAssignedWorkflowFormAccess(
    userId: string,
    formId: string,
    action: PermissionAction,
    fetchAssignedForms: AssignedFormFetcher,
  ): Promise<boolean> {
    const assignedForms = await fetchAssignedForms(userId);
    const compatibleFormIds = getCompatibleFormCodes(formId);

    if (
      formId === 'SQMP-09-05' &&
      action === 'issue' &&
      assignedForms.includes('SQMP-09-04')
    ) {
      return true;
    }

    // QMQA: Assigned issuer can issue (Approved -> Issued) even without role permission
    if (
      formId === 'QMQA-05-06' &&
      action === 'issue' &&
      assignedForms.includes('QMQA-05-06')
    ) {
      return true;
    }

    // QMQA: Supplier (attention_id) can access With Initial Report (QMQA-05-05)
    if (
      formId === 'QMQA-05-05' &&
      (action === 'view' || action === 'viewlist' || action === 'edit' || action === 'submit') &&
      (assignedForms.includes('QMQA-05-05') || assignedForms.includes('QMQA-05-08'))
    ) {
      return true;
    }

    // QMQA: Issuer can access With Final Report (QMQA-05-08) to add verification
    if (
      formId === 'QMQA-05-08' &&
      (action === 'view' || action === 'viewlist' || action === 'edit' || action === 'submit' || action === 'attach') &&
      (assignedForms.includes('QMQA-05-06') || assignedForms.includes('QMQA-05-08') || assignedForms.includes('QMQA-05-05'))
    ) {
      return true;
    }

    // QMQA: Cycle 2 Checker/Approver can use the batch check/approve endpoints
    // The batch routes use QMQA-05-03 as their form code, but Cycle 2 users only have QMQA-05-09.
    // The backend auto-dispatches to checkResponse/approveResponse based on the record's stage.
    if (
      formId === 'QMQA-05-03' &&
      (action === 'check' || action === 'approve' || action === 'reject') &&
      assignedForms.includes('QMQA-05-09')
    ) {
      return true;
    }

    // QMQA: Cycle 2 Checker/Approver can access Awaiting Approval (QMQA-05-09)
    if (
      formId === 'QMQA-05-09' &&
      (action === 'view' || action === 'viewlist' || action === 'edit') &&
      assignedForms.includes('QMQA-05-09')
    ) {
      return true;
    }

    const grantedFormId = compatibleFormIds.find((candidate) => assignedForms.includes(candidate));
    if (!grantedFormId) {
      return false;
    }

    const grantedActions = this.normalizePermissionActions(getAssignmentActions(grantedFormId));
    if (grantedActions.length === 0 && (action === 'view' || action === 'viewlist')) {
      return true;
    }

    return grantedActions.includes(action);
  }

  private async hasRolePermission(userId: string, formId: string, action: PermissionAction): Promise<boolean> {
    const user = await this.resolveUserRole(userId);

    if (!user) return false;

    if (isAdminRole(user.role_name)) {
      return true;
    }

    const permissions = await this.getRolePermissionRecords(userId, formId);
    if (permissions.length === 0) {
      return false;
    }

    return permissions.some((permission) =>
      this.recordGrantsAction(permission as Record<string, unknown>, action),
    );
  }

  /**
   * Check if a user has a specific permission for a form/module
   */
  async checkPermission(userId: string, formId: string, action: PermissionAction): Promise<boolean> {
    const hasRoleAccess = await this.hasRolePermission(userId, formId, action);
    if (hasRoleAccess) {
      return true;
    }

    const hasAssignedAccess = this.getAssignedAccessChecker(formId);
    return hasAssignedAccess(userId, action);
  }

  async checkRolePermission(userId: string, formId: string, action: PermissionAction): Promise<boolean> {
    return this.hasRolePermission(userId, formId, action);
  }

  async checkModulePermission(
    userId: string,
    module: WorkflowPermissionModule,
    action: PermissionAction = 'viewlist',
  ): Promise<boolean> {
    const user = await this.resolveUserRole(userId);

    if (!user) {
      return false;
    }

    if (isAdminRole(user.role_name)) {
      return true;
    }

    if (isWorkflowModule(module)) {
      for (const formCode of getModuleFormCodes(module)) {
        if (await this.hasRolePermission(userId, formCode, action)) {
          return true;
        }
      }
    }

    const fetchAssignedForms = getAssignedWorkflowFormFetcher(module);
    if (!fetchAssignedForms) {
      return false;
    }

    const assignedForms = await fetchAssignedForms(userId);
    return assignedForms.some((formId) => {
      const actions = this.normalizePermissionActions(getAssignmentActions(formId));

      if (actions.length === 0 && (action === 'view' || action === 'viewlist')) {
        return true;
      }

      if (actions.includes(action)) {
        return true;
      }

      return false;
    });
  }

  async findUsersWithRolePermission(formId: string, action: PermissionAction): Promise<PermissionEligibleUser[]> {
    const formTargets = await this.resolveFormTargets(formId);
    if (formTargets.length === 0) {
      return [];
    }

    const roleAccessUsers = await db
      .selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .innerJoin('ROLE_ACCESS as ra', 'ra.role_id', 'r.role_id')
      .select([
        'u.user_id as userId',
        'u.full_name as fullName',
        'ra.can_view as can_view',
        'ra.can_viewlist as can_viewlist',
        'ra.can_add as can_add',
        'ra.can_edit as can_edit',
        'ra.can_delete as can_delete',
        'ra.can_approve as can_approve',
        'ra.can_check as can_check',
        'ra.can_print as can_print',
        'ra.can_export as can_export',
        'ra.can_attach as can_attach',
      ])
      .where('ra.form_id', 'in', formTargets)
      .where('ra.active_flag', '=', 1)
      .execute();

    const adminUsers = await db
      .selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .select(['u.user_id as userId', 'u.full_name as fullName', 'r.role_name as roleName'])
      .execute();

    const users = [
      ...roleAccessUsers.filter((user) =>
        this.recordGrantsAction(user as unknown as Record<string, unknown>, action),
      ),
      ...adminUsers.filter((user) => isAdminRole(user.roleName)),
    ];

    const seen = new Set<string>();
    return users.filter((user) => {
      if (!user.userId || seen.has(user.userId)) {
        return false;
      }
      seen.add(user.userId);
      return true;
    });
  }

  async getAssignmentCoverage(
    userId: string,
    assignments: AssignmentCoverageRequest[],
  ): Promise<AssignmentCoverageResult[]> {
    const results: AssignmentCoverageResult[] = [];

    for (const assignment of assignments) {
      const target = getLegacyFormMapping(assignment.formId);
      const derivedActions = this.normalizePermissionActions(
        getAssignmentRoleActions(
          assignment.formId,
          assignment.assignmentRole,
        ),
      );
      const permissionRecords = await this.getRolePermissionRecords(userId, assignment.formId);
      const baselineActions = Array.from(
        new Set(permissionRecords.flatMap((record) => this.getActionsFromPermissionRecord(record as Record<string, unknown>))),
      );
      const baselineActionSet = new Set(baselineActions);
      const missingBaselineActions = derivedActions.filter((action) => !baselineActionSet.has(action));

      results.push({
        userId,
        formId: assignment.formId,
        module: target?.module,
        assignmentRole: assignment.assignmentRole,
        target: target
          ? {
              module: target.module,
              subForm: target.subForm,
              section: target.section,
            }
          : undefined,
        derivedActions,
        baselineActions,
        missingBaselineActions,
        hasBaselineVisibility:
          baselineActionSet.has('view') || baselineActionSet.has('viewlist'),
        reliesOnAssignment:
          derivedActions.length > 0 && missingBaselineActions.length > 0,
      });
    }

    return results;
  }
}

export const permissionService = new PermissionService();
