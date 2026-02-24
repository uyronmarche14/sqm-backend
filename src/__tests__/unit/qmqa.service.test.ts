/**
 * Unit Tests for QMQA Workflow Service Layer
 * 
 * Tests service layer business logic orchestration
 * Note: These tests focus on the validateTransition logic which doesn't require database mocking
 */

import { validateTransition, WORKFLOW_TRANSITIONS } from '../../services/qmqa-workflow.service.js';

describe('QMQA Workflow Service', () => {
  describe('validateTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => validateTransition('DRAFT', 'AWAITING_APPROVAL')).not.toThrow();
      expect(() => validateTransition('AWAITING_APPROVAL', 'APPROVED')).not.toThrow();
      expect(() => validateTransition('APPROVED', 'ISSUED')).not.toThrow();
      expect(() => validateTransition('ISSUED', 'CANCELLED')).not.toThrow();
      expect(() => validateTransition('ISSUED', 'WITH_INITIAL_REPORT')).not.toThrow();
    });

    it('should reject invalid transitions', () => {
      expect(() => validateTransition('DRAFT', 'ISSUED')).toThrow('Invalid transition');
      expect(() => validateTransition('APPROVED', 'DRAFT')).toThrow('Invalid transition');
      expect(() => validateTransition('DRAFT', 'APPROVED')).toThrow('Invalid transition');
    });

    it('should reject transitions from terminal states', () => {
      expect(() => validateTransition('CLOSED', 'DRAFT')).toThrow('Cannot transition from terminal state');
      expect(() => validateTransition('CANCELLED', 'DRAFT')).toThrow('Cannot transition from terminal state');
      expect(() => validateTransition('CLOSED', 'AWAITING_APPROVAL')).toThrow('Cannot transition from terminal state');
    });

    it('should allow PLANNED → DRAFT', () => {
      expect(() => validateTransition('PLANNED', 'DRAFT')).not.toThrow();
    });

    it('should allow AWAITING_APPROVAL → REJECTED', () => {
      expect(() => validateTransition('AWAITING_APPROVAL', 'REJECTED')).not.toThrow();
    });

    it('should allow REJECTED → DRAFT (resubmit)', () => {
      expect(() => validateTransition('REJECTED', 'DRAFT')).not.toThrow();
    });

    it('should allow WITH_INITIAL_REPORT → WITH_FINAL_REPORT', () => {
      expect(() => validateTransition('WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT')).not.toThrow();
    });

    it('should allow WITH_FINAL_REPORT → RESPONSE_AWAITING_APPROVAL', () => {
      expect(() => validateTransition('WITH_FINAL_REPORT', 'RESPONSE_AWAITING_APPROVAL')).not.toThrow();
    });

    it('should allow RESPONSE_AWAITING_APPROVAL → CLOSED', () => {
      expect(() => validateTransition('RESPONSE_AWAITING_APPROVAL', 'CLOSED')).not.toThrow();
    });

    it('should allow RESPONSE_AWAITING_APPROVAL → RESPONSE_REJECTED', () => {
      expect(() => validateTransition('RESPONSE_AWAITING_APPROVAL', 'RESPONSE_REJECTED')).not.toThrow();
    });

    it('should allow RESPONSE_REJECTED → WITH_FINAL_REPORT (resubmit)', () => {
      expect(() => validateTransition('RESPONSE_REJECTED', 'WITH_FINAL_REPORT')).not.toThrow();
    });

    it('should reject transition to same status', () => {
      expect(() => validateTransition('DRAFT', 'DRAFT')).toThrow('Invalid transition');
      expect(() => validateTransition('APPROVED', 'APPROVED')).toThrow('Invalid transition');
    });

    it('should reject skipping approval steps', () => {
      expect(() => validateTransition('DRAFT', 'APPROVED')).toThrow('Invalid transition');
      expect(() => validateTransition('DRAFT', 'ISSUED')).toThrow('Invalid transition');
    });

    it('should reject backward transitions', () => {
      expect(() => validateTransition('ISSUED', 'DRAFT')).toThrow('Invalid transition');
      expect(() => validateTransition('APPROVED', 'AWAITING_APPROVAL')).toThrow('Invalid transition');
    });
  });

  describe('WORKFLOW_TRANSITIONS map', () => {
    it('should define all valid transitions for each status', () => {
      expect(WORKFLOW_TRANSITIONS.PLANNED).toEqual(['DRAFT']);
      expect(WORKFLOW_TRANSITIONS.DRAFT).toEqual(['AWAITING_APPROVAL']);
      expect(WORKFLOW_TRANSITIONS.AWAITING_APPROVAL).toEqual(['APPROVED', 'REJECTED']);
      expect(WORKFLOW_TRANSITIONS.REJECTED).toEqual(['DRAFT']);
      expect(WORKFLOW_TRANSITIONS.APPROVED).toEqual(['ISSUED']);
      expect(WORKFLOW_TRANSITIONS.ISSUED).toEqual(['CANCELLED', 'WITH_INITIAL_REPORT']);
      expect(WORKFLOW_TRANSITIONS.CANCELLED).toEqual([]);
      expect(WORKFLOW_TRANSITIONS.WITH_INITIAL_REPORT).toEqual(['WITH_FINAL_REPORT']);
      expect(WORKFLOW_TRANSITIONS.WITH_FINAL_REPORT).toEqual(['RESPONSE_AWAITING_APPROVAL']);
      expect(WORKFLOW_TRANSITIONS.RESPONSE_AWAITING_APPROVAL).toEqual(['CLOSED', 'RESPONSE_REJECTED']);
      expect(WORKFLOW_TRANSITIONS.RESPONSE_REJECTED).toEqual(['WITH_FINAL_REPORT']);
      expect(WORKFLOW_TRANSITIONS.CLOSED).toEqual([]);
    });

    it('should have terminal states with no valid transitions', () => {
      expect(WORKFLOW_TRANSITIONS.CANCELLED).toHaveLength(0);
      expect(WORKFLOW_TRANSITIONS.CLOSED).toHaveLength(0);
    });

    it('should allow rejection loops', () => {
      // Cycle 1: AWAITING_APPROVAL → REJECTED → DRAFT → AWAITING_APPROVAL
      expect(WORKFLOW_TRANSITIONS.AWAITING_APPROVAL).toContain('REJECTED');
      expect(WORKFLOW_TRANSITIONS.REJECTED).toContain('DRAFT');
      expect(WORKFLOW_TRANSITIONS.DRAFT).toContain('AWAITING_APPROVAL');

      // Cycle 2: RESPONSE_AWAITING_APPROVAL → RESPONSE_REJECTED → WITH_FINAL_REPORT → RESPONSE_AWAITING_APPROVAL
      expect(WORKFLOW_TRANSITIONS.RESPONSE_AWAITING_APPROVAL).toContain('RESPONSE_REJECTED');
      expect(WORKFLOW_TRANSITIONS.RESPONSE_REJECTED).toContain('WITH_FINAL_REPORT');
      expect(WORKFLOW_TRANSITIONS.WITH_FINAL_REPORT).toContain('RESPONSE_AWAITING_APPROVAL');
    });
  });

  describe('workflow state machine integrity', () => {
    it('should have exactly 12 statuses defined', () => {
      const statuses = Object.keys(WORKFLOW_TRANSITIONS);
      expect(statuses).toHaveLength(12);
    });

    it('should have all statuses as valid keys', () => {
      const expectedStatuses = [
        'PLANNED',
        'DRAFT',
        'AWAITING_APPROVAL',
        'REJECTED',
        'APPROVED',
        'ISSUED',
        'CANCELLED',
        'WITH_INITIAL_REPORT',
        'WITH_FINAL_REPORT',
        'RESPONSE_AWAITING_APPROVAL',
        'RESPONSE_REJECTED',
        'CLOSED'
      ];

      expectedStatuses.forEach(status => {
        expect(WORKFLOW_TRANSITIONS).toHaveProperty(status);
      });
    });

    it('should only reference valid statuses in transitions', () => {
      const validStatuses = Object.keys(WORKFLOW_TRANSITIONS);

      Object.values(WORKFLOW_TRANSITIONS).forEach(transitions => {
        transitions.forEach(targetStatus => {
          expect(validStatuses).toContain(targetStatus);
        });
      });
    });
  });
});
