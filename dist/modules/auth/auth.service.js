import { authRepository } from './auth.repository.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import { verifyPassword } from '../../shared/utils/hash.js';
import { generateAccessToken, generateRefreshToken } from '../../shared/utils/jwt.js';
export class AuthService {
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
        // 4. Return Data (Without sensitive info)
        const isAdmin = user.role_name?.toLowerCase().includes('admin') ? 1 : 0;
        return {
            success: true,
            message: 'Welcome back!',
            isSupplier: false, // Supplier association comes from SUPPLIERSUSER in legacy
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
            tokens: {
                accessToken,
                refreshToken,
            },
            mustChangePassword: user.change_pw ? true : false,
            userMenu: [],
            accessibleForms: []
        };
    }
}
export const authService = new AuthService();
