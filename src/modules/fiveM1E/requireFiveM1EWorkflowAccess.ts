import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { fiveM1EWorkflowService } from './workflow/fiveM1E-workflow.service.js';
import { type FiveM1EWorkflowAction } from './workflow/fiveM1E-workflow.constants.js';

export const requireFiveM1EWorkflowAccess = (action: FiveM1EWorkflowAction) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return next(new UnauthorizedError('Authentication required.'));
      }

      const controlNo = String(req.params.id || '');
      const hasAccess = await fiveM1EWorkflowService.canUserPerformAction(
        controlNo,
        req.user.userId,
        action,
      );

      if (!hasAccess) {
        return next(new ForbiddenError(`Access Denied: You cannot '${action}' this 5M1E record right now.`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
