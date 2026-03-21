import { z } from 'zod';
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Must be a valid email format'),
        password: z.string().min(5, 'Password must be at least 5 characters'),
    }),
});
export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
});
export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required').optional(),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    }),
});
