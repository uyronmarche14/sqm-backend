import { z } from 'zod';
// ==========================================
// 1. Core Model Schemas
// ==========================================
export const UserSchema = z.object({
    user_id: z.string().uuid(),
    full_name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address').nullable(),
    role_id: z.string().nullable(),
    site_id: z.string().nullable(),
    active_flag: z.coerce.number().int().min(0).max(1).nullable(),
    creation_date: z.union([z.string(), z.date()]).nullable(),
    last_pasword_change: z.union([z.string(), z.date()]).nullable(),
    login_flag: z.coerce.number().int().min(0).max(1).nullable(),
    local_user: z.coerce.number().int().min(0).max(1).nullable(),
    updateby: z.string().nullable(),
    last_update: z.union([z.string(), z.date()]).nullable(),
});
// ==========================================
// 2. Request Payload Schemas
// ==========================================
// Create User Payload
export const CreateUserSchema = z.object({
    full_name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role_id: z.string().min(1, 'Role ID is required'),
    site_id: z.string().min(1, 'Site ID is required'),
    active_flag: z.union([z.boolean(), z.number()]).optional().transform(v => v === true || v === 1 ? 1 : 0)
});
// Update User Payload
export const UpdateUserSchema = z.object({
    full_name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role_id: z.string().optional().nullable(),
    site_id: z.string().optional().nullable(),
    active_flag: z.union([z.boolean(), z.number()]).optional().transform(v => typeof v !== 'undefined' ? (v === true || v === 1 ? 1 : 0) : undefined),
    login_flag: z.union([z.boolean(), z.number()]).optional().transform(v => typeof v !== 'undefined' ? (v === true || v === 1 ? 1 : 0) : undefined),
});
// Change Password Payload
export const ChangePasswordSchema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters')
});
export const AssignmentCoverageItemSchema = z.object({
    formId: z.string().min(1, 'Form ID is required'),
    assignmentRole: z.enum(['owner', 'issuer', 'checker', 'approver', 'supplier']),
});
export const AssignmentCoverageRequestSchema = z.object({
    assignments: z.array(AssignmentCoverageItemSchema).min(1).max(10),
});
