/**
 * Role Permission Utilities
 * Check role-based permissions from ROLE_ACCESS table
 * 
 * Part of Permission System Fix - Phase 1
 */

import { db } from '../infrastructure/db.js';

export type RolePermissionAction =
  | 'approve'
  | 'check'
  | 'edit'
  | 'view'
  | 'viewlist'
  | 'add'
  | 'delete'
  | 'print'
  | 'export'
  | 'attach';

export interface RolePermissionCheck {
  canApprove: boolean;
  canCheck: boolean;
  canEdit: boolean;
  canView: boolean;
  canViewList: boolean;
  canAdd: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  canAttach: boolean;
}

/**
 * Get all permissions for a role
 * @param roleId - The role ID to check
 * @param formId - Optional form ID to filter permissions
 * @returns Promise<RolePermissionCheck> - Aggregated permissions
 */
export async function getRolePermissions(
  roleId: string,
  formId?: string
): Promise<RolePermissionCheck> {
  if (!roleId) {
    return {
      canApprove: false,
      canCheck: false,
      canEdit: false,
      canView: false,
      canViewList: false,
      canAdd: false,
      canDelete: false,
      canPrint: false,
      canExport: false,
      canAttach: false,
    };
  }

  try {
    let query = db
      .selectFrom('ROLE_ACCESS')
      .selectAll()
      .where('role_id', '=', roleId)
      .where('active_flag', '=', 1);

    // Filter by form if specified
    if (formId) {
      query = query.where('form_id', '=', formId);
    }

    const records = await query.execute();

    // Aggregate permissions (any record grants permission)
    return {
      canApprove: records.some(r => r.can_approve === 1 || r.can_approve === true),
      canCheck: records.some(r => r.can_check === 1 || r.can_check === true),
      canEdit: records.some(r => r.can_edit === 1 || r.can_edit === true),
      canView: records.some(r => r.can_view === 1 || r.can_view === true),
      canViewList: records.some(r => r.can_viewlist === 1 || r.can_viewlist === true),
      canAdd: records.some(r => r.can_add === 1 || r.can_add === true),
      canDelete: records.some(r => r.can_delete === 1 || r.can_delete === true),
      canPrint: records.some(r => r.can_print === 1 || r.can_print === true),
      canExport: records.some(r => r.can_export === 1 || r.can_export === true),
      canAttach: records.some(r => r.can_attach === 1 || r.can_attach === true),
    };
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return {
      canApprove: false,
      canCheck: false,
      canEdit: false,
      canView: false,
      canViewList: false,
      canAdd: false,
      canDelete: false,
      canPrint: false,
      canExport: false,
      canAttach: false,
    };
  }
}

/**
 * Check if role has specific action permission
 * @param roleId - The role ID to check
 * @param action - The action to check
 * @param formId - Optional form ID to filter permissions
 * @returns Promise<boolean> - true if role has permission
 */
export async function hasRolePermission(
  roleId: string | undefined,
  action: RolePermissionAction,
  formId?: string
): Promise<boolean> {
  if (!roleId) return false;

  const permissions = await getRolePermissions(roleId, formId);

  switch (action) {
    case 'approve':
      return permissions.canApprove;
    case 'check':
      return permissions.canCheck;
    case 'edit':
      return permissions.canEdit;
    case 'view':
      return permissions.canView;
    case 'viewlist':
      return permissions.canViewList;
    case 'add':
      return permissions.canAdd;
    case 'delete':
      return permissions.canDelete;
    case 'print':
      return permissions.canPrint;
    case 'export':
      return permissions.canExport;
    case 'attach':
      return permissions.canAttach;
    default:
      return false;
  }
}

/**
 * Check if role has any of the specified permissions
 * @param roleId - The role ID to check
 * @param actions - Array of actions to check
 * @param formId - Optional form ID to filter permissions
 * @returns Promise<boolean> - true if role has any of the permissions
 */
export async function hasAnyRolePermission(
  roleId: string | undefined,
  actions: RolePermissionAction[],
  formId?: string
): Promise<boolean> {
  if (!roleId || actions.length === 0) return false;

  const permissions = await getRolePermissions(roleId, formId);

  return actions.some(action => {
    switch (action) {
      case 'approve':
        return permissions.canApprove;
      case 'check':
        return permissions.canCheck;
      case 'edit':
        return permissions.canEdit;
      case 'view':
        return permissions.canView;
      case 'viewlist':
        return permissions.canViewList;
      case 'add':
        return permissions.canAdd;
      case 'delete':
        return permissions.canDelete;
      default:
        return false;
    }
  });
}

export async function hasRolePermissionForForms(
  roleId: string | undefined,
  action: RolePermissionAction,
  formIds: string[],
): Promise<boolean> {
  if (!roleId || formIds.length === 0) {
    return false;
  }

  const targets = Array.from(new Set(formIds.filter(Boolean)));
  for (const formId of targets) {
    if (await hasRolePermission(roleId, action, formId)) {
      return true;
    }
  }

  return false;
}

export async function hasAnyRolePermissionForForms(
  roleId: string | undefined,
  actions: RolePermissionAction[],
  formIds: string[],
): Promise<boolean> {
  if (!roleId || actions.length === 0 || formIds.length === 0) {
    return false;
  }

  const targets = Array.from(new Set(formIds.filter(Boolean)));
  for (const formId of targets) {
    if (await hasAnyRolePermission(roleId, actions, formId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get form IDs that a role has access to
 * @param roleId - The role ID to check
 * @param action - Optional action to filter by
 * @returns Promise<string[]> - Array of form IDs
 */
export async function getRoleFormAccess(
  roleId: string,
  action?: 'approve' | 'check' | 'edit' | 'view'
): Promise<string[]> {
  if (!roleId) return [];

  try {
    let query = db
      .selectFrom('ROLE_ACCESS')
      .select('form_id')
      .where('role_id', '=', roleId)
      .where('active_flag', '=', 1);

    // Filter by action if specified
    if (action) {
      switch (action) {
        case 'approve':
          query = query.where('can_approve', '=', 1);
          break;
        case 'check':
          query = query.where('can_check', '=', 1);
          break;
        case 'edit':
          query = query.where('can_edit', '=', 1);
          break;
        case 'view':
          query = query.where('can_view', '=', 1);
          break;
      }
    }

    const records = await query.execute();
    return records.map(r => r.form_id).filter(Boolean) as string[];
  } catch (error) {
    console.error('Error fetching role form access:', error);
    return [];
  }
}
