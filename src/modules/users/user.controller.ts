import { Request, Response } from 'express';
import { userService } from './user.service.js';
import { CreateUserSchema, UpdateUserSchema, ChangePasswordSchema } from './user.schema.js';

// Internal mapper matching original output shape exactly
const mapUserToDto = (user: any) => ({
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
  getAllUsers: async (_req: Request, res: Response) => {
    const users = await userService.getAllUsers();
    res.json(users.map(mapUserToDto));
  },

  getUserById: async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id as string);
    res.json(mapUserToDto(user));
  },

  createUser: async (req: Request, res: Response) => {
    const payload = CreateUserSchema.parse(req.body);
    const user = await userService.createUser(payload);
    res.status(201).json(mapUserToDto(user));
  },

  updateUser: async (req: Request, res: Response) => {
    const payload = UpdateUserSchema.parse(req.body);
    const user = await userService.updateUser(req.params.id as string, payload);
    res.json(mapUserToDto(user));
  },

  changePassword: async (req: Request, res: Response) => {
    const payload = ChangePasswordSchema.parse(req.body);
    await userService.changePassword(req.params.id as string, payload);
    res.json({ message: 'Password changed successfully' });
  },

  deleteUser: async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id as string);
    res.json({ message: 'User deleted successfully' });
  }
};
