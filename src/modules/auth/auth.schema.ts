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

// Infer TS Types from Zod
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
