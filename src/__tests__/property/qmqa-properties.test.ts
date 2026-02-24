/**
 * Property-Based Tests for QMQA Module
 * 
 * Tests universal correctness properties using fast-check with 100+ iterations
 * Each property validates behavior across all possible inputs
 */

import fc from 'fast-check';
import {
  generateControlNo,
  hasSchedulePrefix,
  validateControlNo,
  isValidTransition,
  convertRatingToPercentage,
  parsePercentageToNumber,
  type QMQAStatus
} from '../../utils/qmqa-business-logic.js';
import { qmqaStatusArbitrary } from './generators/qmqa.generators.js';

describe('Feature: qmqa-module', () => {
  /**
   * Property 1: Control No. Generation Rules
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3, 4.5**
   * 
   * For any QMQA record creation:
   * - If created from a schedule, the Control No. SHALL have "P-" prefix (format: P-YYYY-NNN)
   * - If created directly, the Control No. SHALL NOT have "P-" prefix (format: YYYY-NNN)
   * - Once assigned, the prefix SHALL never change throughout the record lifecycle
   */
  describe('Property 1: Control No. Generation Rules', () => {
    it('should assign P-prefix for schedule creation and no prefix for direct creation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),  // year
          fc.integer({ min: 1, max: 999 }),      // sequence
          fc.boolean(),                           // fromSchedule
          (year, sequence, fromSchedule) => {
            const controlNo = generateControlNo(year, sequence, fromSchedule);
            
            // Verify format is valid
            expect(validateControlNo(controlNo)).toBe(true);
            
            if (fromSchedule) {
              // Schedule creation: must have P-prefix
              expect(controlNo).toMatch(/^P-\d{4}-\d{3}$/);
              expect(hasSchedulePrefix(controlNo)).toBe(true);
              expect(controlNo.startsWith('P-')).toBe(true);
            } else {
              // Direct creation: must NOT have P-prefix
              expect(controlNo).toMatch(/^\d{4}-\d{3}$/);
              expect(hasSchedulePrefix(controlNo)).toBe(false);
              expect(controlNo.startsWith('P-')).toBe(false);
            }
            
            // Verify year and sequence are correctly formatted
            const parts = controlNo.replace('P-', '').split('-');
            expect(parts[0]).toBe(String(year));
            expect(parts[1]).toBe(String(sequence).padStart(3, '0'));
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain prefix immutability (prefix never changes once assigned)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 999 }),
          fc.boolean(),
          (year, sequence, fromSchedule) => {
            const controlNo = generateControlNo(year, sequence, fromSchedule);
            const hasPrefix = hasSchedulePrefix(controlNo);
            
            // The prefix state is determined at creation and is immutable
            // This property verifies that hasSchedulePrefix is consistent with the format
            if (hasPrefix) {
              expect(controlNo).toMatch(/^P-\d{4}-\d{3}$/);
            } else {
              expect(controlNo).toMatch(/^\d{4}-\d{3}$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Workflow Transition Validity
   * 
   * **Validates: Requirements 1.4**
   * 
   * For any sequence of workflow transitions:
   * - Each transition SHALL only move from a valid source status to a valid target status
   * - The resulting status SHALL always be a valid QMQAStatus value
   */
  describe('Property 2: Workflow Transition Validity', () => {
    it('should only allow valid transitions according to state machine', () => {
      fc.assert(
        fc.property(
          qmqaStatusArbitrary,  // from status
          qmqaStatusArbitrary,  // to status
          (fromStatus, toStatus) => {
            const isValid = isValidTransition(fromStatus, toStatus);
            
            // Define the complete state machine
            const validTransitions: Record<QMQAStatus, QMQAStatus[]> = {
              PLANNED: ['DRAFT'],
              DRAFT: ['AWAITING_APPROVAL'],
              AWAITING_APPROVAL: ['APPROVED', 'REJECTED'],
              REJECTED: ['DRAFT'],
              APPROVED: ['ISSUED'],
              ISSUED: ['CANCELLED', 'WITH_INITIAL_REPORT'],
              CANCELLED: [],
              WITH_INITIAL_REPORT: ['WITH_FINAL_REPORT'],
              WITH_FINAL_REPORT: ['RESPONSE_AWAITING_APPROVAL'],
              RESPONSE_AWAITING_APPROVAL: ['CLOSED', 'RESPONSE_REJECTED'],
              RESPONSE_REJECTED: ['WITH_FINAL_REPORT'],
              CLOSED: []
            };
            
            const expectedValid = validTransitions[fromStatus]?.includes(toStatus) ?? false;
            
            // Verify isValidTransition matches the state machine
            expect(isValid).toBe(expectedValid);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should reject transitions from terminal states', () => {
      fc.assert(
        fc.property(
          qmqaStatusArbitrary,
          (toStatus) => {
            // CANCELLED and CLOSED are terminal states
            expect(isValidTransition('CANCELLED', toStatus)).toBe(false);
            expect(isValidTransition('CLOSED', toStatus)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should ensure all valid transitions result in valid status values', () => {
      fc.assert(
        fc.property(
          qmqaStatusArbitrary,
          qmqaStatusArbitrary,
          (fromStatus, toStatus) => {
            if (isValidTransition(fromStatus, toStatus)) {
              // If transition is valid, toStatus must be a valid QMQAStatus
              const validStatuses: QMQAStatus[] = [
                'PLANNED', 'DRAFT', 'AWAITING_APPROVAL', 'REJECTED', 'APPROVED',
                'ISSUED', 'CANCELLED', 'WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT',
                'RESPONSE_AWAITING_APPROVAL', 'RESPONSE_REJECTED', 'CLOSED'
              ];
              expect(validStatuses).toContain(toStatus);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Rating Conversion Round-Trip
   * 
   * **Validates: Requirements 6.4**
   * 
   * For any audit rating number:
   * - Converting to percentage then parsing back to number SHALL produce the original value
   */
  describe('Property 10: Rating Conversion Round-Trip', () => {
    it('should preserve rating value through conversion round-trip', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),  // audit rating
          (rating) => {
            // Convert to percentage string
            const percentageStr = convertRatingToPercentage(rating);
            
            // Verify format
            expect(percentageStr).toMatch(/^\d+%$/);
            expect(percentageStr).toBe(`${rating}%`);
            
            // Parse back to number
            const parsedRating = parsePercentageToNumber(percentageStr);
            
            // Verify round-trip property: original value is preserved
            expect(parsedRating).toBe(rating);
            expect(typeof parsedRating).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle edge case ratings (0 and 100)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0, 100),
          (rating) => {
            const percentageStr = convertRatingToPercentage(rating);
            const parsedRating = parsePercentageToNumber(percentageStr);
            expect(parsedRating).toBe(rating);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 20: Control No. Uniqueness
   * 
   * **Validates: Requirements 25.5**
   * 
   * For any attempt to create a QMQA record with a duplicate Control No.:
   * - The system SHALL reject the creation with a unique constraint error
   * 
   * Note: This property tests the format uniqueness guarantee - same year/sequence/prefix
   * combination always produces the same Control No.
   */
  describe('Property 20: Control No. Uniqueness', () => {
    it('should generate identical Control No. for identical inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 999 }),
          fc.boolean(),
          (year, sequence, fromSchedule) => {
            const controlNo1 = generateControlNo(year, sequence, fromSchedule);
            const controlNo2 = generateControlNo(year, sequence, fromSchedule);
            
            // Same inputs must produce same Control No. (deterministic)
            expect(controlNo1).toBe(controlNo2);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should generate different Control No. for different sequences', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 998 }),  // Leave room for seq2
          fc.boolean(),
          (year, sequence1, fromSchedule) => {
            const sequence2 = sequence1 + 1;
            const controlNo1 = generateControlNo(year, sequence1, fromSchedule);
            const controlNo2 = generateControlNo(year, sequence2, fromSchedule);
            
            // Different sequences must produce different Control Nos.
            expect(controlNo1).not.toBe(controlNo2);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should generate different Control No. for different prefix flags', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 999 }),
          (year, sequence) => {
            const controlNoSchedule = generateControlNo(year, sequence, true);
            const controlNoDirect = generateControlNo(year, sequence, false);
            
            // Same year/sequence but different prefix flag must produce different Control Nos.
            expect(controlNoSchedule).not.toBe(controlNoDirect);
            expect(controlNoSchedule).toBe(`P-${controlNoDirect}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
