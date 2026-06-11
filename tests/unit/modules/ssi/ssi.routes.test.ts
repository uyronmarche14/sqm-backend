import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const {
  checkPermissionMock,
  listPlansMock,
  submitMock,
  achievementMock,
} = vi.hoisted(() => ({
  checkPermissionMock: vi.fn(),
  listPlansMock: vi.fn(),
  submitMock: vi.fn(),
  achievementMock: vi.fn(),
}));

vi.mock('../../../../src/shared/services/permission.service.js', () => ({
  permissionService: {
    checkPermission: checkPermissionMock,
  },
}));

vi.mock('../../../../src/modules/ssi/ssi.controller.js', () => ({
  ssiController: {
    listPlans: listPlansMock,
    getPlanById: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    cancelPlan: vi.fn(),
    deletePlan: vi.fn(),
    createRecordFromPlan: vi.fn(),
    listRecords: vi.fn(),
    getRecordById: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
    submit: submitMock,
    check: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    issue: vi.fn(),
    cancel: vi.fn(),
    resubmit: vi.fn(),
    saveResponse: vi.fn(),
    submitResponse: vi.fn(),
    reviewResponse: vi.fn(),
    search: vi.fn(),
    achievement: achievementMock,
    reports: vi.fn(),
    calendar: vi.fn(),
    lookups: vi.fn(),
    generateArtifact: vi.fn(),
  },
}));

import ssiRoutes from '../../../../src/modules/ssi/ssi.routes.js';
import { errorHandler } from '../../../../src/shared/middleware/error-handler.js';
import { generateAccessToken } from '../../../../src/shared/utils/jwt.js';

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createResponse(onJson: () => void): MockResponse {
  return {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      onJson();
      return this;
    },
  };
}

async function invokeRoute(options: {
  method: string;
  url: string;
  token?: string;
}) {
  const req = {
    method: options.method,
    url: options.url,
    originalUrl: options.url,
    path: options.url,
    body: {},
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    cookies: {},
  } as unknown as Request;

  let resolved = false;
  const res = createResponse(() => {
    resolved = true;
  }) as unknown as Response;

  await new Promise<void>((resolve) => {
    const next: NextFunction = (error?: unknown) => {
      if (error) {
        errorHandler(error as Error, req, res, (() => undefined) as NextFunction);
      }
      resolve();
    };

    ssiRoutes.handle(req, res, next);
    setTimeout(() => {
      if (resolved) {
        resolve();
      }
    }, 0);
  });

  return res as unknown as MockResponse;
}

describe('SSI routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  it('requires auth for plan list', async () => {
    const response = await invokeRoute({ method: 'GET', url: '/plans' });
    expect(response.statusCode).toBe(401);
  });

  it('requires plan viewlist permission for plan list', async () => {
    checkPermissionMock.mockResolvedValue(false);
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({ method: 'GET', url: '/plans', token });

    expect(response.statusCode).toBe(403);
  });

  it('forwards allowed plan list requests to the controller', async () => {
    checkPermissionMock.mockResolvedValue(true);
    listPlansMock.mockImplementation((_req: unknown, res: any) => {
      res.json({ success: true, data: [] });
    });
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({ method: 'GET', url: '/plans', token });

    expect(response.statusCode).toBe(200);
    expect(listPlansMock).toHaveBeenCalled();
  });

  it('requires submit permission for SSI workflow submit', async () => {
    checkPermissionMock.mockResolvedValue(false);
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({ method: 'POST', url: '/workflow/record-1/submit', token });

    expect(response.statusCode).toBe(403);
  });

  it('dispatches SSI workflow submit when allowed', async () => {
    checkPermissionMock.mockResolvedValue(true);
    submitMock.mockImplementation((_req: unknown, res: any) => {
      res.json({ success: true, data: { id: 'record-1' } });
    });
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({ method: 'POST', url: '/workflow/record-1/submit', token });

    expect(response.statusCode).toBe(200);
    expect(submitMock).toHaveBeenCalled();
  });

  it('routes achievement through the dedicated report permission', async () => {
    checkPermissionMock.mockResolvedValue(true);
    achievementMock.mockImplementation((_req: unknown, res: any) => {
      res.json({ success: true, data: { records: [], metrics: {} } });
    });
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({ method: 'GET', url: '/reports/achievement', token });

    expect(response.statusCode).toBe(200);
    expect(achievementMock).toHaveBeenCalled();
  });
});
