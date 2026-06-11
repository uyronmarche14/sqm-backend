import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requirePermission } from '../requirePermission.js';
import { requireAnyPermission } from '../requireAnyPermission.js';
import { ForbiddenError, UnauthorizedError } from '../../errors/AppError.js';

// Mock permission service
vi.mock('../../services/permission.service.js', () => ({
  permissionService: {
    checkPermission: vi.fn(),
  },
}));

import { permissionService } from '../../services/permission.service.js';

const mockRequest = (overrides: Record<string, unknown> = {}): Partial<Request> => ({
  user: { userId: 'user-1', roleId: 'role-1' },
  ...overrides,
});

const mockResponse = (): Partial<Response> => ({});

describe('requirePermission middleware', () => {
  let nextFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nextFn = vi.fn();
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('returns UnauthorizedError when no user on request', async () => {
      const req = mockRequest({ user: undefined }) as Request;
      const res = mockResponse() as Response;

      await requirePermission('MNR-12-01', 'add')(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('returns UnauthorizedError when userId is missing', async () => {
      const req = mockRequest({ user: { userId: undefined } }) as Request;
      const res = mockResponse() as Response;

      await requirePermission('MNR-12-01', 'add')(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('authorization', () => {
    it('calls next() when user has permission', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(true);
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await requirePermission('MNR-12-01', 'add')(req, res, nextFn);

      expect(permissionService.checkPermission).toHaveBeenCalledWith('user-1', 'MNR-12-01', 'add');
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('returns ForbiddenError when user lacks permission', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(false);
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await requirePermission('MNR-12-03', 'approve')(req, res, nextFn);

      expect(permissionService.checkPermission).toHaveBeenCalledWith('user-1', 'MNR-12-03', 'approve');
      expect(nextFn).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('uses the exact formId and action passed', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(true);
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await requirePermission('SQMP-09-07', 'check')(req, res, nextFn);

      expect(permissionService.checkPermission).toHaveBeenCalledWith('user-1', 'SQMP-09-07', 'check');
    });
  });

  describe('error handling', () => {
    it('passes service exceptions to next', async () => {
      const error = new Error('Service unavailable');
      vi.mocked(permissionService.checkPermission).mockRejectedValue(error);
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await requirePermission('MNR-12-01', 'add')(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledWith(error);
    });
  });
});

describe('requireAnyPermission middleware', () => {
  let nextFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nextFn = vi.fn();
    vi.clearAllMocks();
  });

  it('returns UnauthorizedError when no user', async () => {
    const req = mockRequest({ user: undefined }) as Request;
    const res = mockResponse() as Response;

    await requireAnyPermission(['MNR-12-01'], 'view')(req, res, nextFn);
    expect(nextFn).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next() when user has any of the form permissions', async () => {
    vi.mocked(permissionService.checkPermission)
      .mockResolvedValueOnce(false) // MNR-12-01 fails
      .mockResolvedValueOnce(true);  // MNR-12-03 passes

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    await requireAnyPermission(['MNR-12-01', 'MNR-12-03'], 'view')(req, res, nextFn);

    expect(nextFn).toHaveBeenCalledWith();
  });

  it('returns ForbiddenError when user lacks all form permissions', async () => {
    vi.mocked(permissionService.checkPermission).mockResolvedValue(false);

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    await requireAnyPermission(['MNR-12-01', 'MNR-12-03'], 'view')(req, res, nextFn);

    expect(nextFn).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('works with a single form ID', async () => {
    vi.mocked(permissionService.checkPermission).mockResolvedValueOnce(true);

    const req = mockRequest() as Request;
    const res = mockResponse() as Response;

    await requireAnyPermission(['SQMP-09-01'], 'add')(req, res, nextFn);
    expect(nextFn).toHaveBeenCalledWith();
  });
});
