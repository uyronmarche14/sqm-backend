import { authUserRepository } from './repositories/auth-user.repository.js';
import { passwordResetRepository } from './repositories/password-reset.repository.js';
import { fiveM1eAssignedAccessRepository } from './repositories/assigned-access/fiveM1e-access.repository.js';
import { mnrAssignedAccessRepository } from './repositories/assigned-access/mnr-access.repository.js';
import { npiAssignedAccessRepository } from './repositories/assigned-access/npi-access.repository.js';
import { ogiAssignedAccessRepository } from './repositories/assigned-access/ogi-access.repository.js';
import { qmqaAssignedAccessRepository } from './repositories/assigned-access/qmqa-access.repository.js';
import { sqmpAssignedAccessRepository } from './repositories/assigned-access/sqmp-access.repository.js';
import { sqprAssignedAccessRepository } from './repositories/assigned-access/sqpr-access.repository.js';
import { supplierQualityAssignedAccessRepository } from './repositories/assigned-access/supplier-quality-access.repository.js';
import { spcTrendAssignedAccessRepository } from './repositories/assigned-access/spc-trend-access.repository.js';
export class AuthRepository {
    findByEmail(email) {
        return authUserRepository.findByEmail(email);
    }
    findUserById(userId) {
        return authUserRepository.findUserById(userId);
    }
    updatePassword(userId, passwordHash) {
        return authUserRepository.updatePassword(userId, passwordHash);
    }
    createPasswordResetToken(input) {
        return passwordResetRepository.createPasswordResetToken(input);
    }
    invalidatePasswordResetTokensForUser(userId) {
        return passwordResetRepository.invalidatePasswordResetTokensForUser(userId);
    }
    findPasswordResetTokenByHash(tokenHash) {
        return passwordResetRepository.findPasswordResetTokenByHash(tokenHash);
    }
    markPasswordResetTokenUsed(passwordResetTokenId) {
        return passwordResetRepository.markPasswordResetTokenUsed(passwordResetTokenId);
    }
    findRoleBasedAccessibleForms(userId) {
        return authUserRepository.findRoleBasedAccessibleForms(userId);
    }
    findCurrentUserRoleAccessRecords(userId) {
        return authUserRepository.findCurrentUserRoleAccessRecords(userId);
    }
    findAssignedSqmpAccessibleForms(userId) {
        return sqmpAssignedAccessRepository.findAssignedSqmpAccessibleForms(userId);
    }
    findAssignedNpiAccessibleForms(userId) {
        return npiAssignedAccessRepository.findAssignedNpiAccessibleForms(userId);
    }
    findAssignedOgiAccessibleForms(userId) {
        return ogiAssignedAccessRepository.findAssignedOgiAccessibleForms(userId);
    }
    findAssignedMnrAccessibleForms(userId) {
        return mnrAssignedAccessRepository.findAssignedMnrAccessibleForms(userId);
    }
    findAssignedQmqaAccessibleForms(userId) {
        return qmqaAssignedAccessRepository.findAssignedQmqaAccessibleForms(userId);
    }
    findAssignedQmqaMediaAccessibleForms(userId) {
        return qmqaAssignedAccessRepository.findAssignedQmqaMediaAccessibleForms(userId);
    }
    findAssignedSqprAccessibleForms(userId) {
        return sqprAssignedAccessRepository.findAssignedSqprAccessibleForms(userId);
    }
    findAssignedFiveM1EAccessibleForms(userId) {
        return fiveM1eAssignedAccessRepository.findAssignedFiveM1EAccessibleForms(userId);
    }
    findAssignedSupplierQualityAccessibleForms(userId) {
        return supplierQualityAssignedAccessRepository.findAssignedSupplierQualityAccessibleForms(userId);
    }
    findAssignedSpcTrendAccessibleForms(userId) {
        return spcTrendAssignedAccessRepository.findAssignedSpcTrendAccessibleForms(userId);
    }
}
export const authRepository = new AuthRepository();
