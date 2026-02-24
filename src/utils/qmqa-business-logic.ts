/**
 * QMQA Business Logic Utilities
 * 
 * Provides business logic functions for QMQA module including:
 * - Control No. generation and validation
 * - Rating conversion utilities
 * - Workflow state machine validation
 */

/**
 * QMQA Status Enum
 * Represents all possible statuses in the QMQA workflow
 */
export type QMQAStatus =
  | 'PLANNED'
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'REJECTED'
  | 'APPROVED'
  | 'ISSUED'
  | 'CANCELLED'
  | 'WITH_INITIAL_REPORT'
  | 'WITH_FINAL_REPORT'
  | 'RESPONSE_AWAITING_APPROVAL'
  | 'RESPONSE_REJECTED'
  | 'CLOSED';

/**
 * Generate Control No. based on entry path
 * 
 * Business Rules:
 * - From Schedule: "P-YYYY-NNN" (e.g., P-2026-001)
 * - Direct Creation: "YYYY-NNN" (e.g., 2026-001)
 * - Prefix is permanent once assigned
 * 
 * @param year - The year for the control number
 * @param sequence - The sequence number (will be zero-padded to 3 digits)
 * @param fromSchedule - Whether this is created from a schedule (true = P- prefix)
 * @returns Formatted control number string
 * 
 * @example
 * generateControlNo(2026, 1, true)  // Returns "P-2026-001"
 * generateControlNo(2026, 1, false) // Returns "2026-001"
 */
export function generateControlNo(
  year: number,
  sequence: number,
  fromSchedule: boolean
): string {
  const paddedSequence = String(sequence).padStart(3, '0');
  const baseControlNo = `${year}-${paddedSequence}`;
  return fromSchedule ? `P-${baseControlNo}` : baseControlNo;
}

/**
 * Check if Control No. has schedule prefix
 * 
 * @param controlNo - The control number to check
 * @returns true if control number starts with "P-", false otherwise
 * 
 * @example
 * hasSchedulePrefix("P-2026-001") // Returns true
 * hasSchedulePrefix("2026-001")   // Returns false
 */
export function hasSchedulePrefix(controlNo: string): boolean {
  return controlNo.startsWith('P-');
}

/**
 * Validate Control No. format
 * 
 * Valid formats:
 * - Schedule format: P-YYYY-NNN (e.g., P-2026-001)
 * - Direct format: YYYY-NNN (e.g., 2026-001)
 * 
 * @param controlNo - The control number to validate
 * @returns true if format is valid, false otherwise
 * 
 * @example
 * validateControlNo("P-2026-001") // Returns true
 * validateControlNo("2026-001")   // Returns true
 * validateControlNo("2026-1")     // Returns false (sequence not padded)
 * validateControlNo("P-26-001")   // Returns false (year not 4 digits)
 */
export function validateControlNo(controlNo: string): boolean {
  const schedulePattern = /^P-\d{4}-\d{3}$/;
  const directPattern = /^\d{4}-\d{3}$/;
  return schedulePattern.test(controlNo) || directPattern.test(controlNo);
}

/**
 * Convert audit rating to percentage string
 * 
 * @param rating - The numeric rating (0-100)
 * @returns Formatted percentage string
 * 
 * @example
 * convertRatingToPercentage(85) // Returns "85%"
 * convertRatingToPercentage(100) // Returns "100%"
 */
export function convertRatingToPercentage(rating: number): string {
  return `${rating}%`;
}

/**
 * Parse percentage string to number
 * 
 * @param percentageStr - The percentage string (e.g., "85%")
 * @returns Numeric value without percentage sign
 * 
 * @example
 * parsePercentageToNumber("85%") // Returns 85
 * parsePercentageToNumber("100%") // Returns 100
 */
export function parsePercentageToNumber(percentageStr: string): number {
  return parseInt(percentageStr.replace('%', ''), 10);
}

/**
 * Validate workflow transition according to QMQA state machine
 * 
 * State Machine Rules:
 * - PLANNED → DRAFT (schedule converted to audit report)
 * - DRAFT → AWAITING_APPROVAL (submit for approval)
 * - AWAITING_APPROVAL → APPROVED | REJECTED (approval decision)
 * - REJECTED → DRAFT (resubmit after rejection)
 * - APPROVED → ISSUED (issue to supplier)
 * - ISSUED → CANCELLED | WITH_INITIAL_REPORT (supplier response or cancellation)
 * - WITH_INITIAL_REPORT → WITH_FINAL_REPORT (initial report submitted)
 * - WITH_FINAL_REPORT → RESPONSE_AWAITING_APPROVAL (final report submitted)
 * - RESPONSE_AWAITING_APPROVAL → CLOSED | RESPONSE_REJECTED (verification decision)
 * - RESPONSE_REJECTED → WITH_FINAL_REPORT (resubmit response)
 * - CANCELLED → (terminal state)
 * - CLOSED → (terminal state)
 * 
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is valid, false otherwise
 * 
 * @example
 * isValidTransition('DRAFT', 'AWAITING_APPROVAL') // Returns true
 * isValidTransition('DRAFT', 'ISSUED') // Returns false
 * isValidTransition('CLOSED', 'DRAFT') // Returns false (terminal state)
 */
export function isValidTransition(from: QMQAStatus, to: QMQAStatus): boolean {
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
  
  return validTransitions[from]?.includes(to) ?? false;
}
