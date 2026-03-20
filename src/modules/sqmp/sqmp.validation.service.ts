import { ForbiddenError } from '../../shared/errors/AppError.js';
import { userRepository } from '../users/user.repository.js';

export class SqmpValidationService {
    /**
     * Gets the role name from the DB
     */
    async getRoleName(roleId?: string): Promise<string> {
        if (!roleId) return 'UNKNOWN';
        const roleObj = await userRepository.findRoleById(roleId);
        return roleObj?.role_name || 'UNKNOWN';
    }

    /**
     * Checks if the user has a global bypass role.
     */
    isGlobalRole(roleName: string): boolean {
        return roleName.toUpperCase().includes('ADMIN');
    }

    /**
     * Validates that the user is the assigned Checker for Cycle 1.
     */
    async validateCycle1Check(record: any, userId: string, roleId: string) {
        const roleName = await this.getRoleName(roleId);
        if (this.isGlobalRole(roleName)) return;

        if (!record.checker_id) {
            throw new ForbiddenError('No checker has been assigned to this plan.');
        }

        if (record.checker_id !== userId) {
            throw new ForbiddenError('Only the assigned checker can verify this plan.');
        }
    }

    /**
     * Validates that the user is the assigned Approver for Cycle 1.
     */
    async validateCycle1Approve(record: any, userId: string, roleId: string) {
        const roleName = await this.getRoleName(roleId);
        if (this.isGlobalRole(roleName)) return;

        if (!record.approver_id) {
            throw new ForbiddenError('No approver has been assigned to this plan.');
        }

        if (record.approver_id !== userId) {
            throw new ForbiddenError('Only the assigned approver can approve this plan.');
        }
    }

    /**
     * Validates that the user is the assigned Checker OR Approver for Cycle 1 Rejection.
     */
    async validateCycle1Reject(record: any, userId: string, roleId: string) {
        const roleName = await this.getRoleName(roleId);
        if (this.isGlobalRole(roleName)) return;

        const isChecker = record.checker_id && record.checker_id === userId;
        const isApprover = record.approver_id && record.approver_id === userId;

        if (!isChecker && !isApprover) {
            throw new ForbiddenError('Only assigned checkers or approvers can reject this plan.');
        }
    }
}

export const sqmpValidationService = new SqmpValidationService();
