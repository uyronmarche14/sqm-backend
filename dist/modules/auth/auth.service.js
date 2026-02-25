import { authRepository } from './auth.repository.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import { verifyPassword } from '../../shared/utils/hash.js';
import { generateAccessToken, generateRefreshToken } from '../../shared/utils/jwt.js';
export class AuthService {
    async login(input) {
        // 1. Find User (Fully Typed Result)
        const user = await authRepository.findByUsername(input.username);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }
        // 2. Check Password
        // In a real AD setup, this might be an LDAP verification
        if (!user.password_hash) {
            throw new UnauthorizedError('Invalid account configuration');
        }
        const isValid = await verifyPassword(input.password, user.password_hash);
        if (!isValid) {
            throw new UnauthorizedError('Invalid credentials');
        }
        // 3. Generate Tokens
        const payload = {
            userId: user.user_id,
            roleId: user.RoleID || undefined,
        };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        // 4. Return Data (Without sensitive info)
        return {
            user: {
                id: user.user_id,
                username: user.username,
                fullName: user.full_name,
                roleId: user.RoleID,
            },
            tokens: {
                accessToken,
                refreshToken,
            },
        };
    }
}
export const authService = new AuthService();
