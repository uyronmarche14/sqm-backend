/**
 * QMQA Token Service
 * Manages JWT tokens for supplier access to response pages
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_TYPE = 'supplier_response';
const GRACE_PERIOD_DAYS = 7; // Days after due date before token expires

export const qmqaTokenService = {
    
    /**
     * Generate JWT token for supplier access
     * Token expires based on due_date + grace period
     * 
     * @param {string} qmqaId - QMQA record ID
     * @param {string} supplierId - Supplier ID
     * @param {Date|string} dueDate - Due date for the audit
     * @returns {string} JWT token
     */
    generateToken(qmqaId, supplierId, dueDate) {
        console.log('🔐 [TOKEN-SERVICE] Generating token for supplier access');
        console.log('   QMQA ID:', qmqaId);
        console.log('   Supplier ID:', supplierId);
        console.log('   Due Date:', dueDate);
        
        // Calculate expiration: due_date + grace period
        const dueDateObj = new Date(dueDate);
        const expirationDate = new Date(dueDateObj);
        expirationDate.setDate(expirationDate.getDate() + GRACE_PERIOD_DAYS);
        
        const expirationTimestamp = Math.floor(expirationDate.getTime() / 1000);
        
        console.log('   Expiration Date:', expirationDate.toISOString());
        
        const payload = {
            qmqaId,
            supplierId,
            type: TOKEN_TYPE,
            exp: expirationTimestamp
        };
        
        const token = jwt.sign(payload, JWT_SECRET);
        
        console.log('✅ [TOKEN-SERVICE] Token generated successfully');
        
        return token;
    },
    
    /**
     * Validate JWT token and return payload
     * 
     * @param {string} token - JWT token to validate
     * @returns {object} Decoded token payload
     * @throws {Error} If token is invalid or expired
     */
    validateToken(token) {
        console.log('🔍 [TOKEN-SERVICE] Validating token');
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Verify token type
            if (decoded.type !== TOKEN_TYPE) {
                console.log('❌ [TOKEN-SERVICE] Invalid token type:', decoded.type);
                throw new Error('Invalid token type');
            }
            
            console.log('✅ [TOKEN-SERVICE] Token valid');
            console.log('   QMQA ID:', decoded.qmqaId);
            console.log('   Supplier ID:', decoded.supplierId);
            
            return {
                qmqaId: decoded.qmqaId,
                supplierId: decoded.supplierId,
                exp: decoded.exp
            };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.log('❌ [TOKEN-SERVICE] Token expired');
                const expiredError = new Error('Token has expired');
                expiredError.statusCode = 401;
                expiredError.code = 'TOKEN_EXPIRED';
                throw expiredError;
            } else if (error.name === 'JsonWebTokenError') {
                console.log('❌ [TOKEN-SERVICE] Invalid token');
                const invalidError = new Error('Invalid token');
                invalidError.statusCode = 401;
                invalidError.code = 'INVALID_TOKEN';
                throw invalidError;
            } else {
                throw error;
            }
        }
    },
    
    /**
     * Refresh token with new due date
     * Used when due date is changed after token issuance
     * 
     * @param {string} token - Existing JWT token
     * @param {Date|string} newDueDate - New due date
     * @returns {string} New JWT token with updated expiration
     */
    refreshToken(token, newDueDate) {
        console.log('🔄 [TOKEN-SERVICE] Refreshing token with new due date');
        console.log('   New Due Date:', newDueDate);
        
        try {
            // Decode without verification to get payload (even if expired)
            const decoded = jwt.decode(token);
            
            if (!decoded || decoded.type !== TOKEN_TYPE) {
                throw new Error('Invalid token');
            }
            
            // Generate new token with same qmqaId and supplierId but new expiration
            const newToken = this.generateToken(
                decoded.qmqaId,
                decoded.supplierId,
                newDueDate
            );
            
            console.log('✅ [TOKEN-SERVICE] Token refreshed successfully');
            
            return newToken;
        } catch (error) {
            console.log('❌ [TOKEN-SERVICE] Token refresh failed:', error.message);
            throw error;
        }
    },
    
    /**
     * Verify token matches the expected supplier
     * Used to ensure supplier can only access their own audits
     * 
     * @param {string} token - JWT token
     * @param {string} expectedSupplierId - Expected supplier ID
     * @returns {boolean} True if supplier matches
     * @throws {Error} If token is invalid or supplier doesn't match
     */
    verifySupplier(token, expectedSupplierId) {
        console.log('🔍 [TOKEN-SERVICE] Verifying supplier match');
        
        const decoded = this.validateToken(token);
        
        if (decoded.supplierId !== expectedSupplierId) {
            console.log('❌ [TOKEN-SERVICE] Supplier mismatch');
            console.log('   Token Supplier:', decoded.supplierId);
            console.log('   Expected Supplier:', expectedSupplierId);
            
            const error = new Error('Unauthorized: Token does not match supplier');
            error.statusCode = 403;
            error.code = 'SUPPLIER_MISMATCH';
            throw error;
        }
        
        console.log('✅ [TOKEN-SERVICE] Supplier verified');
        
        return true;
    }
};
