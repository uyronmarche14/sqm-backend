import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const { checkPermissionMock, sendTestEmailMock } = vi.hoisted(() => ({
  checkPermissionMock: vi.fn(),
  sendTestEmailMock: vi.fn(),
}));

vi.mock('../../../../src/shared/services/permission.service.js', () => ({
  permissionService: {
    checkPermission: checkPermissionMock,
  },
}));

vi.mock('../../../../src/modules/users/user.service.js', () => ({
  userService: {
    getLookupUsers: vi.fn(),
    getAllUsers: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    sendTestEmail: sendTestEmailMock,
    updateUser: vi.fn(),
    changePassword: vi.fn(),
    getAssignmentCoverage: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

import userRoutes from '../../../../src/modules/users/user.routes.js';
import { errorHandler } from '../../../../src/shared/middleware/error-handler.js';
import { generateAccessToken } from '../../../../src/shared/utils/jwt.js';

type MockResponse = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createResponse(onJson: () => void): MockResponse {
  return {
    statusCode: 200,
    body: null,
    headers: {},
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
  body?: Record<string, unknown>;
  token?: string;
}) {
  const req = {
    method: options.method,
    url: options.url,
    originalUrl: options.url,
    path: options.url,
    body: options.body ?? {},
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

    userRoutes.handle(req, res, next);
    setTimeout(() => {
      if (resolved) {
        resolve();
      }
    }, 0);
  });

  return res as unknown as MockResponse;
}

describe('POST /api/users/test-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires auth', async () => {
    const response = await invokeRoute({
      method: 'POST',
      url: '/test-email',
      body: { email: 'user@example.com', full_name: 'Test User' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('requires add permission on the users forms', async () => {
    checkPermissionMock.mockResolvedValue(false);
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'POST',
      url: '/test-email',
      token,
      body: { email: 'user@example.com', full_name: 'Test User' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('validates the request payload', async () => {
    checkPermissionMock.mockResolvedValue(true);
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'POST',
      url: '/test-email',
      token,
      body: { email: 'bad-email', full_name: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(sendTestEmailMock).not.toHaveBeenCalled();
  });

  it('returns the controller result on success', async () => {
    checkPermissionMock.mockResolvedValue(true);
    sendTestEmailMock.mockResolvedValue({
      delivered: true,
      transport: 'smtp',
      referenceId: '<message-id@example.com>',
      subject: 'Account Confirmation',
      recipient: 'user@example.com',
      localUrl: 'http://localhost:5000/auth/login',
      internetUrl: 'http://localhost:5000/auth/login',
    });

    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });
    const response = await invokeRoute({
      method: 'POST',
      url: '/test-email',
      token,
      body: { email: 'user@example.com', full_name: 'Test User' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        delivered: true,
        transport: 'smtp',
        referenceId: '<message-id@example.com>',
        subject: 'Account Confirmation',
        recipient: 'user@example.com',
        localUrl: 'http://localhost:5000/auth/login',
        internetUrl: 'http://localhost:5000/auth/login',
      },
    });
  });
});
