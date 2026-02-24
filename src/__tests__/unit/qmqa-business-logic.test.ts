/**
 * Unit Tests for QMQA Business Logic Utilities
 * 
 * Tests specific functionality with concrete examples and edge cases
 */

import {
  generateControlNo,
  hasSchedulePrefix,
  validateControlNo,
  convertRatingToPercentage,
  parsePercentageToNumber,
  isValidTransition,
  type QMQAStatus
} from '../../utils/qmqa-business-logic.js';

describe('QMQA Business Logic Utilities', () => {
  describe('generateControlNo', () => {
    it('should generate P-prefix for schedule creation', () => {
      expect(generateControlNo(2026, 1, true)).toBe('P-2026-001');
      expect(generateControlNo(2026, 42, true)).toBe('P-2026-042');
      expect(generateControlNo(2026, 999, true)).toBe('P-2026-999');
    });
    
    it('should generate no prefix for direct creation', () => {
      expect(generateControlNo(2026, 1, false)).toBe('2026-001');
      expect(generateControlNo(2026, 42, false)).toBe('2026-042');
      expect(generateControlNo(2026, 999, false)).toBe('2026-999');
    });
    
    it('should pad sequence with zeros', () => {
      expect(generateControlNo(2026, 1, true)).toBe('P-2026-001');
      expect(generateControlNo(2026, 5, true)).toBe('P-2026-005');
      expect(generateControlNo(2026, 10, true)).toBe('P-2026-010');
      expect(generateControlNo(2026, 100, true)).toBe('P-2026-100');
    });
    
    it('should handle different years', () => {
      expect(generateControlNo(2020, 1, true)).toBe('P-2020-001');
      expect(generateControlNo(2025, 1, true)).toBe('P-2025-001');
      expect(generateControlNo(2030, 1, true)).toBe('P-2030-001');
    });
    
    it('should handle boundary sequence values', () => {
      expect(generateControlNo(2026, 1, true)).toBe('P-2026-001');
      expect(generateControlNo(2026, 999, true)).toBe('P-2026-999');
    });
  });

  describe('hasSchedulePrefix', () => {
    it('should return true for schedule format', () => {
      expect(hasSchedulePrefix('P-2026-001')).toBe(true);
      expect(hasSchedulePrefix('P-2025-042')).toBe(true);
      expect(hasSchedulePrefix('P-2030-999')).toBe(true);
    });
    
    it('should return false for direct format', () => {
      expect(hasSchedulePrefix('2026-001')).toBe(false);
      expect(hasSchedulePrefix('2025-042')).toBe(false);
      expect(hasSchedulePrefix('2030-999')).toBe(false);
    });
    
    it('should return false for strings without P- prefix', () => {
      expect(hasSchedulePrefix('invalid')).toBe(false);
      expect(hasSchedulePrefix('2026-1')).toBe(false);
      expect(hasSchedulePrefix('')).toBe(false);
    });
    
    it('should return true for any string starting with P- (does not validate format)', () => {
      // hasSchedulePrefix only checks prefix, not full format validation
      expect(hasSchedulePrefix('P-26-001')).toBe(true);
      expect(hasSchedulePrefix('P-invalid')).toBe(true);
    });
  });

  describe('validateControlNo', () => {
    it('should accept valid schedule format', () => {
      expect(validateControlNo('P-2026-001')).toBe(true);
      expect(validateControlNo('P-2025-042')).toBe(true);
      expect(validateControlNo('P-2030-999')).toBe(true);
    });
    
    it('should accept valid direct format', () => {
      expect(validateControlNo('2026-001')).toBe(true);
      expect(validateControlNo('2025-042')).toBe(true);
      expect(validateControlNo('2030-999')).toBe(true);
    });
    
    it('should reject invalid formats', () => {
      // Sequence not padded
      expect(validateControlNo('2026-1')).toBe(false);
      expect(validateControlNo('P-2026-1')).toBe(false);
      
      // Year not 4 digits
      expect(validateControlNo('P-26-001')).toBe(false);
      expect(validateControlNo('26-001')).toBe(false);
      
      // Invalid format
      expect(validateControlNo('invalid')).toBe(false);
      expect(validateControlNo('P2026001')).toBe(false);
      expect(validateControlNo('P-2026-0001')).toBe(false);
      
      // Empty string
      expect(validateControlNo('')).toBe(false);
    });
    
    it('should reject control numbers with extra characters', () => {
      expect(validateControlNo('P-2026-001-extra')).toBe(false);
      expect(validateControlNo('X-P-2026-001')).toBe(false);
      expect(validateControlNo('P-2026-001 ')).toBe(false);
    });
  });

  describe('convertRatingToPercentage', () => {
    it('should convert rating to percentage string', () => {
      expect(convertRatingToPercentage(85)).toBe('85%');
      expect(convertRatingToPercentage(100)).toBe('100%');
      expect(convertRatingToPercentage(0)).toBe('0%');
      expect(convertRatingToPercentage(50)).toBe('50%');
    });
    
    it('should handle boundary values', () => {
      expect(convertRatingToPercentage(0)).toBe('0%');
      expect(convertRatingToPercentage(100)).toBe('100%');
    });
  });

  describe('parsePercentageToNumber', () => {
    it('should parse percentage string to number', () => {
      expect(parsePercentageToNumber('85%')).toBe(85);
      expect(parsePercentageToNumber('100%')).toBe(100);
      expect(parsePercentageToNumber('0%')).toBe(0);
      expect(parsePercentageToNumber('50%')).toBe(50);
    });
    
    it('should handle boundary values', () => {
      expect(parsePercentageToNumber('0%')).toBe(0);
      expect(parsePercentageToNumber('100%')).toBe(100);
    });
    
    it('should return NaN for invalid input', () => {
      expect(parsePercentageToNumber('invalid')).toBeNaN();
      expect(parsePercentageToNumber('')).toBeNaN();
    });
  });

  describe('isValidTransition', () => {
    describe('valid transitions', () => {
      it('should allow PLANNED → DRAFT', () => {
        expect(isValidTransition('PLANNED', 'DRAFT')).toBe(true);
      });
      
      it('should allow DRAFT → AWAITING_APPROVAL', () => {
        expect(isValidTransition('DRAFT', 'AWAITING_APPROVAL')).toBe(true);
      });
      
      it('should allow AWAITING_APPROVAL → APPROVED', () => {
        expect(isValidTransition('AWAITING_APPROVAL', 'APPROVED')).toBe(true);
      });
      
      it('should allow AWAITING_APPROVAL → REJECTED', () => {
        expect(isValidTransition('AWAITING_APPROVAL', 'REJECTED')).toBe(true);
      });
      
      it('should allow REJECTED → DRAFT (resubmit)', () => {
        expect(isValidTransition('REJECTED', 'DRAFT')).toBe(true);
      });
      
      it('should allow APPROVED → ISSUED', () => {
        expect(isValidTransition('APPROVED', 'ISSUED')).toBe(true);
      });
      
      it('should allow ISSUED → CANCELLED', () => {
        expect(isValidTransition('ISSUED', 'CANCELLED')).toBe(true);
      });
      
      it('should allow ISSUED → WITH_INITIAL_REPORT', () => {
        expect(isValidTransition('ISSUED', 'WITH_INITIAL_REPORT')).toBe(true);
      });
      
      it('should allow WITH_INITIAL_REPORT → WITH_FINAL_REPORT', () => {
        expect(isValidTransition('WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT')).toBe(true);
      });
      
      it('should allow WITH_FINAL_REPORT → RESPONSE_AWAITING_APPROVAL', () => {
        expect(isValidTransition('WITH_FINAL_REPORT', 'RESPONSE_AWAITING_APPROVAL')).toBe(true);
      });
      
      it('should allow RESPONSE_AWAITING_APPROVAL → CLOSED', () => {
        expect(isValidTransition('RESPONSE_AWAITING_APPROVAL', 'CLOSED')).toBe(true);
      });
      
      it('should allow RESPONSE_AWAITING_APPROVAL → RESPONSE_REJECTED', () => {
        expect(isValidTransition('RESPONSE_AWAITING_APPROVAL', 'RESPONSE_REJECTED')).toBe(true);
      });
      
      it('should allow RESPONSE_REJECTED → WITH_FINAL_REPORT (resubmit)', () => {
        expect(isValidTransition('RESPONSE_REJECTED', 'WITH_FINAL_REPORT')).toBe(true);
      });
    });

    describe('invalid transitions', () => {
      it('should reject DRAFT → ISSUED (skipping approval)', () => {
        expect(isValidTransition('DRAFT', 'ISSUED')).toBe(false);
      });
      
      it('should reject DRAFT → APPROVED (skipping awaiting approval)', () => {
        expect(isValidTransition('DRAFT', 'APPROVED')).toBe(false);
      });
      
      it('should reject APPROVED → DRAFT (backward transition)', () => {
        expect(isValidTransition('APPROVED', 'DRAFT')).toBe(false);
      });
      
      it('should reject ISSUED → DRAFT (backward transition)', () => {
        expect(isValidTransition('ISSUED', 'DRAFT')).toBe(false);
      });
      
      it('should reject transitions from CANCELLED (terminal state)', () => {
        const allStatuses: QMQAStatus[] = [
          'PLANNED', 'DRAFT', 'AWAITING_APPROVAL', 'REJECTED', 'APPROVED',
          'ISSUED', 'CANCELLED', 'WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT',
          'RESPONSE_AWAITING_APPROVAL', 'RESPONSE_REJECTED', 'CLOSED'
        ];
        
        allStatuses.forEach(status => {
          expect(isValidTransition('CANCELLED', status)).toBe(false);
        });
      });
      
      it('should reject transitions from CLOSED (terminal state)', () => {
        const allStatuses: QMQAStatus[] = [
          'PLANNED', 'DRAFT', 'AWAITING_APPROVAL', 'REJECTED', 'APPROVED',
          'ISSUED', 'CANCELLED', 'WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT',
          'RESPONSE_AWAITING_APPROVAL', 'RESPONSE_REJECTED', 'CLOSED'
        ];
        
        allStatuses.forEach(status => {
          expect(isValidTransition('CLOSED', status)).toBe(false);
        });
      });
      
      it('should reject PLANNED → APPROVED (skipping multiple steps)', () => {
        expect(isValidTransition('PLANNED', 'APPROVED')).toBe(false);
      });
      
      it('should reject WITH_INITIAL_REPORT → CLOSED (skipping steps)', () => {
        expect(isValidTransition('WITH_INITIAL_REPORT', 'CLOSED')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should reject transition to same status', () => {
        expect(isValidTransition('DRAFT', 'DRAFT')).toBe(false);
        expect(isValidTransition('APPROVED', 'APPROVED')).toBe(false);
        expect(isValidTransition('CLOSED', 'CLOSED')).toBe(false);
      });
    });
  });

  describe('round-trip conversions', () => {
    it('should preserve rating through conversion round-trip', () => {
      const testRatings = [0, 25, 50, 75, 85, 90, 95, 100];
      
      testRatings.forEach(rating => {
        const percentage = convertRatingToPercentage(rating);
        const parsed = parsePercentageToNumber(percentage);
        expect(parsed).toBe(rating);
      });
    });
  });
});
