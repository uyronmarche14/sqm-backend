import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { userRepository } from './user.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { permissionService } from '../../shared/services/permission.service.js';
export class UserService {
    async getAllUsers() {
        return await userRepository.findAll();
    }
    async getUserById(id) {
        const user = await userRepository.findById(id);
        if (!user)
            throw new NotFoundError('User not found');
        return user;
    }
    async createUser(payload) {
        // 1. Check email uniqueness
        const existing = await userRepository.findByEmail(payload.email);
        if (existing)
            throw new ConflictError('Email already exists');
        // 2. Hash password
        const hashedPassword = await bcrypt.hash(payload.password, 10);
        const userId = uuidv4();
        const now = new Date();
        const userData = {
            user_id: userId,
            full_name: payload.full_name,
            email: payload.email,
            password: hashedPassword,
            role_id: payload.role_id,
            site_id: payload.site_id,
            active_flag: payload.active_flag ?? 1,
            creation_date: now,
            last_update: now,
            updateby: 'SYSTEM'
        };
        // 3. Auto-supplier logic
        const roleOpt = await userRepository.findRoleById(payload.role_id);
        const roleName = roleOpt?.role_name || '';
        if (roleName.toUpperCase().includes('SUPPLIER')) {
            const supplierId = uuidv4();
            const linkId = uuidv4();
            return await userRepository.createWithSupplier(userData, {
                supplier_id: supplierId,
                supplier_name: payload.full_name,
                site_id: payload.site_id,
                active_flag: 1,
                last_update: now,
                updateby: 'SYSTEM',
            }, {
                Id: linkId,
                supplier_id: supplierId,
                user_id: userId,
                active_flag: 1,
                last_update: now,
                updatedby: 'SYSTEM',
            });
        }
        return await userRepository.create(userData);
    }
    async updateUser(id, payload) {
        const user = await userRepository.findById(id);
        if (!user)
            throw new NotFoundError('User not found');
        const updateData = {
            last_update: new Date(),
        };
        if (payload.full_name !== undefined)
            updateData.full_name = payload.full_name;
        if (payload.email !== undefined) {
            if (payload.email !== user.email) {
                const existing = await userRepository.findByEmail(payload.email);
                if (existing)
                    throw new ConflictError('Email already exists');
            }
            updateData.email = payload.email;
        }
        if (payload.role_id !== undefined && payload.role_id !== '') {
            const roleOpt = await userRepository.findRoleById(payload.role_id);
            if (roleOpt)
                updateData.role_id = payload.role_id;
        }
        if (payload.site_id !== undefined && payload.site_id !== '') {
            const siteExists = await userRepository.checkSiteExists(payload.site_id);
            if (siteExists)
                updateData.site_id = payload.site_id;
        }
        if (payload.active_flag !== undefined)
            updateData.active_flag = payload.active_flag;
        if (payload.login_flag !== undefined)
            updateData.login_flag = payload.login_flag;
        if (Object.keys(updateData).length === 1)
            return user; // Only last_update is present
        return await userRepository.update(id, updateData);
    }
    async changePassword(id, payload) {
        const user = await userRepository.findById(id);
        if (!user)
            throw new NotFoundError('User not found');
        const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
        await userRepository.changePassword(id, hashedPassword);
    }
    async deleteUser(id) {
        const user = await userRepository.findById(id);
        if (!user)
            throw new NotFoundError('User not found');
        await userRepository.deleteById('user_id', id);
    }
    async getAssignmentCoverage(id, payload) {
        const user = await userRepository.findById(id);
        if (!user)
            throw new NotFoundError('User not found');
        return await permissionService.getAssignmentCoverage(id, payload.assignments);
    }
}
export const userService = new UserService();
