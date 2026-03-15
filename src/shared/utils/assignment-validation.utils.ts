/**
 * Assignment Validation Utilities
 * Validate user assignments for form creation and updates
 * 
 * Part of Permission System Fix - Phase 1
 */

import { BadRequestError } from '../errors/AppError.js';
import { userRepository } from '../../modules/users/user.repository.js';
import { hasRolePermission } from './role-permission.utils.js';
import { isAdminRole } from './admin.utils.js';

export interface AssignmentValidationOptions {
  requireIssuer?: boolean;
  requireSupplier?: boolean;
  requireChecker?: boolean;
  requireApprover?: boolean;
  allowSupplierAsIssuer?: boolean;
}

export interface AssignmentData {
  issuer_id?: string | null;
  supplier_id?: string | null;
  checker_id?: string | null;
  approver_id?: string | null;
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
  } = options;

  // Validate issuer
  if (requireIssuer) {
    await validateIssuer(data.issuer_id, allowSupplierAsIssuer);
  }

  // Validate supplier
  if (requireSupplier) {
    await validateSupplier(data.supplier_id);
  }

  // Validate checker
  if (requireChecker) {
    await validateChecker(data.checker_id);
  } else if (data.checker_id) {
    // Optional but if provided, must be valid
    await validateChecker(data.checker_id);
  }

  // Validate approver
  if (requireApprover) {
    await validateApprover(data.approver_id);
  } else if (data.approver_id) {
    // Optional but if provided, must be valid
    await validateApprover(data.approver_id);
  }
}

/**
 * Validate issuer assignment
 * @param issuerId - The issuer user ID
 * @param allowSupplier - Whether to allow supplier users as issuers
 * @throws BadRequestError if validation fails
 */
export async function validateIssuer(
  issuerId: string | null | undefined,
  allowSupplier: boolean = false
): Promise<void> {
  if (!issuerId) {
    throw new BadRequestError('Issuer is required');
  }

  const issuer = await userRepository.findById(issuerId);
  if (!issuer) {
    throw new BadRequestError('Invalid issuer user ID');
  }

  if (!issuer.active_flag) {
    throw new BadRequestError('Issuer user is inactive');
  }

  // Check if issuer is supplier user
  if (!allowSupplier && issuer.role_id) {
    const role = await userRepository.findRoleById(issuer.role_id);
    const roleName = role?.role_name?.toUpperCase() || '';
    
    if (roleName.includes('SUPPLIER') || roleName.includes('VENDOR')) {
      throw new BadRequestError('Issuer must be an internal user, not a supplier');
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
  checkerId: string | null | undefined
): Promise<void> {
  if (!checkerId) {
    throw new BadRequestError('Checker is required');
  }

  const checker = await userRepository.findById(checkerId);
  if (!checker) {
    throw new BadRequestError('Invalid checker user ID');
  }

  if (!checker.active_flag) {
    throw new BadRequestError('Checker user is inactive');
  }

  // Check if user has check permission OR is admin
  if (checker.role_id) {
    const role = await userRepository.findRoleById(checker.role_id);
    const isAdmin = isAdminRole(role?.role_name);
    
    if (!isAdmin) {
      const hasPermission = await hasRolePermission(checker.role_id, 'check');
      if (!hasPermission) {
        throw new BadRequestError(
          'Selected checker does not have check permission. Please assign a user with checker role.'
        );
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
  approverId: string | null | undefined
): Promise<void> {
  if (!approverId) {
    throw new BadRequestError('Approver is required');
  }

  const approver = await userRepository.findById(approverId);
  if (!approver) {
    throw new BadRequestError('Invalid approver user ID');
  }

  if (!approver.active_flag) {
    throw new BadRequestError('Approver user is inactive');
  }

  // Check if user has approve permission OR is admin
  if (approver.role_id) {
    const role = await userRepository.findRoleById(approver.role_id);
    const isAdmin = isAdminRole(role?.role_name);
    
    if (!isAdmin) {
      const hasPermission = await hasRolePermission(approver.role_id, 'approve');
      if (!hasPermission) {
        throw new BadRequestError(
          'Selected approver does not have approve permission. Please assign a user with approver role.'
        );
      }
    }
  }
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
