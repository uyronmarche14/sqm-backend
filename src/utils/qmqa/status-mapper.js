/**
 * QMQA Status Mapper Utility
 * Maps between database status codes and frontend status names
 */

/**
 * Status mapping between DB codes and frontend names
 */
const STATUS_MAP = {
    'PL': 'PLANNED',
    'DR': 'DRAFT',
    'AW': 'AWAITING_APPROVAL',
    'AP': 'APPROVED',
    'RJ': 'REJECTED',
    'IS': 'ISSUED',
    'CN': 'CANCELLED',
    'IR': 'WITH_INITIAL_REPORT',
    'FR': 'WITH_FINAL_REPORT',
    'RA': 'RESPONSE_AWAITING_APPROVAL',
    'RR': 'RESPONSE_REJECTED',
    'CL': 'CLOSED'
};

/**
 * Reverse mapping for quick lookup
 */
const REVERSE_STATUS_MAP = Object.entries(STATUS_MAP).reduce((acc, [code, name]) => {
    acc[name] = code;
    return acc;
}, {});

/**
 * Convert frontend status name to database status code
 * 
 * @param {string} status - Frontend status name (e.g., 'DRAFT', 'AWAITING_APPROVAL')
 * @returns {string} Database status code (e.g., 'DR', 'AW')
 */
export const toDBStatus = (status) => {
    if (!status) return 'DR'; // Default to DRAFT
    
    // If already a DB code, return as-is
    if (STATUS_MAP[status]) return status;
    
    // Convert from frontend name
    return REVERSE_STATUS_MAP[status] || status.substring(0, 2).toUpperCase();
};

/**
 * Convert database status code to frontend status name
 * 
 * @param {string} code - Database status code (e.g., 'DR', 'AW')
 * @returns {string} Frontend status name (e.g., 'DRAFT', 'AWAITING_APPROVAL')
 */
export const fromDBStatus = (code) => {
    if (!code) return 'DRAFT'; // Default to DRAFT
    
    // If already a frontend name, return as-is
    if (REVERSE_STATUS_MAP[code]) return code;
    
    // Convert from DB code
    return STATUS_MAP[code] || code;
};

/**
 * Get all valid status codes
 * 
 * @returns {string[]} Array of all valid DB status codes
 */
export const getAllStatusCodes = () => {
    return Object.keys(STATUS_MAP);
};

/**
 * Get all valid status names
 * 
 * @returns {string[]} Array of all valid frontend status names
 */
export const getAllStatusNames = () => {
    return Object.values(STATUS_MAP);
};

/**
 * Validate if a status code is valid
 * 
 * @param {string} code - Status code to validate
 * @returns {boolean} True if valid
 */
export const isValidStatusCode = (code) => {
    return STATUS_MAP.hasOwnProperty(code);
};

/**
 * Validate if a status name is valid
 * 
 * @param {string} name - Status name to validate
 * @returns {boolean} True if valid
 */
export const isValidStatusName = (name) => {
    return REVERSE_STATUS_MAP.hasOwnProperty(name);
};

/**
 * Get status display information
 * 
 * @param {string} statusCodeOrName - Status code or name
 * @returns {Object} Status information with code, name, and display properties
 */
export const getStatusInfo = (statusCodeOrName) => {
    const code = toDBStatus(statusCodeOrName);
    const name = fromDBStatus(code);
    
    return {
        code,
        name,
        displayName: name.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    };
};
