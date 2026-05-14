import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const { checkPermissionMock, searchMock } = vi.hoisted(() => ({
  checkPermissionMock: vi.fn(),
  searchMock: vi.fn(),
}));

vi.mock('../../../../src/shared/services/permission.service.js', () => ({
  permissionService: {
    checkPermission: checkPermissionMock,
  },
}));

vi.mock('../../../../src/modules/spcTrend/spc-trend.controller.js', () => ({
  spcTrendController: {
    list: vi.fn(),
    search: searchMock,
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    submit: vi.fn(),
    check: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    issue: vi.fn(),
    downloadAttachment: vi.fn(),
  },
}));

import spcTrendRoutes from '../../../../src/modules/spcTrend/spc-trend.routes.js';
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

    spcTrendRoutes.handle(req, res, next);
    setTimeout(() => {
      if (resolved) {
        resolve();
      }
    }, 0);
  });

  return res as unknown as MockResponse;
}

describe('GET /api/spc-trend/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  it('requires auth', async () => {
    const response = await invokeRoute({
      method: 'GET',
      url: '/search',
    });

    expect(response.statusCode).toBe(401);
  });

  it('requires SPC-05-04 viewlist permission', async () => {
    checkPermissionMock.mockResolvedValue(false);
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'GET',
      url: '/search',
      token,
    });

    expect(response.statusCode).toBe(403);
  });

  it('forwards allowed requests to the search controller', async () => {
    checkPermissionMock.mockResolvedValue(true);
    searchMock.mockImplementation((_req: unknown, res: any) => {
      res.json({ success: true, data: [] });
    });
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'GET',
      url: '/search',
      token,
    });

    expect(response.statusCode).toBe(200);
    expect(searchMock).toHaveBeenCalled();
  });
});
