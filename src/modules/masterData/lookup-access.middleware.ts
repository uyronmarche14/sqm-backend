import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/AppError.js';
import {
  permissionService,
  type PermissionAction,
  type WorkflowPermissionModule,
} from '../../shared/services/permission.service.js';

type LookupAccessOptions = {
  maintenanceFormIds: string[];
  modules?: WorkflowPermissionModule[];
  workflowActions?: readonly PermissionAction[];
};

const DEFAULT_WORKFLOW_LOOKUP_ACTIONS: readonly PermissionAction[] = [
  'viewlist',
  'view',
  'add',
  'edit',
  'submit',
  'check',
  'approve',
  'reject',
  'issue',
  'release',
  'attach',
];

async function hasMaintenanceLookupAccess(userId: string, formIds: string[]): Promise<boolean> {
  for (const formId of formIds) {
    if (await permissionService.checkPermission(userId, formId, 'viewlist')) {
      return true;
    }
  }

  return false;
}

async function hasWorkflowLookupAccess(
  userId: string,
  modules: readonly WorkflowPermissionModule[],
  workflowActions: readonly PermissionAction[],
): Promise<boolean> {
  for (const module of modules) {
    for (const action of workflowActions) {
      if (await permissionService.checkModulePermission(userId, module, action)) {
        return true;
      }
    }
  }

  return false;
}

export const requireLookupAccess = ({
  maintenanceFormIds,
  modules = [],
  workflowActions = DEFAULT_WORKFLOW_LOOKUP_ACTIONS,
}: LookupAccessOptions) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return next(new UnauthorizedError('Authentication required.'));
      }

      const userId = req.user.userId;
      if (await hasMaintenanceLookupAccess(userId, maintenanceFormIds)) {
        return next();
      }

      if (modules.length > 0 && await hasWorkflowLookupAccess(userId, modules, workflowActions)) {
        return next();
      }

      return next(new ForbiddenError('Access Denied: You do not have access to this lookup.'));
    } catch (error) {
      return next(error);
    }
  };
};
