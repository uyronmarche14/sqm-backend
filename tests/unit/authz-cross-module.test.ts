import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/AppError.js';

// Mock permission service
vi.mock('../../shared/services/permission.service.js', () => ({
  permissionService: {
    checkPermission: vi.fn(),
  },
}));

import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import { permissionService } from '../../shared/services/permission.service.js';

const makeReq = (overrides: Record<string, unknown> = {}) => ({
  user: { userId: 'user-1', roleId: 'role-1' },
  ...overrides,
}) as any;

const makeRes = () => ({}) as any;

describe('Authorization Guards — Cross-Module Security', () => {
  let nextFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nextFn = vi.fn();
    vi.clearAllMocks();
  });

  describe('cross-module access denial', () => {
    it('rejects MNR user accessing SQPR create', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(false);
      await requirePermission('SQPR-03-01', 'add')(makeReq({ user: { userId: 'mnr-user', roleId: 'mnr-role' } }), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('rejects 5M1E user accessing NPI approve', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(false);
      await requirePermission('NPILOT-09-03', 'approve')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('positive access — same module', () => {
    it('allows MNR user to access MNR create', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(true);
      await requirePermission('MNR-12-01', 'add')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('allows SQMP user to access SQMP approve', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(true);
      await requirePermission('SQMP-09-03', 'approve')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('access control with differing actions', () => {
    it('allows view but rejects edit on same form code', async () => {
      vi.mocked(permissionService.checkPermission)
        .mockResolvedValueOnce(true)   // view allowed
        .mockResolvedValueOnce(false); // edit rejected

      await requirePermission('MNR-12-01', 'view')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith();

      nextFn = vi.fn();
      await requirePermission('MNR-12-01', 'edit')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('requireAnyPermission cross-module', () => {
    it('allows access if user has ANY of the listed form codes', async () => {
      vi.mocked(permissionService.checkPermission)
        .mockResolvedValueOnce(false) // SQMP-09-01 fails
        .mockResolvedValueOnce(true); // SQMP-09-03 passes

      await requireAnyPermission(['SQMP-09-01', 'SQMP-09-03'], 'view')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('rejects access if user has NONE of the listed form codes', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(false);
      await requireAnyPermission(['MNR-12-01', 'MNR-12-03'], 'approve')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('edge cases', () => {
    it('rejects empty form codes list', async () => {
      await requireAnyPermission([], 'view')(makeReq(), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('handles supplier role correctly', async () => {
      vi.mocked(permissionService.checkPermission).mockResolvedValue(true);
      await requirePermission('MNR-12-09', 'edit')(makeReq({ user: { userId: 'supplier-1', roleId: 'supplier' } }), makeRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith();
    });
  });
});
