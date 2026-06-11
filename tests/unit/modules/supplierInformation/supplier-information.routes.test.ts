import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const { checkPermissionMock, detailMock, downloadAttachmentMock } = vi.hoisted(() => ({
  checkPermissionMock: vi.fn(),
  detailMock: vi.fn(),
  downloadAttachmentMock: vi.fn(),
}));

vi.mock('../../../../src/shared/services/permission.service.js', () => ({
  permissionService: {
    checkPermission: checkPermissionMock,
  },
}));

vi.mock('../../../../src/modules/supplierInformation/supplier-information.controller.js', () => ({
  supplierInformationController: {
    list: vi.fn(),
    listBySupplier: vi.fn(),
    search: vi.fn(),
    getById: detailMock,
    downloadAttachment: downloadAttachmentMock,
  },
}));

import supplierInformationRoutes from '../../../../src/modules/supplierInformation/supplier-information.routes.js';
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

    supplierInformationRoutes.handle(req, res, next);
    setTimeout(() => {
      if (resolved) resolve();
    }, 0);
  });

  return res as unknown as MockResponse;
}

describe('Supplier Information routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  it('requires auth for detail routes', async () => {
    const response = await invokeRoute({ method: 'GET', url: '/si-1' });
    expect(response.statusCode).toBe(401);
  });

  it('requires view permission for detail routes', async () => {
    checkPermissionMock.mockResolvedValue(false);
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });
    const response = await invokeRoute({ method: 'GET', url: '/si-1', token });
    expect(response.statusCode).toBe(403);
  });

  it('forwards allowed detail requests to the controller', async () => {
    checkPermissionMock.mockResolvedValue(true);
    detailMock.mockImplementation((_req: unknown, res: any) => {
      res.json({ success: true, data: {} });
    });
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });
    const response = await invokeRoute({ method: 'GET', url: '/si-1', token });
    expect(response.statusCode).toBe(200);
    expect(detailMock).toHaveBeenCalled();
  });
});
