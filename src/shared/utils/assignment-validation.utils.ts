/**
 * Assignment Validation Utilities
 * Validate user assignments for form creation and updates
 * 
 * Part of Permission System Fix - Phase 1
 */

import {
  getAssignmentRoleActions,
  getCompatibleFormCodes,
  type AssignmentRole,
} from '@sqm/permissions-contract';
import { BadRequestError } from '../errors/AppError.js';
import { userRepository } from '../../modules/users/user.repository.js';
import {
  hasAnyRolePermissionForForms,
  hasRolePermission,
  type RolePermissionAction,
} from './role-permission.utils.js';
import { isAdminRole } from './admin.utils.js';

export interface AssignmentValidationOptions {
  requireIssuer?: boolean;
  requireSupplier?: boolean;
  requireChecker?: boolean;
  requireApprover?: boolean;
  allowSupplierAsIssuer?: boolean;
  issuerFormId?: string;
  checkerFormId?: string;
  approverFormId?: string;
}

export interface AssignmentData {
  issuer_id?: string | null;
  supplier_id?: string | null;
  checker_id?: string | null;
  approver_id?: string | null;
}

export interface AssignmentActorValidationOptions {
  roleLabel?: string;
  allowSupplierAsIssuer?: boolean;
}

/**
 * Validate all user assignments for form creation/update
 * @param data - Assignment data to validate
 * @param options - Validation options
 * @throws BadRequestError if validation fails
 */
export async function validateAssignments(
  data: AssignmentData,
  options: AssignmentValidationOptions = {}
): Promise<void> {
  const {
    requireIssuer = true,
    requireSupplier = false,
    requireChecker = false,
    requireApprover = false,
    allowSupplierAsIssuer = false,
    issuerFormId,
    checkerFormId,
    approverFormId,
  } = options;

  // Validate issuer
  if (requireIssuer) {
    await validateIssuer(data.issuer_id, allowSupplierAsIssuer, issuerFormId);
  }

  // Validate supplier
  if (requireSupplier) {
    await validateSupplier(data.supplier_id);
  }

  // Validate checker
  if (requireChecker) {
    await validateChecker(data.checker_id, checkerFormId);
  } else if (data.checker_id) {
    // Optional but if provided, must be valid
    await validateChecker(data.checker_id, checkerFormId);
  }

  // Validate approver
  if (requireApprover) {
    await validateApprover(data.approver_id, approverFormId);
  } else if (data.approver_id) {
    // Optional but if provided, must be valid
    await validateApprover(data.approver_id, approverFormId);
  }
}

interface AssignmentActorRecord {
  user_id: string;
  active_flag: boolean | number | null;
  role_id: string | null;
}

function hasTruthyPermission(value: unknown): boolean {
  return value === true || value === 1;
}

function deriveAssignmentQualificationActions(
  formId: string,
  assignmentRole: AssignmentRole,
): RolePermissionAction[][] {
  const derivedActions = new Set(getAssignmentRoleActions(formId, assignmentRole));
  const groups: RolePermissionAction[][] = [];

  if (derivedActions.size === 0 || derivedActions.has('view') || derivedActions.has('viewlist')) {
    groups.push(['view', 'viewlist']);
  }

  if (derivedActions.has('check')) {
    groups.push(['check']);
  }

  if (derivedActions.has('approve') || derivedActions.has('release')) {
    groups.push(['approve']);
  }

  if (derivedActions.has('edit') || derivedActions.has('submit') || derivedActions.has('issue')) {
    groups.push(['edit', 'add']);
  }

  if (groups.length === 0) {
    groups.push(['view', 'viewlist']);
  }

  return groups;
}

function getAssignmentQualificationGroups(
  formIds: string[],
  assignmentRole: AssignmentRole,
): RolePermissionAction[][] {
  const mergedActions = new Set<RolePermissionAction>();

  for (const formId of formIds) {
    for (const group of deriveAssignmentQualificationActions(formId, assignmentRole)) {
      for (const action of group) {
        mergedActions.add(action);
      }
    }
  }

  const effectiveActions = Array.from(mergedActions);
  if (effectiveActions.length === 0) {
    return [['view', 'viewlist']];
  }

  const groups: RolePermissionAction[][] = [];

  if (effectiveActions.includes('view') || effectiveActions.includes('viewlist')) {
    groups.push(['view', 'viewlist']);
  }

  if (effectiveActions.includes('check')) {
    groups.push(['check']);
  }

  if (effectiveActions.includes('approve')) {
    groups.push(['approve']);
  }

  if (effectiveActions.includes('edit') || effectiveActions.includes('add')) {
    groups.push(['edit', 'add']);
  }

  if (groups.length === 0) {
    groups.push(['view', 'viewlist']);
  }

  return groups;
}

