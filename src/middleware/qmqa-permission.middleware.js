/**
 * QMQA Permission Middleware
 * Enforces row-level security and permission checks for QMQA operations
 */

import { qmqaService } from '../services/qmqa.service.js';

/**
 * Check if user can modify a QMQA record
 * Only the issuer or admin can modify records
 */
export const canModifyRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        console.log('🔒 [PERMISSION] Checking modify permission for record:', id);
        console.log('   User ID:', userId);
        console.log('   User Role:', userRole);
        
        // Admin bypass
        if (userRole === 'ADMIN' || userRole === 'admin') {
            console.log('✅ [PERMISSION] Admin bypass granted');
            return next();
        }
        
        // Get record to check ownership
        const record = await qmqaService.getRecord(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Record not found'
                }
            });
        }
        
        // Check if user is the issuer
        if (record.issuer?.userId === userId) {
            console.log('✅ [PERMISSION] User is issuer - access granted');
            return next();
        }
        
        console.log('❌ [PERMISSION] Access denied - user is not issuer or admin');
        return res.status(403).json({
            success: false,
            error: {
                name: 'ForbiddenError',
                message: 'Insufficient permissions to modify this record'
            }
        });
    } catch (error) {
        console.error('❌ [PERMISSION] Error checking modify permission:', error);
        return res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Error checking permissions'
            }
        });
    }
};

/**
 * Check if user can approve a QMQA record
 * Only assigned checker/approver or admin can approve
 */
export const canApprove = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        console.log('🔒 [PERMISSION] Checking approve permission for record:', id);
        console.log('   User ID:', userId);
        console.log('   User Role:', userRole);
        
        // Admin bypass
        if (userRole === 'ADMIN' || userRole === 'admin') {
            console.log('✅ [PERMISSION] Admin bypass granted');
            return next();
        }
        
        // Get record to check approver assignment
        const record = await qmqaService.getRecord(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Record not found'
                }
            });
        }
        
        // Check if user is assigned as checker or approver (Cycle 1)
        const isChecker = record.checker?.userId === userId;
        const isApprover = record.approver?.userId === userId;
        
        // Check if user is assigned as Cycle 2 checker or approver
        const isCycle2Checker = record.response?.checker?.userId === userId;
        const isCycle2Approver = record.response?.approver?.userId === userId;
        
        if (isChecker || isApprover || isCycle2Checker || isCycle2Approver) {
            console.log('✅ [PERMISSION] User is assigned approver - access granted');
            return next();
        }
        
        console.log('❌ [PERMISSION] Access denied - user is not assigned as approver');
        return res.status(403).json({
            success: false,
            error: {
                name: 'ForbiddenError',
                message: 'Not assigned as approver for this record'
            }
        });
    } catch (error) {
        console.error('❌ [PERMISSION] Error checking approve permission:', error);
        return res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Error checking permissions'
            }
        });
    }
};

/**
 * Check if user can access a QMQA record (Row-Level Security)
 * Users can only access records where they are involved (issuer, encoder, checker, approver)
 * Admin can access all records
 */
export const canAccessRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        console.log('🔒 [PERMISSION] Checking access permission for record:', id);
        console.log('   User ID:', userId);
        console.log('   User Role:', userRole);
        
        // Admin bypass
        if (userRole === 'ADMIN' || userRole === 'admin') {
            console.log('✅ [PERMISSION] Admin bypass granted');
            return next();
        }
        
        // Get record to check involvement
        const record = await qmqaService.getRecord(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Record not found'
                }
            });
        }
        
        // Check if user is involved in the record
        const isIssuer = record.issuer?.userId === userId;
        const isEncoder = record.encoderId === userId;
        const isChecker = record.checker?.userId === userId;
        const isApprover = record.approver?.userId === userId;
        const isCycle2Checker = record.response?.checker?.userId === userId;
        const isCycle2Approver = record.response?.approver?.userId === userId;
        
        // Check if user is in CC list
        const isInCCList = record.ccList?.some(cc => cc.userId === userId);
        
        if (isIssuer || isEncoder || isChecker || isApprover || 
            isCycle2Checker || isCycle2Approver || isInCCList) {
            console.log('✅ [PERMISSION] User is involved in record - access granted');
            return next();
        }
        
        console.log('❌ [PERMISSION] Access denied - user is not involved in record');
        return res.status(403).json({
            success: false,
            error: {
                name: 'ForbiddenError',
                message: 'Access denied to this record'
            }
        });
    } catch (error) {
        console.error('❌ [PERMISSION] Error checking access permission:', error);
        return res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Error checking permissions'
            }
        });
    }
};

/**
 * Apply row-level security filter to list queries
 * This middleware adds user filtering to getAllRecords calls
 */
export const applyRLS = (req, res, next) => {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    console.log('🔒 [PERMISSION] Applying RLS filter');
    console.log('   User ID:', userId);
    console.log('   User Role:', userRole);
    
    // Admin bypass - no filtering needed
    if (userRole === 'ADMIN' || userRole === 'admin') {
        console.log('✅ [PERMISSION] Admin bypass - no RLS filtering');
        req.rlsFilter = null;
        return next();
    }
    
    // Apply RLS filter for non-admin users
    req.rlsFilter = {
        userId,
        userRole
    };
    
    console.log('✅ [PERMISSION] RLS filter applied');
    next();
};
