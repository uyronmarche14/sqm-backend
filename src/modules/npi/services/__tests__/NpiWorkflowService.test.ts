/**
 * NpiWorkflowService Unit Tests
 * Tests the 3-layer permission system (Admin → Assignment → Role Fallback)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NpiWorkflowService } from '../NpiWorkflowService';
import { NpiRepository } from '../../npi.repository';
import { NotFoundError, ForbiddenError } from '../../../../shared/errors/AppError';

// Mock repository
vi.mock('../../npi.repository');

// Mock admin check
const mockIsAdminUser = vi.fn().mockResolvedValue(false);
vi.mock('../../../../shared/utils/admin.utils', () => ({
  isAdminUser: (...args: any[]) => mockIsAdminUser(...args),
}));

// Mock role permission check
const mockHasRolePermission = vi.fn().mockResolvedValue(false);
vi.mock('../../../../shared/utils/role-permission.utils', () => ({
  hasRolePermission: (...args: any[]) => mockHasRolePermission(...args),
}));

// Mock audit logging (no-op)
vi.mock('../../../../shared/utils/permission-audit.utils', () => ({
  logAdminBypass: vi.fn().mockResolvedValue(undefined),
  logAssignmentGrant: vi.fn().mockResolvedValue(undefined),
  logRolePermissionGrant: vi.fn().mockResolvedValue(undefined),
  logPermissionDenied: vi.fn().mockResolvedValue(undefined),
}));

describe('NpiWorkflowService', () => {
  let service: NpiWorkflowService;
  let mockRepository: any;

  const createMockTrx = () => ({
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          execute: vi.fn(),
        })),
      })),
    })),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdminUser.mockResolvedValue(false);
    mockHasRolePermission.mockResolvedValue(false);

    mockRepository = {
      findByIdDetailed: vi.fn(),
      executeTransaction: vi.fn((callback) => callback(createMockTrx())),
    };

    service = new NpiWorkflowService(mockRepository);
  });

  // ==========================================================================
  // submitForApproval
  // ==========================================================================
  describe('submitForApproval', () => {
    it('should submit draft record when user is the inspector', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR',
          inspector_id: 'user1',
          checker_id: 'checker1',
          approver_id: 'approver1',
        },
      });

      const result = await service.submitForApproval('123', 'user1', 'role1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('submitted');
      expect(mockRepository.executeTransaction).toHaveBeenCalled();
    });

    it('should throw error if record not found', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue(null);

      await expect(
        service.submitForApproval('123', 'user1', 'role1'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if not in submittable status', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'AP',
          inspector_id: 'user1',
        },
      });

      await expect(
        service.submitForApproval('123', 'user1', 'role1'),
      ).rejects.toThrow('Cannot submit');
    });

    it('should throw error if user is not the inspector (assignment lock)', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR',
          inspector_id: 'someone-else',
          checker_id: 'checker1',
          approver_id: 'approver1',
        },
      });

      await expect(
        service.submitForApproval('123', 'user1', 'role1'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if checker/approver not assigned', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR',
          inspector_id: 'user1',
          checker_id: null,
          approver_id: null,
        },
      });

      await expect(
        service.submitForApproval('123', 'user1', 'role1'),
      ).rejects.toThrow('Checker and approver must be assigned');
    });
  });

  // ==========================================================================
  // checkRecord — Assignment Lock
  // ==========================================================================
  describe('checkRecord', () => {
    it('should check record when user is the assigned checker', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: 'checker1',
        },
      });

      const result = await service.checkRecord('123', 'checker1', 'role1', 'Looks good');

      expect(result.success).toBe(true);
      expect(result.message).toContain('checked');
    });

    it('should deny check if user is NOT the assigned checker', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: 'checker1',
        },
      });

      await expect(
        service.checkRecord('123', 'wrong-user', 'role1'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if not in checker status', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR',
          checker_id: 'checker1',
        },
      });

      await expect(
        service.checkRecord('123', 'checker1', 'role1'),
      ).rejects.toThrow('Cannot check');
    });
  });

  // ==========================================================================
  // checkRecord — Admin Bypass
  // ==========================================================================
  describe('checkRecord (Admin Bypass)', () => {
    it('should allow admin to check regardless of assignment', async () => {
      mockIsAdminUser.mockResolvedValueOnce(true);

      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: 'someone-else',
        },
      });

      const result = await service.checkRecord('123', 'admin-user', 'admin-role');

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // checkRecord — Role Fallback
  // ==========================================================================
  describe('checkRecord (Role Fallback)', () => {
    it('should allow user with role permission when no checker is assigned', async () => {
      mockHasRolePermission.mockResolvedValueOnce(true);

      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: null, // No one assigned
        },
      });

      const result = await service.checkRecord('123', 'role-user', 'role-with-check');

      expect(result.success).toBe(true);
    });

    it('should deny user without role permission when no checker is assigned', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: null, // No one assigned
        },
      });

      await expect(
        service.checkRecord('123', 'random-user', 'role-without-check'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ==========================================================================
  // approveRecord
  // ==========================================================================
  describe('approveRecord', () => {
    it('should approve record when user is the assigned approver', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'CK',
          approver_id: 'approver1',
        },
      });

      const result = await service.approveRecord('123', 'approver1', 'role1', 'Approved');

      expect(result.success).toBe(true);
      expect(result.message).toContain('approved');
    });

    it('should deny approval if user is NOT the assigned approver', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'CK',
          approver_id: 'approver1',
        },
      });

      await expect(
        service.approveRecord('123', 'wrong-user', 'role1'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if not in approver status', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR',
          approver_id: 'approver1',
        },
      });

      await expect(
        service.approveRecord('123', 'approver1', 'role1'),
      ).rejects.toThrow('Cannot approve');
    });
  });

  // ==========================================================================
  // rejectRecord
  // ==========================================================================
  describe('rejectRecord', () => {
    it('should reject record at checker stage', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: 'checker1',
        },
      });

      const result = await service.rejectRecord('123', 'checker1', 'role1', 'Needs revision');

      expect(result.success).toBe(true);
      expect(result.message).toContain('rejected');
    });

    it('should reject record at approver stage', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'CK',
          approver_id: 'approver1',
        },
      });

      const result = await service.rejectRecord('123', 'approver1', 'role1', 'Not acceptable');

      expect(result.success).toBe(true);
      expect(result.message).toContain('rejected');
    });

    it('should throw error if remarks not provided', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: 'checker1',
        },
      });

      await expect(
        service.rejectRecord('123', 'checker1', 'role1', ''),
      ).rejects.toThrow('Remarks are required');
    });

    it('should throw error if record not found', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue(null);

      await expect(
        service.rejectRecord('123', 'approver1', 'role1', 'Rejected'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should deny rejection by non-assigned user', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU',
          checker_id: 'checker1',
        },
      });

      await expect(
        service.rejectRecord('123', 'wrong-user', 'role1', 'Rejected'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ==========================================================================
  // getAvailableActions
  // ==========================================================================
  describe('getAvailableActions', () => {
    it('should return submit action for draft status (inspector)', () => {
      const actions = service.getAvailableActions('DR', 'creator', null, { inspector_id: 'creator' });
      expect(actions).toContain('submit');
    });

    it('should return check and reject for submitted status (checker)', () => {
      const actions = service.getAvailableActions('SU', 'checker', null, { checker_id: 'checker' });
      expect(actions).toContain('check');
      expect(actions).toContain('reject');
    });

    it('should return approve and reject for checked status (approver)', () => {
      const actions = service.getAvailableActions('CK', 'approver', null, { approver_id: 'approver' });
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
    });

    it('should return empty array for approved status', () => {
      const actions = service.getAvailableActions('AP', 'approver');
      expect(actions).toEqual([]);
    });

    it('should return actions for admin role', () => {
      const actions = service.getAvailableActions('SU', 'admin', 'ADMIN', { checker_id: 'admin' });
      expect(actions.length).toBeGreaterThan(0);
    });
  });
});
