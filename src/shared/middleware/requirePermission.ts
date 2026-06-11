import { Request, Response, NextFunction } from 'express';
import { permissionService, PermissionAction } from '../services/permission.service.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

/**
 * Middleware: requirePermission
 * 
 * Verifies that the authenticated user has the required permission flag
 * for a specific Form/Module handle.
 * 
 * Usage:
 * router.post('/approve', requirePermission('MNR-12-03', 'approve'), controller.approve);
 */
export const requirePermission = (formId: string, action: PermissionAction) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        return next(new UnauthorizedError('Authentication required.'));
      }

      const hasAccess = await permissionService.checkPermission(
        req.user.userId,
        formId,
        action
      );

      if (!hasAccess) {
        return next(new ForbiddenError(`Access Denied: You do not have '${action}' permission for ${formId}.`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
