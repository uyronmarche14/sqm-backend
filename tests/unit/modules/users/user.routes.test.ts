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
    getAssignmentLookupUsers: vi.fn(),
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

import { userService } from '../../../../src/modules/users/user.service.js';
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
  const parsedUrl = new URL(`http://localhost${options.url}`);
  const query: Record<string, string> = {};
  parsedUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const req = {
    method: options.method,
    url: options.url,
    originalUrl: options.url,
    path: parsedUrl.pathname,
    query,
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
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
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

describe('GET /api/users/assignment-lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  it('requires auth', async () => {
    const response = await invokeRoute({
      method: 'GET',
      url: '/assignment-lookup',
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects request without formId', async () => {
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'GET',
      url: '/assignment-lookup?assignmentRole=approver',
      token,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects request without assignmentRole', async () => {
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'GET',
      url: '/assignment-lookup?formId=5M1EApprovalSecDes-06-17',
      token,
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects invalid assignmentRole value', async () => {
    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'GET',
      url: '/assignment-lookup?formId=5M1EApprovalSecDes-06-17&assignmentRole=invalid',
      token,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns eligible users for a valid formId and assignmentRole', async () => {
    const mockUsers = [
      { user_id: 'user-1', full_name: 'Alice', site_id: 'site-1', active_flag: 1 },
      { user_id: 'user-2', full_name: 'Bob', site_id: 'site-1', active_flag: 1 },
    ];
    (userService.getAssignmentLookupUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsers);

    const token = generateAccessToken({ userId: 'user-1', roleId: 'role-1' });

    const response = await invokeRoute({
      method: 'GET',
      url: '/assignment-lookup?formId=5M1EApprovalSecDes-06-17&assignmentRole=approver',
      token,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockUsers);
    expect(userService.getAssignmentLookupUsers).toHaveBeenCalledWith(
      'user-1',
      undefined,
      '5M1EApprovalSecDes-06-17',
      'approver',
    );
  });
});
