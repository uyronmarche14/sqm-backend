// =============================================================================
// STATUS MAPPER — Backend DB Code ↔ Application Status
// =============================================================================
// This maps between the short DB codes (nvarchar(4)) and human-readable
// status strings used in the application layer.
// =============================================================================
/**
 * Convert a human-readable status string to its DB code.
 * Example: 'DRAFT' → 'DR', 'AWAITING_APPROVAL' → 'AA'
 */
export const mapStatusToDB = (status) => {
    const map = {
        // Pre-Submission
        'DRAFT': 'DR',
        'NEW': 'NW',
        'PLANNED': 'PL',
        // Cycle 1
        'AWAITING_CHECKED': 'AC',
        'AWAITING_APPROVAL': 'AA',
        'SUBMITTED': 'SU', // 5M1E and OGI legacy
        'APPROVED': 'AP',
        'APPROVED_WC': 'AW',
        'APPROVEDWC': 'AW',
        'REJECTED': 'RE',
        'REJECTED_AND_RETURNED': 'RR',
        'RAR': 'RR',
        // Post-Approval
        'ISSUED': 'IS',
        'RELEASE': 'RL',
        'HOLD': 'HO',
        'FAPPROVED': 'FA',
        'EVALUATION': 'EV',
        'CHECKED': 'CK',
        // MNR Report Milestones
        'REPORT': 'RP',
        'IR': 'IR',
        'FR': 'FR',
        // Cycle 2: Response Flow
        'RESPONSE_AWAITING': 'RW',
        'RESPONSE_SUBMITTED': 'RS',
        'RESPONSE_AWAITING_CHECKED': 'RC',
        'RESPONSE_AWAITING_APPROVAL': 'RA',
        'RESPONSE_RECEIVED': 'RV',
        'RESPONSE_REJECTED': 'RJ',
        // QMQA Response Stages
        'WITH_INITIAL_REPORT': 'WI',
        'WITH_FINAL_REPORT': 'WF',
        // Terminal
        'CLOSED': 'CL',
        'CANCELLED': 'CA',
        'CANCEL': 'CA',
        // Legacy aliases (handle old code that may still send these)
        'RESPONSE_AWAIT_APPROVAL': 'RA',
        'RREJECTED': 'RJ',
        'PENDING': 'PD',
        'APPROVAL': 'AA',
    };
    const upperStatus = (status || '').toUpperCase();
    return map[upperStatus] || 'DR';
};
/**
 * Convert a DB code to its human-readable status string.
 * Example: 'DR' → 'DRAFT', 'AA' → 'AWAITING_APPROVAL'
 */
export const mapStatusFromDB = (code) => {
    const map = {
        // Pre-Submission
        'DR': 'DRAFT',
        'NW': 'NEW',
        'PL': 'PLANNED',
        // Cycle 1
        'AC': 'AWAITING_CHECKED',
        'AA': 'AWAITING_APPROVAL',
        'SU': 'SUBMITTED',
        'PD': 'PENDING',
        'PN': 'PENDING',
        'AP': 'APPROVED',
        'AW': 'APPROVEDWC',
        'RE': 'REJECTED',
        // Post-Approval
        'IS': 'ISSUED',
        'RL': 'RELEASE',
        'HO': 'HOLD',
        'FA': 'FAPPROVED',
        'EV': 'EVALUATION',
        'CK': 'CHECKED',
        // MNR Report Milestones
        'RP': 'REPORT',
        'IR': 'IR',
        'FR': 'FR',
        // Cycle 2
        'RW': 'RESPONSE_AWAITING',
        'RS': 'RESPONSE_SUBMITTED',
        'RC': 'RESPONSE_AWAITING_CHECKED',
        'RA': 'RESPONSE_AWAITING_APPROVAL',
        'RV': 'RESPONSE_RECEIVED',
        'RJ': 'RESPONSE_REJECTED',
        'RR': 'REJECTED', // RAR / Rejected-and-Revised
        // QMQA Response Stages
        'WI': 'WITH_INITIAL_REPORT',
        'WF': 'WITH_FINAL_REPORT',
        // Terminal
        'CL': 'CLOSED',
        'CA': 'CANCELLED',
        'CC': 'CANCELLED',
    };
    return map[code] || code;
};
