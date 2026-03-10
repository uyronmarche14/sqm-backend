import { db } from '../infrastructure/db.js';

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
    const permission = await db.selectFrom('ROLE_ACCESS')
      .where('role_id', '=', user.role_id)
      .where('form_id', '=', formId)
      .selectAll()
      .executeTakeFirst();

    if (!permission) return false;

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

    return value === true || value === 1;
  }
}

export const permissionService = new PermissionService();
