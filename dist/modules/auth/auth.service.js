import { authRepository } from './auth.repository.js';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { hashPassword, verifyPassword } from '../../shared/utils/hash.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, } from '../../shared/utils/jwt.js';
import { getLegacyFormMapping, getModulePermissionManifest } from '@sqm/permissions-contract';
import { getAssignedWorkflowAccessibleForms } from './assigned-form-access.js';
import { authNotificationService, } from '../../shared/notifications/auth-notification.service.js';
import { getEmailConfig } from '../../shared/notifications/email.config.js';
import { createHash, randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
const SYSTEM_ACTOR = 'SYSTEM';
export class AuthService {
    notifications;
    constructor(notifications = authNotificationService) {
        this.notifications = notifications;
    }
    buildResetPasswordUrl(token) {
        const config = getEmailConfig();
        const baseUrl = config.internetBaseUrl || config.frontendBaseUrl;
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        return new URL(`auth/reset-password?token=${encodeURIComponent(token)}`, normalizedBaseUrl).toString();
    }
    hashResetToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
    isExplicitlyDisabled(value) {
        return value === false || value === 0 || value === '0';
    }
    ensureUserCanUseSession(user, message = 'Invalid session') {
        if (!user) {
            throw new UnauthorizedError(message);
        }
        const candidate = user;
        if (this.isExplicitlyDisabled(candidate.active_flag) || this.isExplicitlyDisabled(candidate.login_flag)) {
            throw new UnauthorizedError(message);
        }
    }
    buildAccessTokenPayload(user) {
        return {
            userId: user.user_id,
            roleId: user.role_id || undefined,
        };
    }
    // With the existing schema, password-change timestamps are the safest built-in
    // signal we can use to invalidate older refresh tokens without a session table.
    wasPasswordChangedAfterTokenIssued(user, issuedAtSeconds) {
        if (typeof issuedAtSeconds !== 'number') {
            return false;
        }
        const lastPasswordChange = user?.last_pasword_change;
        if (!lastPasswordChange) {
            return false;
        }
        const changedAtMs = new Date(lastPasswordChange).getTime();
        if (Number.isNaN(changedAtMs)) {
            return false;
        }
        return Math.floor(changedAtMs / 1000) > issuedAtSeconds;
    }
    issueLoginTokens(user) {
        const accessPayload = this.buildAccessTokenPayload(user);
        return {
            accessToken: generateAccessToken(accessPayload),
            refreshToken: generateRefreshToken(accessPayload),
        };
    }
    buildAuthContextResponse(user, accessibleForms, roleAccessRecords) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('🏗️ [Auth] Building auth context for accessible forms:', accessibleForms);
        }
        const userMenuSet = new Set();
        for (const formCode of accessibleForms) {
            const mapping = getLegacyFormMapping(formCode);
            if (!mapping) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('⚠️ [Auth] No mapping found for form code:', formCode);
                }
                continue;
            }
            const menuLabel = getModulePermissionManifest(mapping.module).menuLabel;
            if (process.env.NODE_ENV !== 'production') {
                console.log('✅ [Auth] Form code:', formCode, '→ Module:', mapping.module, '→ Menu Label:', menuLabel);
            }
            userMenuSet.add(menuLabel);
        }
        const userMenu = Array.from(userMenuSet);
        if (process.env.NODE_ENV !== 'production') {
            console.log('📋 [Auth] Final userMenu:', userMenu);
        }
        const normalizedRoleName = user.role_name?.toLowerCase() || '';
        const isAdmin = normalizedRoleName.includes('admin') ? 1 : 0;
        const isSupplier = normalizedRoleName.includes('supplier');
        return {
            isSupplier,
            userData: {
                USER_ID: user.user_id,
                FULL_NAME: user.full_name,
                EMAIL: user.email,
                ROLE_ID: user.role_id || '',
                SITE_ID: user.site_id || '',
                ROLE_NAME: user.role_name || 'User',
                SITE_NAME: '',
                CREATION_DATE: user.creation_date,
                ACTIVE_FLAG: user.active_flag ? true : false,
                LAST_PASWORD_CHANGE: user.last_pasword_change,
                LOCAL_USER: user.local_user ? true : false,
                LOGIN_FLAG: user.login_flag ? true : false,
                LAST_UPDATE: user.last_update,
                UPDATEBY: user.updateby,
                isAdmin: isAdmin
            },
            userMenu,
            accessibleForms,
            roleAccessRecords,
        };
    }
    async buildAccessibleForms(userId) {
        const [assignedForms, roleBasedForms] = await Promise.all([
            getAssignedWorkflowAccessibleForms(userId),
            authRepository.findRoleBasedAccessibleForms(userId),
        ]);
        const accessibleForms = new Set(assignedForms);
        roleBasedForms.forEach((formCode) => {
            if (getLegacyFormMapping(formCode)) {
                accessibleForms.add(formCode);
            }
        });
        return Array.from(accessibleForms);
    }
    async refreshTokens(refreshToken) {
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded.userId) {
            throw new UnauthorizedError('Invalid refresh token');
        }
        const user = await authRepository.findUserById(decoded.userId);
        this.ensureUserCanUseSession(user, 'Invalid session');
        if (this.wasPasswordChangedAfterTokenIssued(user, decoded.iat)) {
            throw new UnauthorizedError('Refresh token expired. Please sign in again.');
        }
        const accessPayload = this.buildAccessTokenPayload(user);
        return {
            accessToken: generateAccessToken(accessPayload),
            refreshToken: generateRefreshToken(accessPayload),
        };
    }
    async login(input) {
        const user = await authRepository.findByEmail(input.email);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }
        this.ensureUserCanUseSession(user, 'Invalid credentials');
        if (!user.password) {
            throw new UnauthorizedError('Invalid account configuration');
        }
        const isValid = await verifyPassword(input.password, user.password);
        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials');
        }
        const tokens = this.issueLoginTokens(user);
        const [accessibleForms, roleAccessRecords] = await Promise.all([
            this.buildAccessibleForms(user.user_id),
            authRepository.findCurrentUserRoleAccessRecords(user.user_id),
        ]);
        const authContext = this.buildAuthContextResponse(user, accessibleForms, roleAccessRecords);
        return {
            success: true,
            message: 'Welcome back!',
            isSupplier: authContext.isSupplier,
            userData: authContext.userData,
            tokens,
            mustChangePassword: user.change_pw ? true : false,
            userMenu: authContext.userMenu,
            accessibleForms: authContext.accessibleForms,
            roleAccessRecords: authContext.roleAccessRecords,
        };
    }
    async getCurrentUserContext(userId) {
        const user = await authRepository.findUserById(userId);
        this.ensureUserCanUseSession(user, 'Invalid session');
        const [accessibleForms, roleAccessRecords] = await Promise.all([
            this.buildAccessibleForms(user.user_id),
            authRepository.findCurrentUserRoleAccessRecords(user.user_id),
        ]);
        const authContext = this.buildAuthContextResponse(user, accessibleForms, roleAccessRecords);
        return {
            success: true,
            message: 'User context refreshed',
            isSupplier: authContext.isSupplier,
            userData: authContext.userData,
            userMenu: authContext.userMenu,
            accessibleForms: authContext.accessibleForms,
            roleAccessRecords: authContext.roleAccessRecords,
        };
    }
    async changePassword(userId, input) {
        const user = await authRepository.findUserById(userId);
        this.ensureUserCanUseSession(user, 'Invalid session');
        const mustChangePassword = Boolean(user.change_pw);
        if (!mustChangePassword && !input.currentPassword) {
            throw new BadRequestError('Current password is required.');
        }
        if (!user.password) {
            throw new UnauthorizedError('Invalid account configuration');
        }
        if (input.currentPassword) {
            const isValid = await verifyPassword(input.currentPassword, user.password);
            if (!isValid) {
                throw new UnauthorizedError('Current password is incorrect.');
            }
        }
        const passwordHash = await hashPassword(input.newPassword);
        await authRepository.updatePassword(user.user_id, passwordHash);
        try {
            const result = await this.notifications.sendPasswordChanged({
                fullName: user.full_name || user.email || 'SQM User',
                email: user.email || '',
            });
            if (process.env.NODE_ENV !== 'production') {
                console.log('[auth] password-changed email notification processed', JSON.stringify({
                    userId: user.user_id,
                    email: user.email,
                    eventKey: 'auth.password.changed',
                    delivered: result.delivered,
                    skipped: result.skipped ?? false,
                    transport: result.transport,
                    referenceId: result.referenceId ?? null,
                }));
            }
        }
        catch (error) {
            console.error('[auth] failed to send password-changed email notification', JSON.stringify({
                userId: user.user_id,
                email: user.email,
                eventKey: 'auth.password.changed',
            }), error);
        }
        return {
            success: true,
            message: 'Password changed successfully',
        };
    }
    async forgotPassword(input) {
        const user = await authRepository.findByEmail(input.email);
        if (!user?.user_id || !user.email) {
            return {
                success: true,
                message: 'If the account exists, a reset email has been sent.',
            };
        }
        const token = randomBytes(32).toString('hex');
        const tokenHash = this.hashResetToken(token);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
        const resetUrl = this.buildResetPasswordUrl(token);
        await authRepository.invalidatePasswordResetTokensForUser(user.user_id);
        await authRepository.createPasswordResetToken({
            password_reset_token_id: uuidv4(),
            user_id: user.user_id,
            token_hash: tokenHash,
            expires_at: expiresAt,
            created_at: now,
            updateby: SYSTEM_ACTOR,
        });
        try {
            const result = await this.notifications.sendPasswordResetRequested({
                fullName: user.full_name || user.email,
                email: user.email,
                resetUrl,
                expiresInMinutes: 30,
            });
            if (process.env.NODE_ENV !== 'production') {
                console.log('[auth] password-reset-request email notification processed', JSON.stringify({
                    userId: user.user_id,
                    email: user.email,
                    eventKey: 'auth.password.reset.requested',
                    delivered: result.delivered,
                    skipped: result.skipped ?? false,
                    transport: result.transport,
                    referenceId: result.referenceId ?? null,
                }));
            }
        }
        catch (error) {
            console.error('[auth] failed to send password-reset-request email notification', JSON.stringify({
                userId: user.user_id,
                email: user.email,
                eventKey: 'auth.password.reset.requested',
            }), error);
        }
        return {
            success: true,
            message: 'If the account exists, a reset email has been sent.',
        };
    }
    async resetPassword(input) {
        const tokenHash = this.hashResetToken(input.token);
        const resetRecord = await authRepository.findPasswordResetTokenByHash(tokenHash);
        if (!resetRecord || resetRecord.used_at || new Date(resetRecord.expires_at) < new Date()) {
            throw new UnauthorizedError('Invalid or expired reset token.');
        }
        const passwordHash = await hashPassword(input.newPassword);
        await authRepository.updatePassword(resetRecord.user_id, passwordHash);
        await authRepository.markPasswordResetTokenUsed(resetRecord.password_reset_token_id);
        try {
            const result = await this.notifications.sendPasswordChanged({
                fullName: resetRecord.full_name || resetRecord.email || 'SQM User',
                email: resetRecord.email || '',
            });
            if (process.env.NODE_ENV !== 'production') {
                console.log('[auth] password-reset completion email notification processed', JSON.stringify({
                    userId: resetRecord.user_id,
                    email: resetRecord.email,
                    eventKey: 'auth.password.changed',
                    delivered: result.delivered,
                    skipped: result.skipped ?? false,
                    transport: result.transport,
                    referenceId: result.referenceId ?? null,
                }));
            }
        }
        catch (error) {
            console.error('[auth] failed to send password-reset completion email notification', JSON.stringify({
                userId: resetRecord.user_id,
                email: resetRecord.email,
                eventKey: 'auth.password.changed',
            }), error);
        }
        return {
            success: true,
            message: 'Password reset successfully',
        };
    }
    async logout(_refreshToken) {
        return {
            status: 'success',
            message: 'Successfully logged out',
        };
    }
}
export const authService = new AuthService();
