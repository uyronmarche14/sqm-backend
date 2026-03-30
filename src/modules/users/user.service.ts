import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { userRepository } from './user.repository.js';
import {
  CreateUserPayload,
  UpdateUserPayload,
  ChangePasswordPayload,
  TestEmailPayload,
  AssignmentCoverageRequestPayload,
  LookupUsersQueryPayload,
} from './user.schema.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { permissionService } from '../../shared/services/permission.service.js';
import { roleQualifiesForAssignment } from '../../shared/utils/assignment-validation.utils.js';
import { isAdminRole } from '../../shared/utils/admin.utils.js';
import {
  accountNotificationService,
  type UserCreatedNotificationInput,
  type UserCreatedNotificationResult,
  type UserNotificationSender,
} from '../../shared/notifications/account-notification.service.js';

type UserRepositoryContract = Pick<
  typeof userRepository,
  | 'findAll'
  | 'findLookupUsers'
  | 'findById'
  | 'findByEmail'
  | 'create'
  | 'createWithSupplier'
  | 'update'
  | 'changePassword'
  | 'deleteById'
  | 'findRoleById'
  | 'checkSiteExists'
>;

export class UserService {
  constructor(
    private readonly repository: UserRepositoryContract = userRepository,
    private readonly notifications: UserNotificationSender = accountNotificationService,
  ) {}

  async getAllUsers() {
    return await this.repository.findAll();
  }

  async getLookupUsers(filters?: LookupUsersQueryPayload) {
    const users = await this.repository.findLookupUsers();
    const formId = filters?.formId;
    const assignmentRole = filters?.assignmentRole;

    if (!formId || !assignmentRole) {
      return users;
    }

    const qualificationByRoleId = new Map<string, Promise<boolean>>();

    const filteredUsers = await Promise.all(
      users.map(async (user) => {
        const isActive = user.active_flag === true || user.active_flag === 1;
        if (!isActive) {
          return null;
        }

        if (isAdminRole(user.role_name)) {
          return user;
        }

        if (!user.role_id) {
          return null;
        }

        if (!qualificationByRoleId.has(user.role_id)) {
          qualificationByRoleId.set(
            user.role_id,
            roleQualifiesForAssignment(user.role_id, assignmentRole, [formId]),
          );
        }

        const isQualified = await qualificationByRoleId.get(user.role_id)!;
        return isQualified ? user : null;
      }),
    );

    return filteredUsers.filter(
      (user): user is Exclude<(typeof filteredUsers)[number], null> => user !== null,
    );
  }

  async getUserById(id: string) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  private async sendUserCreatedNotification(
    userId: string,
    input: UserCreatedNotificationInput,
  ): Promise<UserCreatedNotificationResult | null> {
    try {
      const result = await this.notifications.sendUserCreated(input);

      console.log(
        '[users] user-created email notification processed',
        JSON.stringify({
          userId,
          email: input.email,
          eventKey: 'auth.registration.notification',
          delivered: result.delivered,
          skipped: result.skipped ?? false,
          transport: result.transport,
          referenceId: result.referenceId ?? null,
        }),
      );

      return result;
    } catch (error) {
      console.error(
        '[users] failed to send user-created email notification',
        JSON.stringify({
          userId,
          email: input.email,
          eventKey: 'auth.registration.notification',
        }),
        error,
      );
      return null;
    }
  }

  async sendTestEmail(payload: TestEmailPayload) {
    return this.notifications.sendUserCreated({
      fullName: payload.full_name,
      email: payload.email,
      temporaryPassword: payload.temporary_password,
      roleName: payload.role_name,
      siteId: payload.site_id,
    });
  }

  async createUser(payload: CreateUserPayload) {
    // 1. Check email uniqueness
    const existing = await this.repository.findByEmail(payload.email);
    if (existing) throw new ConflictError('Email already exists');

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
    const roleOpt = await this.repository.findRoleById(payload.role_id);
    const roleName = roleOpt?.role_name || '';

    let createdUser;

    if (roleName.toUpperCase().includes('SUPPLIER')) {
      const supplierId = uuidv4();
      const linkId = uuidv4();

      createdUser = await this.repository.createWithSupplier(
        userData,
        {
          supplier_id: supplierId,
          supplier_name: payload.full_name,
          site_id: payload.site_id,
          active_flag: 1,
          last_update: now,
          updateby: 'SYSTEM',
        },
        {
          Id: linkId,
          supplier_id: supplierId,
          user_id: userId,
          active_flag: 1,
          last_update: now,
          updatedby: 'SYSTEM',
        }
      );
    } else {
      createdUser = await this.repository.create(userData);
    }

    await this.sendUserCreatedNotification(createdUser.user_id, {
      fullName: payload.full_name,
      email: payload.email,
      temporaryPassword: payload.password,
      roleName: roleName || null,
      siteId: payload.site_id,
    });

    return createdUser;
  }

  async updateUser(id: string, payload: UpdateUserPayload) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    const updateData: any = {
      last_update: new Date(),
    };

    if (payload.full_name !== undefined) updateData.full_name = payload.full_name;
    if (payload.email !== undefined) {
      if (payload.email !== user.email) {
        const existing = await this.repository.findByEmail(payload.email);
        if (existing) throw new ConflictError('Email already exists');
      }
      updateData.email = payload.email;
    }

    if (payload.role_id !== undefined && payload.role_id !== '') {
       const roleOpt = await this.repository.findRoleById(payload.role_id!);
       if (roleOpt) updateData.role_id = payload.role_id;
    }

    if (payload.site_id !== undefined && payload.site_id !== '') {
       const siteExists = await this.repository.checkSiteExists(payload.site_id!);
       if (siteExists) updateData.site_id = payload.site_id;
    }

    if (payload.active_flag !== undefined) updateData.active_flag = payload.active_flag;
    if (payload.login_flag !== undefined) updateData.login_flag = payload.login_flag;

    if (Object.keys(updateData).length === 1) return user; // Only last_update is present

    return await this.repository.update(id, updateData);
  }

  async changePassword(id: string, payload: ChangePasswordPayload) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
    await this.repository.changePassword(id, hashedPassword);
  }

  async deleteUser(id: string) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    await this.repository.deleteById('user_id', id);
  }

  async getAssignmentCoverage(id: string, payload: AssignmentCoverageRequestPayload) {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    return await permissionService.getAssignmentCoverage(id, payload.assignments);
  }
}

export const userService = new UserService();
