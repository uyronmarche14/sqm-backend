import { Request, Response, NextFunction } from 'express';
import { permissionService, PermissionAction } from '../services/permission.service.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

export const requireAnyPermission = (formIds: string[], action: PermissionAction) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        return next(new UnauthorizedError('Authentication required.'));
      }

      for (const formId of formIds) {
        if (await permissionService.checkPermission(req.user.userId, formId, action)) {
          return next();
        }
      }

      return next(
        new ForbiddenError(
          `Access Denied: You do not have '${action}' permission for any of ${formIds.join(', ')}.`,
        ),
      );
    } catch (error) {
      next(error);
    }
  };
};