function normalizeAssignmentFormIds(formIds: string[]): string[] {
  return Array.from(
    new Set(
      formIds
        .filter(Boolean)
        .flatMap((formId) => getCompatibleFormCodes(formId)),
    ),
  );
}

export async function roleQualifiesForAssignment(
  roleId: string | null | undefined,
  assignmentRole: AssignmentRole,
  formIds: string[],
): Promise<boolean> {
  if (!roleId) {
    return false;
  }

  const normalizedFormIds = Array.from(new Set(formIds.filter(Boolean)));
  if (normalizedFormIds.length === 0) {
    return false;
  }

  const qualificationGroups = getAssignmentQualificationGroups(normalizedFormIds, assignmentRole);
  const compatibleFormIds = normalizeAssignmentFormIds(normalizedFormIds);

  for (const actions of qualificationGroups) {
    const allowed = await hasAnyRolePermissionForForms(roleId, actions, compatibleFormIds);
    if (!allowed) {
      return false;
    }
  }

  return true;
}

async function validateFormScopedAssignmentAccess(
  actor: AssignmentActorRecord,
  assignmentRole: AssignmentRole,
  formIds: string[],
): Promise<void> {
  if (!actor.role_id) {
    throw new BadRequestError(`Selected ${assignmentRole} does not have an assigned role.`);
  }

  const normalizedFormIds = Array.from(new Set(formIds.filter(Boolean)));
  const qualified = await roleQualifiesForAssignment(actor.role_id, assignmentRole, normalizedFormIds);
  if (qualified) {
    return;
  }

  const readableFormIds = normalizedFormIds.join(', ');
  throw new BadRequestError(
    `Selected ${assignmentRole} does not have assignment coverage for ${readableFormIds} or a compatible form.`,
  );
}

async function validateActiveAssignmentActor(
  actorId: string | null | undefined,
  roleLabel: string,
): Promise<AssignmentActorRecord> {
  if (!actorId) {
    throw new BadRequestError(`${roleLabel} is required`);
  }

  const actor = await userRepository.findById(actorId);
  if (!actor) {
    throw new BadRequestError(`Invalid ${roleLabel.toLowerCase()} user ID`);
  }

  if (!hasTruthyPermission(actor.active_flag)) {
    throw new BadRequestError(`${roleLabel} user is inactive`);
  }

  return actor;
}

/**
 * Validate issuer assignment
 * @param issuerId - The issuer user ID
 * @param allowSupplier - Whether to allow supplier users as issuers
 * @throws BadRequestError if validation fails
 */
export async function validateIssuer(
  issuerId: string | null | undefined,
  allowSupplier: boolean = false,
  formId?: string,
): Promise<void> {
  const issuer = await validateActiveAssignmentActor(issuerId, 'Issuer');

  // Check if issuer is supplier user
  if (!allowSupplier && issuer.role_id) {
    const role = await userRepository.findRoleById(issuer.role_id);
    const roleName = role?.role_name?.toUpperCase() || '';
    
    if (roleName.includes('SUPPLIER') || roleName.includes('VENDOR')) {
      throw new BadRequestError('Issuer must be an internal user, not a supplier');
    }
  }

  if (formId && issuer.role_id) {
    const role = await userRepository.findRoleById(issuer.role_id);
    if (!isAdminRole(role?.role_name)) {
      await validateFormScopedAssignmentAccess(issuer, 'issuer', [formId]);
    }
  }
}

/**
 * Validate supplier assignment
 * @param supplierId - The supplier ID
 * @throws BadRequestError if validation fails
 */
export async function validateSupplier(
  supplierId: string | null | undefined
): Promise<void> {
  if (!supplierId) {
    throw new BadRequestError('Supplier is required');
  }

  // Check it's not empty
  if (supplierId.trim().length === 0) {
    throw new BadRequestError('Supplier ID cannot be empty');
  }

  // TODO: Add supplier validation logic
  // Check if supplier exists in SUPPLIERS table
  // For now, just check it's not empty
}

/**
 * Validate checker assignment
 * @param checkerId - The checker user ID
 * @throws BadRequestError if validation fails
 */
