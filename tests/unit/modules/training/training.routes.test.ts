import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const { checkPermissionMock, calendarMock, achievementMock } = vi.hoisted(() => ({
  checkPermissionMock: vi.fn(),
  calendarMock: vi.fn(),
  achievementMock: vi.fn(),
}));

vi.mock('../../../../src/shared/services/permission.service.js', () => ({
  permissionService: {
    checkPermission: checkPermissionMock,
  },
}));

vi.mock('../../../../src/modules/training/training.controller.js', () => ({
  trainingController: {
    list: vi.fn(),
    calendar: calendarMock,
    search: vi.fn(),
    achievement: achievementMock,
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import trainingRoutes from '../../../../src/modules/training/training.routes.js';
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

async function invokeRoute(options: { method: string; url: string; token?: string }) {
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
  const res = createResponse(() => { resolved = true; }) as unknown as Response;

  await new Promise<void>((resolve) => {
    const next: NextFunction = (error?: unknown) => {
      if (error) {
        errorHandler(error as Error, req, res, (() => undefined) as NextFunction);
      }
      resolve();
    };

    trainingRoutes.handle(req, res, next);
    setTimeout(() => {
      if (resolved) resolve();
    }, 0);
  });

  return res as unknown as MockResponse;
}

describe('Training routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  it('requires auth for calendar', async () => {
    const response = await invokeRoute({ method: 'GET', url: '/calendar' });
    expect(response.statusCode).toBe(401);
  });

  it('requires SQE-10-05 viewlist permission for calendar', async () => {
    checkPermissionMock.mockResolvedValue(false);
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });
    const response = await invokeRoute({ method: 'GET', url: '/calendar', token });
    expect(response.statusCode).toBe(403);
  });

  it('forwards allowed calendar requests to the controller', async () => {
    checkPermissionMock.mockResolvedValue(true);
    calendarMock.mockImplementation((_req: unknown, res: any) => {
      res.json({ success: true, data: [] });
    });
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });
    const response = await invokeRoute({ method: 'GET', url: '/calendar', token });
    expect(response.statusCode).toBe(200);
    expect(calendarMock).toHaveBeenCalled();
  });
});
