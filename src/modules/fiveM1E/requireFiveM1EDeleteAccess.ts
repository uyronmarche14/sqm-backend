import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { fiveM1EWorkflowService } from './workflow/fiveM1E-workflow.service.js';

export const requireFiveM1EDeleteAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    const controlNo = String(req.params.id || '');
    const roleName =
      (req as any).user?.roleName ||
      (req as any).user?.role_name ||
      (req as any).user?.role ||
      undefined;
    const hasAccess = await fiveM1EWorkflowService.canUserDeleteRecord(
      controlNo,
      req.user.userId,
      roleName,
    );

    if (!hasAccess) {
      return next(new ForbiddenError('Access Denied: You cannot delete this 5M1E record right now.'));
    }

    next();
  } catch (error) {
    next(error);
  }
};