export async function validateChecker(
  checkerId: string | null | undefined,
  formId?: string,
): Promise<void> {
  const checker = await validateActiveAssignmentActor(checkerId, 'Checker');

  // Check if user has check permission OR is admin
  if (checker.role_id) {
    const role = await userRepository.findRoleById(checker.role_id);
    const isAdmin = isAdminRole(role?.role_name);
    
    if (!isAdmin) {
      const hasPermission = formId
        ? await hasAnyRolePermissionForForms(
            checker.role_id,
            ['check'],
            getCompatibleFormCodes(formId),
          )
        : await hasRolePermission(checker.role_id, 'check');
      if (!hasPermission) {
        throw new BadRequestError(
          formId
            ? `Selected checker does not have check permission for ${formId} or a compatible form.`
            : 'Selected checker does not have check permission. Please assign a user with checker role.'
        );
      }

      if (formId) {
        await validateFormScopedAssignmentAccess(checker, 'checker', [formId]);
      }
    }
  }
}

/**
 * Validate approver assignment
 * @param approverId - The approver user ID
 * @throws BadRequestError if validation fails
 */
export async function validateApprover(
  approverId: string | null | undefined,
  formId?: string,
): Promise<void> {
  const approver = await validateActiveAssignmentActor(approverId, 'Approver');

  // Check if user has approve permission OR is admin
  if (approver.role_id) {
    const role = await userRepository.findRoleById(approver.role_id);
    const isAdmin = isAdminRole(role?.role_name);
    
    if (!isAdmin) {
      const hasPermission = formId
        ? await hasAnyRolePermissionForForms(
            approver.role_id,
            ['approve'],
            getCompatibleFormCodes(formId),
          )
        : await hasRolePermission(approver.role_id, 'approve');
      if (!hasPermission) {
        throw new BadRequestError(
          formId
            ? `Selected approver does not have approve permission for ${formId} or a compatible form.`
            : 'Selected approver does not have approve permission. Please assign a user with approver role.'
        );
      }

      if (formId) {
        await validateFormScopedAssignmentAccess(approver, 'approver', [formId]);
      }
    }
  }
}

export async function validateAssignmentActorForForms(
  actorId: string | null | undefined,
  assignmentRole: AssignmentRole,
  formIds: string[],
  options: AssignmentActorValidationOptions = {},
): Promise<void> {
  const normalizedFormIds = Array.from(new Set(formIds.filter(Boolean)));
  const roleLabel =
    options.roleLabel ||
    assignmentRole.charAt(0).toUpperCase() + assignmentRole.slice(1);

  if (assignmentRole === 'supplier') {
    await validateSupplier(actorId);
    return;
  }

  const actor = await validateActiveAssignmentActor(actorId, roleLabel);

  if (assignmentRole === 'issuer' && !options.allowSupplierAsIssuer && actor.role_id) {
    const role = await userRepository.findRoleById(actor.role_id);
    const roleName = role?.role_name?.toUpperCase() || '';
    if (roleName.includes('SUPPLIER') || roleName.includes('VENDOR')) {
      throw new BadRequestError('Issuer must be an internal user, not a supplier');
    }
  }

  if (!actor.role_id || normalizedFormIds.length === 0) {
    return;
  }

  const role = await userRepository.findRoleById(actor.role_id);
  if (isAdminRole(role?.role_name)) {
    return;
  }

  await validateFormScopedAssignmentAccess(actor, assignmentRole, normalizedFormIds);
}

/**
 * Validate assignment update (prevent clearing required fields)
 * @param existingData - Current assignment data
 * @param updateData - New assignment data
 * @param options - Validation options
 * @throws BadRequestError if trying to clear required fields
 */
export async function validateAssignmentUpdate(
  existingData: AssignmentData,
  updateData: Partial<AssignmentData>,
  options: AssignmentValidationOptions = {}
): Promise<void> {
  const {
    requireIssuer = true,
    requireSupplier = false,
  } = options;

  // Merge existing and update data
  const mergedData: AssignmentData = {
    issuer_id: updateData.issuer_id !== undefined ? updateData.issuer_id : existingData.issuer_id,
    supplier_id: updateData.supplier_id !== undefined ? updateData.supplier_id : existingData.supplier_id,
    checker_id: updateData.checker_id !== undefined ? updateData.checker_id : existingData.checker_id,
    approver_id: updateData.approver_id !== undefined ? updateData.approver_id : existingData.approver_id,
  };

  // Check if required fields are being cleared
  if (requireIssuer && !mergedData.issuer_id) {
    throw new BadRequestError('Cannot clear issuer - it is required');
  }

  if (requireSupplier && !mergedData.supplier_id) {
    throw new BadRequestError('Cannot clear supplier - it is required');
  }

  // Validate the merged data
  await validateAssignments(mergedData, {
    ...options,
    requireChecker: false, // Checker can be optional on update
    requireApprover: false, // Approver can be optional on update
  });
}
