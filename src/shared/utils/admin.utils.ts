/**
 * Admin Utility Functions
 * Centralized admin role checking for permission bypass
 * 
 * Part of Permission System Fix - Phase 1
 */

import { userRepository } from '../../modules/users/user.repository.js';

/**
 * Check if a role name indicates admin privileges
 * @param roleName - The role name to check (case-insensitive)
 * @returns true if the normalized role contains ADMIN
 */
export function isAdminRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const upperRole = roleName.toUpperCase().trim();
  return upperRole.includes('ADMIN');
}

/**
 * Check if a user (by role ID) has admin privileges
 * Requires database lookup to get role name
 * @param roleId - The user's role ID
 * @returns Promise<boolean> - true if user has admin role
 */
export async function isAdminUser(roleId: string | undefined): Promise<boolean> {
  if (!roleId) return false;
  
  try {
    const roleObj = await userRepository.findRoleById(roleId);
    return isAdminRole(roleObj?.role_name);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if a user object has admin privileges
 * @param user - User object with role information
 * @returns boolean - true if user has admin role
 */
export function isAdminUserObject(user: { role?: string | null } | null | undefined): boolean {
  if (!user?.role) return false;
  return isAdminRole(user.role);
}
