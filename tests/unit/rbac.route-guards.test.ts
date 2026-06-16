import type { Router } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const permissionServiceMock = vi.hoisted(() => ({
  checkPermission: vi.fn(),
}));

const userControllerMock = vi.hoisted(() => ({
  getLookupUsers: vi.fn(),
  getAssignmentLookupUsers: vi.fn(),
  testEmail: vi.fn(),
  getAssignmentCoverage: vi.fn(),
  getAllUsers: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  changePassword: vi.fn(),
}));

const fiveM1EControllerMock = vi.hoisted(() => ({
  getAllApplications: vi.fn(),
  createApplication: vi.fn(),
  getApplication: vi.fn(),
  updateApplication: vi.fn(),
  deleteApplication: vi.fn(),
  submitApplication: vi.fn(),
  checkApplication: vi.fn(),
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  releaseApplication: vi.fn(),
  downloadAttachment: vi.fn(),
}));

vi.mock('../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
}));

vi.mock('../../src/shared/middleware/requireAuth.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/modules/users/user.controller.js', () => ({
  userController: userControllerMock,
}));

vi.mock('../../src/modules/fiveM1E/fiveM1E.controller.js', () => ({
  fiveM1EController: fiveM1EControllerMock,
}));

vi.mock('../../src/modules/fiveM1E/requireFiveM1EWorkflowAccess.js', () => ({
  requireFiveM1EWorkflowAccess: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/modules/fiveM1E/requireFiveM1EEditAccess.js', () => ({
  requireFiveM1EEditAccess: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/modules/fiveM1E/requireFiveM1EDeleteAccess.js', () => ({
  requireFiveM1EDeleteAccess: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/shared/middleware/requireModuleAccess.js', () => ({
  requireModuleAccess: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/shared/middleware/validate.js', () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../src/middleware/upload.middleware.js', () => ({
  createModuleUpload: () => ({
    any: () => (_req: any, _res: any, next: any) => next(),
  }),
  logUploads: (_req: any, _res: any, next: any) => next(),
  handleUploadError: (_req: any, _res: any, next: any) => next(),
}));

import userRouter from '../../src/modules/users/user.routes.js';
import fiveM1ERouter from '../../src/modules/fiveM1E/fiveM1E.routes.js';

function findRouteMiddleware(
  router: Router,
  path: string,
  method: 'post' | 'delete',
  middlewareIndex = 0,
) {
  const routeLayer = router.stack.find(
    (layer: any) => layer.route?.path === path && layer.route?.methods?.[method],
  );

  if (!routeLayer?.route?.stack?.[middlewareIndex]?.handle) {
    throw new Error(`Unable to resolve ${method.toUpperCase()} ${path} middleware #${middlewareIndex}`);
  }

  return routeLayer.route.stack[middlewareIndex].handle as (
    req: any,
    res: any,
    next: (error?: any) => void,
  ) => unknown;
}

async function invokeMiddleware(
  middleware: (req: any, res: any, next: (error?: any) => void) => unknown,
  req: Record<string, unknown> = {},
) {
  return await new Promise<any>((resolve) => {
    middleware(
      {
        user: { userId: 'user-1' },
        params: {},
        body: {},
        ...req,
      },
      {},
      (error?: any) => resolve(error),
    );
  });
}

describe('RBAC route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionServiceMock.checkPermission.mockResolvedValue(false);
  });

  it('requires viewlist permission for assignment coverage preview', async () => {
    const middleware = findRouteMiddleware(
      userRouter,
      '/:id/assignment-coverage-preview',
      'post',
      0,
    );

    const error = await invokeMiddleware(middleware, {
      params: { id: 'user-2' },
    });

    expect(error?.statusCode).toBe(403);
    expect(permissionServiceMock.checkPermission).toHaveBeenCalledWith('user-1', 'USERS-06-01', 'viewlist');
    expect(permissionServiceMock.checkPermission).toHaveBeenCalledWith('user-1', 'USERS-06-02', 'viewlist');
    expect(permissionServiceMock.checkPermission).toHaveBeenCalledWith('user-1', 'USERS-06-03', 'viewlist');
  });

  it('authorizes 5M1E delete through canonical 5M1E form codes instead of a bare module id', async () => {
    const middleware = findRouteMiddleware(fiveM1ERouter, '/:id', 'delete', 0);
    permissionServiceMock.checkPermission
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const error = await invokeMiddleware(middleware, {
      params: { id: 'record-1' },
    });

    expect(error).toBeUndefined();
    expect(permissionServiceMock.checkPermission).toHaveBeenNthCalledWith(1, 'user-1', '5M1EMAIN-11-01', 'delete');
    expect(permissionServiceMock.checkPermission).toHaveBeenNthCalledWith(2, 'user-1', '5M1ESupplier_Submition', 'delete');
    expect(permissionServiceMock.checkPermission).toHaveBeenNthCalledWith(3, 'user-1', '5M1ERAR-06-17', 'delete');
    expect(permissionServiceMock.checkPermission).not.toHaveBeenCalledWith('user-1', '5M1E', 'delete');
  });
});
