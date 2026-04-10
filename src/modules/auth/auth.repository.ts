import { authUserRepository } from './repositories/auth-user.repository.js';
import { passwordResetRepository } from './repositories/password-reset.repository.js';
import { fiveM1eAssignedAccessRepository } from './repositories/assigned-access/fiveM1e-access.repository.js';
import { mnrAssignedAccessRepository } from './repositories/assigned-access/mnr-access.repository.js';
import { npiAssignedAccessRepository } from './repositories/assigned-access/npi-access.repository.js';
import { ogiAssignedAccessRepository } from './repositories/assigned-access/ogi-access.repository.js';
import { qmqaAssignedAccessRepository } from './repositories/assigned-access/qmqa-access.repository.js';
import { sqmpAssignedAccessRepository } from './repositories/assigned-access/sqmp-access.repository.js';
import { sqprAssignedAccessRepository } from './repositories/assigned-access/sqpr-access.repository.js';

export class AuthRepository {
  findByEmail(email: string) {
    return authUserRepository.findByEmail(email);
  }

  findUserById(userId: string) {
    return authUserRepository.findUserById(userId);
  }

  updatePassword(userId: string, passwordHash: string) {
    return authUserRepository.updatePassword(userId, passwordHash);
  }

  createPasswordResetToken(input: {
    password_reset_token_id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    created_at: Date;
    updateby: string;
  }) {
    return passwordResetRepository.createPasswordResetToken(input);
  }

  invalidatePasswordResetTokensForUser(userId: string) {
    return passwordResetRepository.invalidatePasswordResetTokensForUser(userId);
  }

  findPasswordResetTokenByHash(tokenHash: string) {
    return passwordResetRepository.findPasswordResetTokenByHash(tokenHash);
  }

  markPasswordResetTokenUsed(passwordResetTokenId: string) {
    return passwordResetRepository.markPasswordResetTokenUsed(passwordResetTokenId);
  }

  findRoleBasedAccessibleForms(userId: string) {
    return authUserRepository.findRoleBasedAccessibleForms(userId);
  }

  findCurrentUserRoleAccessRecords(userId: string) {
    return authUserRepository.findCurrentUserRoleAccessRecords(userId);
  }

  findAssignedSqmpAccessibleForms(userId: string) {
    return sqmpAssignedAccessRepository.findAssignedSqmpAccessibleForms(userId);
  }

  findAssignedNpiAccessibleForms(userId: string) {
    return npiAssignedAccessRepository.findAssignedNpiAccessibleForms(userId);
  }

  findAssignedOgiAccessibleForms(userId: string) {
    return ogiAssignedAccessRepository.findAssignedOgiAccessibleForms(userId);
  }

  findAssignedMnrAccessibleForms(userId: string) {
    return mnrAssignedAccessRepository.findAssignedMnrAccessibleForms(userId);
  }

  findAssignedQmqaAccessibleForms(userId: string) {
    return qmqaAssignedAccessRepository.findAssignedQmqaAccessibleForms(userId);
  }

  findAssignedQmqaMediaAccessibleForms(userId: string) {
    return qmqaAssignedAccessRepository.findAssignedQmqaMediaAccessibleForms(userId);
  }

  findAssignedSqprAccessibleForms(userId: string) {
    return sqprAssignedAccessRepository.findAssignedSqprAccessibleForms(userId);
  }

  findAssignedFiveM1EAccessibleForms(userId: string) {
    return fiveM1eAssignedAccessRepository.findAssignedFiveM1EAccessibleForms(userId);
  }
}

export const authRepository = new AuthRepository();
