import { authService } from './auth.service.js';
import { getRefreshCookieClearOptions, getRefreshCookieOptions, REFRESH_COOKIE_NAME, } from './auth.cookies.js';
export class AuthController {
    /**
     * Handles user login and sets the Refresh Token securely in an HttpOnly cookie
     */
    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);
            res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getRefreshCookieOptions());
            res.status(200).json({
                success: result.success,
                message: result.message,
                isSupplier: result.isSupplier,
                userData: result.userData,
                tokens: {
                    accessToken: result.tokens.accessToken,
                },
                mustChangePassword: result.mustChangePassword,
                userMenu: result.userMenu,
                accessibleForms: result.accessibleForms,
                roleAccessRecords: result.roleAccessRecords,
            });
            return;
        }
        catch (error) {
            return next(error); // Pass to global Error Handler
        }
    }
    /**
     * Handles refreshing the access token using the HttpOnly Refresh Token cookie
     */
    async refresh(req, res, next) {
        try {
            const token = req.cookies?.[REFRESH_COOKIE_NAME];
            if (!token) {
                res.status(401).json({ status: 'fail', message: 'No refresh token provided' });
                return;
            }
            const result = await authService.refreshTokens(token);
            res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
            res.status(200).json({
                success: true,
                accessToken: result.accessToken,
            });
            return;
        }
        catch (error) {
            res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());
            return next(error);
        }
    }
    async me(req, res, next) {
        try {
            if (!req.user?.userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await authService.getCurrentUserContext(req.user.userId);
            res.status(200).json(result);
            return;
        }
        catch (error) {
            return next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            if (!req.user?.userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const result = await authService.changePassword(req.user.userId, req.body);
            res.status(200).json(result);
            return;
        }
        catch (error) {
            return next(error);
        }
    }
    async forgotPassword(req, res, next) {
        try {
            const result = await authService.forgotPassword(req.body);
            res.status(200).json(result);
            return;
        }
        catch (error) {
            return next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const result = await authService.resetPassword(req.body);
            res.status(200).json(result);
            return;
        }
        catch (error) {
            return next(error);
        }
    }
    /**
     * Handles logging out by clearing the HttpOnly cookie
     */
    async logout(req, res, next) {
        try {
            const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
            const result = await authService.logout(refreshToken);
            res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());
            res.status(200).json(result);
            return;
        }
        catch (error) {
            return next(error);
        }
    }
}
export const authController = new AuthController();
