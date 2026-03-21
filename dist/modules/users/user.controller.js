import { userService } from './user.service.js';
import { CreateUserSchema, UpdateUserSchema, ChangePasswordSchema, TestEmailSchema, AssignmentCoverageRequestSchema, } from './user.schema.js';
// Internal mapper matching original output shape exactly
// Note: DB column is `last_pasword_change` (legacy typo in DB — single 's')
const mapUserToDto = (user) => ({
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    role_id: user.role_id,
    site_id: user.site_id,
    active_flag: user.active_flag ? 1 : 0,
    creation_date: user.creation_date,
    last_password_change: user.last_pasword_change,
    login_flag: user.login_flag ? 1 : 0,
    local_user: user.local_user ? 1 : 0,
    updateby: user.updateby,
    last_update: user.last_update
});
export const userController = {
    getLookupUsers: async (_req, res, next) => {
        try {
            const users = await userService.getLookupUsers();
            res.json(users);
        }
        catch (error) {
            next(error);
        }
    },
    getAllUsers: async (_req, res, next) => {
        try {
            const users = await userService.getAllUsers();
            res.json(users.map(mapUserToDto));
        }
        catch (error) {
            next(error);
        }
    },
    getUserById: async (req, res, next) => {
        try {
            const user = await userService.getUserById(req.params.id);
            res.json(mapUserToDto(user));
        }
        catch (error) {
            next(error);
        }
    },
    createUser: async (req, res, next) => {
        try {
            const payload = CreateUserSchema.parse(req.body);
            const user = await userService.createUser(payload);
            res.status(201).json(mapUserToDto(user));
        }
        catch (error) {
            next(error);
        }
    },
    testEmail: async (req, res, next) => {
        try {
            const payload = TestEmailSchema.parse(req.body);
            const result = await userService.sendTestEmail(payload);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    },
    updateUser: async (req, res, next) => {
        try {
            const payload = UpdateUserSchema.parse(req.body);
            const user = await userService.updateUser(req.params.id, payload);
            res.json(mapUserToDto(user));
        }
        catch (error) {
            next(error);
        }
    },
    changePassword: async (req, res, next) => {
        try {
            const payload = ChangePasswordSchema.parse(req.body);
            await userService.changePassword(req.params.id, payload);
            res.json({ message: 'Password changed successfully' });
        }
        catch (error) {
            next(error);
        }
    },
    getAssignmentCoverage: async (req, res, next) => {
        try {
            const payload = AssignmentCoverageRequestSchema.parse(req.body);
            const coverage = await userService.getAssignmentCoverage(req.params.id, payload);
            res.json({
                userId: req.params.id,
                assignments: coverage,
            });
        }
        catch (error) {
            next(error);
        }
    },
    deleteUser: async (req, res, next) => {
        try {
            await userService.deleteUser(req.params.id);
            res.json({ message: 'User deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
};
