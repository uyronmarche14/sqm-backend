import { db } from '../infrastructure/db.js';
import { authRepository } from '../../modules/auth/auth.repository.js';

const SQPR_FORM_COMPATIBILITY: Record<string, string[]> = {
  'SQPR-03-01': ['SQPR-13-01', 'SQPR-13-02', 'SFR-05-01', 'SFR-05-02'],
  'SQPR-03-02': ['SQPR-13-03', 'SQPR-13-07', 'SFR-05-03'],
  'SQPR-03-03': ['SQPR-13-05', 'SFR-05-05'],
  'SQPR-03-04': ['SQPR-13-04', 'SQPR-13-06', 'SQPR-13-11', 'SFR-05-04', 'SFR-05-06', 'SFR-05-09', 'SFR-05-10'],
};

const FORM_ID_COMPATIBILITY_TARGETS: Record<string, string[]> = (() => {
  const targets: Record<string, string[]> = {};

  for (const [primary, aliases] of Object.entries(SQPR_FORM_COMPATIBILITY)) {
    targets[primary] = aliases;
    for (const alias of aliases) {
      targets[alias] = [primary, ...aliases.filter((candidate) => candidate !== alias)];
    }
  }

  return targets;
})();

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
  private getAssignedAccessChecker(formId: string) {
    if (formId.startsWith('SQMP-')) {
      return (userId: string, action: PermissionAction) =>
        this.hasAssignedSqmpFormAccess(userId, formId, action);
    }

    if (formId.startsWith('NPILOT-')) {
      return (userId: string, action: PermissionAction) =>
        this.hasAssignedNpiFormAccess(userId, formId, action);
    }

    if (formId.startsWith('MNR-')) {
      return (userId: string, action: PermissionAction) =>
        this.hasAssignedMnrFormAccess(userId, formId, action);
    }

    if (formId.startsWith('5M1E')) {
      return (userId: string, action: PermissionAction) =>
        this.hasAssignedFiveM1EFormAccess(userId, formId, action);
    }

    return async (_userId: string, _action: PermissionAction) => false;
  }

  private async resolveFormTargets(formId: string): Promise<string[]> {
    const targets = new Set<string>([formId]);
    for (const compatibleId of FORM_ID_COMPATIBILITY_TARGETS[formId] || []) {
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

  private async hasAssignedNpiFormAccess(
    userId: string,
    formId: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const assignedForms = await authRepository.findAssignedNpiAccessibleForms(userId);
    if (!assignedForms.includes(formId)) {
      return false;
    }

    const assignedActionMap: Partial<Record<string, PermissionAction[]>> = {
      'NPILOT-09-03': ['view', 'viewlist', 'check', 'approve', 'reject'],
      'NPILOT-09-04': ['view', 'viewlist', 'edit', 'delete', 'submit', 'attach'],
      'NPILOT-09-06': ['view', 'viewlist', 'export'],
    };

    return assignedActionMap[formId]?.includes(action) ?? false;
  }

  private async hasAssignedMnrFormAccess(
    userId: string,
    formId: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const assignedForms = await authRepository.findAssignedMnrAccessibleForms(userId);
    if (!assignedForms.includes(formId)) {
      return false;
    }

    const assignedActionMap: Partial<Record<string, PermissionAction[]>> = {
      'MNR-12-03': ['view', 'viewlist', 'check', 'approve', 'reject'],
      'MNR-12-06': ['view', 'viewlist'],
      'MNR-12-07': ['view', 'viewlist', 'issue'],
      'MNR-12-09': ['view', 'viewlist', 'edit', 'submit'],
      'MNR-12-10': ['view', 'viewlist', 'edit', 'submit', 'check', 'approve', 'reject'],
      'MNR-12-11': ['view', 'viewlist', 'edit', 'submit'],
      'MNR-12-12': ['view', 'viewlist', 'export'],
    };

    return assignedActionMap[formId]?.includes(action) ?? false;
  }

  private async hasAssignedFiveM1EFormAccess(
    userId: string,
    formId: string,
    action: PermissionAction,
  ): Promise<boolean> {
    const assignedForms = await authRepository.findAssignedFiveM1EAccessibleForms(userId);
    if (!assignedForms.includes(formId)) {
      return false;
    }

    const assignedActionMap: Partial<Record<string, PermissionAction[]>> = {
      '5M1ESupplier_Submition': ['view', 'viewlist', 'edit', 'submit', 'attach'],
      '5M1EApprovalSecDes-06-17': ['view', 'viewlist', 'edit', 'check', 'approve', 'reject'],
      '5M1EApprovalSecEnvi-06-17': ['view', 'viewlist', 'edit', 'check', 'approve', 'reject', 'attach'],
      '5M1EApprovalSecQA-06-17': ['view', 'viewlist', 'edit', 'check', 'approve', 'reject', 'attach'],
      '5M1EApprovalSecSQE-06-17': ['view', 'viewlist', 'edit', 'release', 'attach'],
      '5M1EJudgementSec-06-17': ['view', 'viewlist', 'release'],
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
    const hasAssignedAccess = this.getAssignedAccessChecker(formId);

    if (!permission) {
      return hasAssignedAccess(userId, action);
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

    return hasAssignedAccess(userId, action);
  }
}

export const permissionService = new PermissionService();
