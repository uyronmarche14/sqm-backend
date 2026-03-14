import { db } from '../infrastructure/db.js';
import { authRepository } from '../../modules/auth/auth.repository.js';
import {
  getAssignmentActions,
  getCompatibleFormCodes,
  getLegacyFormMapping,
} from '@sqm/permissions-contract';

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

type AssignedFormFetcher = (userId: string) => Promise<string[]>;

export class PermissionService {
  private getAssignedFormFetcher(formId: string): AssignedFormFetcher | null {
    const legacyForm = getLegacyFormMapping(formId);
    const moduleName = legacyForm?.module;

    switch (moduleName) {
      case 'SQM_PLAN':
        return (userId: string) => authRepository.findAssignedSqmpAccessibleForms(userId);
      case 'NEWPARTS':
        return (userId: string) => authRepository.findAssignedNpiAccessibleForms(userId);
      case 'MNR':
        return (userId: string) => authRepository.findAssignedMnrAccessibleForms(userId);
      case 'QMQA':
        return (userId: string) => authRepository.findAssignedQmqaAccessibleForms(userId);
      case 'SQPR':
        return (userId: string) => authRepository.findAssignedSqprAccessibleForms(userId);
      case '5M1E':
        return (userId: string) => authRepository.findAssignedFiveM1EAccessibleForms(userId);
      default:
        return null;
    }
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

    return getAssignmentActions(grantedFormId).includes(action);
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
