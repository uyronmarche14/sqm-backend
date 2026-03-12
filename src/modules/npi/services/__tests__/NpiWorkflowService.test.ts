/**
 * NpiWorkflowService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NpiWorkflowService } from '../NpiWorkflowService';
import { NpiRepository } from '../../npi.repository';
import { NotFoundError } from '../../../../shared/errors/AppError';

// Mock repository
vi.mock('../../npi.repository');

describe('NpiWorkflowService', () => {
  let service: NpiWorkflowService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findByIdDetailed: vi.fn(),
      executeTransaction: vi.fn((callback) => callback({
        updateTable: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              execute: vi.fn()
            }))
          }))
        }))
      }))
    };

    service = new NpiWorkflowService(mockRepository);
  });

  describe('submitForApproval', () => {
    it('should submit draft record successfully', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR'
        }
      });

      const result = await service.submitForApproval('123', 'user1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('submitted');
      expect(mockRepository.executeTransaction).toHaveBeenCalled();
    });

    it('should throw error if record not found', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue(null);

      await expect(
        service.submitForApproval('123', 'user1')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if not in draft status', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'AP' // Already approved
        }
      });

      await expect(
        service.submitForApproval('123', 'user1')
      ).rejects.toThrow('Cannot submit');
    });
  });

  describe('checkRecord', () => {
    it('should check submitted record successfully', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU'
        }
      });

      const result = await service.checkRecord('123', 'checker1', 'Looks good');

      expect(result.success).toBe(true);
      expect(result.message).toContain('checked');
    });

    it('should throw error if not in submitted status', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR'
        }
      });

      await expect(
        service.checkRecord('123', 'checker1')
      ).rejects.toThrow('Cannot check');
    });
  });

  describe('approveRecord', () => {
    it('should approve checked record successfully', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'CK'
        }
      });

      const result = await service.approveRecord('123', 'approver1', 'Approved');

      expect(result.success).toBe(true);
      expect(result.message).toContain('approved');
    });

    it('should throw error if not in checked status', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'DR'
        }
      });

      await expect(
        service.approveRecord('123', 'approver1')
      ).rejects.toThrow('Cannot approve');
    });
  });

  describe('rejectRecord', () => {
    it('should reject record and return to draft', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU'
        }
      });

      const result = await service.rejectRecord('123', 'approver1', 'Needs revision');

      expect(result.success).toBe(true);
      expect(result.message).toContain('rejected');
    });

    it('should throw error if remarks not provided', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue({
        record: {
          npi_lot_id: '123',
          request_status: 'SU'
        }
      });

      await expect(
        service.rejectRecord('123', 'approver1', '')
      ).rejects.toThrow('Remarks are required');
    });

    it('should throw error if record not found', async () => {
      mockRepository.findByIdDetailed.mockResolvedValue(null);

      await expect(
        service.rejectRecord('123', 'approver1', 'Rejected')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAvailableActions', () => {
    it('should return submit action for draft status', () => {
      const actions = service.getAvailableActions('DR', 'creator');
      expect(actions).toContain('submit');
    });

    it('should return check and reject for submitted status (checker)', () => {
      const actions = service.getAvailableActions('SU', 'checker');
      expect(actions).toContain('check');
      expect(actions).toContain('reject');
    });

    it('should return approve and reject for checked status (approver)', () => {
      const actions = service.getAvailableActions('CK', 'approver');
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
    });

    it('should return empty array for approved status', () => {
      const actions = service.getAvailableActions('AP', 'approver');
      expect(actions).toEqual([]);
    });

    it('should return all actions for admin role', () => {
      const actions = service.getAvailableActions('SU', 'admin');
      expect(actions.length).toBeGreaterThan(0);
    });
  });
});
