import sql from 'mssql';
import db from '../../config/db.js';

/**
 * Generate unique control number for QMQA records
 * Format: P-YYYY-NNN (for schedule-based) or YYYY-NNN (for direct)
 * 
 * @param {number} year - The year for the control number
 * @param {boolean} fromSchedule - Whether this is from a schedule (adds P- prefix)
 * @returns {Promise<string>} The generated control number
 */
export const generateControlNo = async (year, fromSchedule = false) => {
    const sequence = await getNextSequence(year);
    const paddedSequence = String(sequence).padStart(3, '0');
    const baseControlNo = `${year}-${paddedSequence}`;
    
    return fromSchedule ? `P-${baseControlNo}` : baseControlNo;
};

/**
 * Get the next sequence number for a given year
 * 
 * @param {number} year - The year to get the sequence for
 * @returns {Promise<number>} The next sequence number
 */
const getNextSequence = async (year) => {
    try {
        const pool = await db.getPool();
        const result = await pool.request()
            .input('year', sql.NVarChar, String(year))
            .query(`
                SELECT MAX(
                    CAST(
                        RIGHT(
                            CASE 
                                WHEN control_no LIKE 'P-%' THEN SUBSTRING(control_no, 3, LEN(control_no))
                                ELSE control_no
                            END,
                            3
                        ) AS INT
                    )
                ) as max_seq
                FROM QMQA_AUDIT_PLAN
                WHERE (
                    control_no LIKE @year + '-%' 
                    OR control_no LIKE 'P-' + @year + '-%'
                )
            `);
        
        const maxSeq = result.recordset[0]?.max_seq || 0;
        return maxSeq + 1;
    } catch (error) {
        console.error('Error getting next sequence:', error);
        throw new Error('Failed to generate control number sequence');
    }
};

/**
 * Validate control number format
 * 
 * @param {string} controlNo - The control number to validate
 * @returns {boolean} True if valid format
 */
export const validateControlNo = (controlNo) => {
    if (!controlNo) return false;
    
    // Pattern: P-YYYY-NNN or YYYY-NNN
    const pattern = /^(P-)?(\d{4})-(\d{3})$/;
    return pattern.test(controlNo);
};

/**
 * Extract year from control number
 * 
 * @param {string} controlNo - The control number
 * @returns {number|null} The year or null if invalid
 */
export const extractYear = (controlNo) => {
    if (!validateControlNo(controlNo)) return null;
    
    const match = controlNo.match(/^(P-)?(\d{4})-(\d{3})$/);
    return match ? parseInt(match[2], 10) : null;
};

/**
 * Check if control number is from schedule (has P- prefix)
 * 
 * @param {string} controlNo - The control number
 * @returns {boolean} True if from schedule
 */
export const isScheduleBased = (controlNo) => {
    return controlNo && controlNo.startsWith('P-');
};
