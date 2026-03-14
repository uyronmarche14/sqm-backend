import { db } from '../infrastructure/db.js';
import {
  getAssignmentActions,
  getAssignmentRoleActions,
  getCompatibleFormCodes,
  getLegacyFormMapping,
  type AssignmentRole,
} from '@sqm/permissions-contract';
import {
  getAssignedWorkflowFormFetcher,
} from '../../modules/auth/assigned-form-access.js';
import type { AssignedFormFetcher } from '../../modules/auth/assigned-form-access.js';

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

export interface AssignmentCoverageResult {
  userId: string;
  formId: string;
  module?: string;
  assignmentRole: AssignmentRole;
  target?: {
    module?: string;
    subForm?: string;
    section?: string;
  };
  derivedActions: PermissionAction[];
  baselineActions: PermissionAction[];
  missingBaselineActions: PermissionAction[];
  hasBaselineVisibility: boolean;
  reliesOnAssignment: boolean;
}

export interface PermissionEligibleUser {
  userId: string;
  fullName: string | null;
}

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
    const has = (value: unknown) => value === true || value === 1;

    if (has(permission.can_view) || has(permission.can_viewlist)) {
      actions.add('view');
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
      actions.add('check');
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
      .where('role_id', '=', user.role_id);

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

    const grantedFormId = compatibleFormIds.find((candidate) => assignedForms.includes(candidate));
    if (!grantedFormId) {
      return false;
    }

    return this.normalizePermissionActions(getAssignmentActions(grantedFormId)).includes(action);
  }

  private getPermissionColumn(action: PermissionAction) {
    const columnMap: Record<PermissionAction, string> = {
      view: 'can_view',
      add: 'can_add',
      edit: 'can_edit',
      delete: 'can_delete',
      approve: 'can_approve',
      check: 'can_check',
      print: 'can_print',
      export: 'can_export',
      viewlist: 'can_viewlist',
      attach: 'can_attach',
      submit: 'can_add',
      reject: 'can_approve',
      issue: 'can_edit',
      release: 'can_approve',
    };

    return columnMap[action];
  }

  private async hasRolePermission(userId: string, formId: string, action: PermissionAction): Promise<boolean> {
    const user = await this.resolveUserRole(userId);

    if (!user) return false;

    const roleName = user.role_name.toUpperCase();
    if (roleName.includes('ADMIN')) {
      return true;
    }

    const formTargets = await this.resolveFormTargets(formId);
    const permissionQuery = db.selectFrom('ROLE_ACCESS')
      .where('role_id', '=', user.role_id);

    const permission = await (
      formTargets.length === 1
        ? permissionQuery.where('form_id', '=', formTargets[0])
        : permissionQuery.where('form_id', 'in', formTargets)
    )
      .selectAll()
      .executeTakeFirst();

    if (!permission) {
      return false;
    }

    const column = this.getPermissionColumn(action) as keyof typeof permission;
    let value = (permission as Record<string, unknown>)[column];

    if (!value && ['check', 'reject', 'issue', 'submit', 'approve', 'release'].includes(action)) {
      const canApprove = (permission as Record<string, unknown>).can_approve;
      if (canApprove === true || canApprove === 1) {
        value = true;
      }
    }

    return value === true || value === 1;
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

  async findUsersWithRolePermission(formId: string, action: PermissionAction): Promise<PermissionEligibleUser[]> {
    const formTargets = await this.resolveFormTargets(formId);
    if (formTargets.length === 0) {
      return [];
    }

    const column = this.getPermissionColumn(action);
    const roleAccessUsers = await db
      .selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .innerJoin('ROLE_ACCESS as ra', 'ra.role_id', 'r.role_id')
      .select(['u.user_id as userId', 'u.full_name as fullName'])
      .where('ra.form_id', 'in', formTargets)
      .where((eb) =>
        eb.or([
          eb(column as any, '=', 1),
          ...(['check', 'reject', 'approve', 'release', 'submit'].includes(action)
            ? [eb('ra.can_approve', '=', 1)]
            : []),
        ]),
      )
      .execute();

    const adminUsers = await db
      .selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .select(['u.user_id as userId', 'u.full_name as fullName'])
      .where('r.role_name', 'like', '%ADMIN%')
      .execute();

    const users = [...roleAccessUsers, ...adminUsers];

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
