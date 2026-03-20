import { authRepository } from './auth.repository.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import { verifyPassword } from '../../shared/utils/hash.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.js';
import { getLegacyFormMapping, getModulePermissionManifest } from '@sqm/permissions-contract';
import { getAssignedWorkflowAccessibleForms } from './assigned-form-access.js';
export class AuthService {
    buildAuthContextResponse(user, accessibleForms) {
        console.log('🏗️ [Auth] Building auth context for accessible forms:', accessibleForms);
        const userMenuSet = new Set();
        for (const formCode of accessibleForms) {
            const mapping = getLegacyFormMapping(formCode);
            if (!mapping) {
                console.warn('⚠️ [Auth] No mapping found for form code:', formCode);
                continue;
            }
            const menuLabel = getModulePermissionManifest(mapping.module).menuLabel;
            console.log('✅ [Auth] Form code:', formCode, '→ Module:', mapping.module, '→ Menu Label:', menuLabel);
            userMenuSet.add(menuLabel);
        }
        const userMenu = Array.from(userMenuSet);
        console.log('📋 [Auth] Final userMenu:', userMenu);
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
        const payload = {
            userId: decoded.userId,
            roleId: decoded.roleId,
        };
        const accessToken = generateAccessToken(payload);
        const newRefreshToken = generateRefreshToken(payload);
        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    }
    async login(input) {
        // 1. Find User (Fully Typed Result)
        const user = await authRepository.findByEmail(input.email);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }
        // 2. Check Password
        // In a real AD setup, this might be an LDAP verification
        if (!user.password) {
            throw new UnauthorizedError('Invalid account configuration');
        }
        const isValid = await verifyPassword(input.password, user.password);
        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials');
        }
        // 3. Generate Tokens
        const payload = {
            userId: user.user_id,
            roleId: user.role_id || undefined,
        };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        const accessibleForms = await this.buildAccessibleForms(user.user_id);
        const authContext = this.buildAuthContextResponse(user, accessibleForms);
        return {
            success: true,
            message: 'Welcome back!',
            isSupplier: authContext.isSupplier,
            userData: authContext.userData,
            tokens: {
                accessToken,
                refreshToken,
            },
            mustChangePassword: user.change_pw ? true : false,
            userMenu: authContext.userMenu,
            accessibleForms: authContext.accessibleForms,
        };
    }
    async getCurrentUserContext(userId) {
        const user = await authRepository.findUserById(userId);
        if (!user) {
            throw new UnauthorizedError('Invalid session');
        }
        const accessibleForms = await this.buildAccessibleForms(user.user_id);
        const authContext = this.buildAuthContextResponse(user, accessibleForms);
        return {
            success: true,
            message: 'User context refreshed',
            isSupplier: authContext.isSupplier,
            userData: authContext.userData,
            userMenu: authContext.userMenu,
            accessibleForms: authContext.accessibleForms,
        };
    }
}
export const authService = new AuthService();
