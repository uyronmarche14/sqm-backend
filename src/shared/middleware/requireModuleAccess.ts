import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import {
  permissionService,
  type PermissionAction,
  type WorkflowPermissionModule,
} from '../services/permission.service.js';

export const requireModuleAccess = (
  module: WorkflowPermissionModule,
  action: PermissionAction = 'viewlist',
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return next(new UnauthorizedError('Authentication required.'));
      }

      const hasAccess = await permissionService.checkModulePermission(
        req.user.userId,
        module,
        action,
      );

      if (!hasAccess) {
        return next(
          new ForbiddenError(`Access Denied: You do not have '${action}' access to ${module}.`),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
