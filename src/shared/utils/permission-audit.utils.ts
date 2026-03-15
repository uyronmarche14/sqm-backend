/**
 * Permission Audit Logging
 * Track permission checks and admin bypasses for security auditing
 * 
 * Part of Permission System Fix - Phase 1
 */

export interface PermissionAuditLog {
  timestamp: Date;
  user_id: string;
  role_id?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  permission_type: 'admin_bypass' | 'assignment' | 'role_permission' | 'denied';
  details?: string;
}

/**
 * Log a permission check event
 * @param log - Audit log data
 */
export async function logPermissionCheck(log: PermissionAuditLog): Promise<void> {
  try {
    // For now, just console log
    // TODO: Implement database logging or send to audit service
    console.log('[PERMISSION_AUDIT]', {
      timestamp: log.timestamp.toISOString(),
      user_id: log.user_id,
      role_id: log.role_id,
      action: log.action,
      resource: `${log.resource_type}:${log.resource_id}`,
      permission_type: log.permission_type,
      details: log.details,
    });

    // Optionally store in database
    // await db.insertInto('PERMISSION_AUDIT_LOG').values(log).execute();
  } catch (error) {
    // Don't fail the operation if logging fails
    console.error('Failed to log permission check:', error);
  }
}

/**
 * Log admin bypass event
 */
export async function logAdminBypass(
  userId: string,
  roleId: string | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: string
): Promise<void> {
  await logPermissionCheck({
    timestamp: new Date(),
    user_id: userId,
    role_id: roleId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    permission_type: 'admin_bypass',
    details,
  });
}

/**
 * Log assignment-based permission grant
 */
export async function logAssignmentGrant(
  userId: string,
  roleId: string | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: string
): Promise<void> {
  await logPermissionCheck({
    timestamp: new Date(),
    user_id: userId,
    role_id: roleId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    permission_type: 'assignment',
    details,
  });
}

/**
 * Log role permission grant
 */
export async function logRolePermissionGrant(
  userId: string,
  roleId: string | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: string
): Promise<void> {
  await logPermissionCheck({
    timestamp: new Date(),
    user_id: userId,
    role_id: roleId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    permission_type: 'role_permission',
    details,
  });
}

/**
 * Log permission denial
 */
export async function logPermissionDenied(
  userId: string,
  roleId: string | undefined,
  action: string,
  resourceType: string,
  resourceId: string,
  reason: string
): Promise<void> {
  await logPermissionCheck({
    timestamp: new Date(),
    user_id: userId,
    role_id: roleId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    permission_type: 'denied',
    details: reason,
  });
}
