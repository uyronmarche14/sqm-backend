import { authService } from './auth.service.js';
export class AuthController {
    /**
     * Handles user login and sets the Refresh Token securely in an HttpOnly cookie
     */
    async login(req, res, next) {
        try {
            const result = await authService.login(req.body);
            // Set Refresh Token as an HttpOnly, Secure cookie
            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
            });
            // Send Exact Legacy Payload Shape
            res.status(200).json({
                success: result.success,
                message: result.message,
                isSupplier: result.isSupplier,
                userData: result.userData,
                accessToken: result.tokens.accessToken,
                mustChangePassword: result.mustChangePassword,
                userMenu: result.userMenu,
                accessibleForms: result.accessibleForms
            });
        }
        catch (error) {
            next(error); // Pass to global Error Handler
        }
    }
    /**
     * Handles logging out by clearing the HttpOnly cookie
     */
    async logout(_req, res, next) {
        try {
            res.clearCookie('refreshToken');
            res.status(200).json({
                status: 'success',
                message: 'Successfully logged out',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export const authController = new AuthController();
