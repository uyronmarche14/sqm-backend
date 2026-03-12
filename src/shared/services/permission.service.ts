import { db } from '../infrastructure/db.js';
import { authRepository } from '../../modules/auth/auth.repository.js';

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

export class PermissionService {
  private async resolveFormTargets(formId: string): Promise<string[]> {
    const targets = new Set<string>([formId]);

    const mappedForm = await db.selectFrom('FORMS')
      .select('form_id')
      .where('form_name', '=', formId)
      .executeTakeFirst();

    if (mappedForm?.form_id) {
      targets.add(mappedForm.form_id);
    }

    return Array.from(targets);
  }

  private async hasAssignedSqmpFormAccess(
    userId: string,
    formId: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const assignedForms = await authRepository.findAssignedSqmpAccessibleForms(userId);

    if (
      formId === 'SQMP-09-05' &&
      action === 'issue' &&
      assignedForms.includes('SQMP-09-04')
    ) {
      return true;
    }

    if (!assignedForms.includes(formId)) {
      return false;
    }

    const assignedActionMap: Partial<Record<string, PermissionAction[]>> = {
      'SQMP-09-03': ['view', 'viewlist', 'check', 'approve', 'reject'],
      'SQMP-09-04': ['view', 'viewlist'],
      'SQMP-09-06': ['view', 'viewlist', 'edit', 'submit'],
      'SQMP-09-07': ['view', 'viewlist', 'check', 'approve', 'reject'],
      'SQMP-09-08': ['view', 'viewlist', 'edit', 'submit'],
      'SQMP-09-09': ['view', 'viewlist', 'edit'],
    };

    return assignedActionMap[formId]?.includes(action) ?? false;
  }

  /**
   * Check if a user has a specific permission for a form/module
   */
  async checkPermission(userId: string, formId: string, action: PermissionAction): Promise<boolean> {
    // 1. Get user details with role name
    const user = await db.selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .select(['u.role_id', 'r.role_name'])
      .where('u.user_id', '=', userId)
      .executeTakeFirst();

    if (!user) return false;

    // 2. Admin Bypass (Universal Authority)
    const roleName = user.role_name.toUpperCase();
    if (roleName.includes('ADMIN')) {
      return true;
    }

    // 3. Query ROLE_ACCESS table
    // Maps standard database permission flags to internal logical actions
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
      return this.hasAssignedSqmpFormAccess(userId, formId, action);
    }

    // Map PermissionAction to database column
    const columnMap: Record<PermissionAction, keyof typeof permission> = {
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
      release: 'can_approve'
    };

    const column = columnMap[action];
    
    // Safely retrieve value (handle bit/boolean/number)
    let value = (permission as any)[column];

    // Authority Aliasing / Workflow Authority
    // If user has 'approve' permission, they are granted 'check', 'reject', 'issue', 'release' and 'submit' 
    // authority as they share the same authority level in the workflow.
    if (!value && ['check', 'reject', 'issue', 'submit', 'approve', 'release'].includes(action)) {
      const canApprove = (permission as any).can_approve;
      if (canApprove === true || canApprove === 1) {
        value = true;
      }
    }

    if (value === true || value === 1) {
      return true;
    }

    return this.hasAssignedSqmpFormAccess(userId, formId, action);
  }
}

export const permissionService = new PermissionService();
