import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../../src/shared/errors/AppError.js';
import { UserService } from '../../../../src/modules/users/user.service.js';
import type { CreateUserPayload, TestEmailPayload } from '../../../../src/modules/users/user.schema.js';
import type {
  UserCreatedNotificationResult,
  UserNotificationSender,
} from '../../../../src/shared/notifications/account-notification.service.js';

type UserRepositoryMock = {
  findAll: ReturnType<typeof vi.fn>;
  findLookupUsers: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByEmail: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createWithSupplier: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  changePassword: ReturnType<typeof vi.fn>;
  deleteById: ReturnType<typeof vi.fn>;
  findRoleById: ReturnType<typeof vi.fn>;
  checkSiteExists: ReturnType<typeof vi.fn>;
};

function makeRepositoryMock(): UserRepositoryMock {
  return {
    findAll: vi.fn(),
    findLookupUsers: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    createWithSupplier: vi.fn(),
    update: vi.fn(),
    changePassword: vi.fn(),
    deleteById: vi.fn(),
    findRoleById: vi.fn(),
    checkSiteExists: vi.fn(),
  };
}

function makeNotifierMock(): UserNotificationSender {
  return {
    sendUserCreated: vi.fn().mockResolvedValue({
      delivered: true,
      transport: 'file',
      referenceId: '/tmp/emails/message.json',
      subject: 'Account Confirmation',
      recipient: 'qa.user@example.com',
      localUrl: 'http://localhost:5173/auth/login',
      internetUrl: 'http://localhost:5173/auth/login',
    } satisfies UserCreatedNotificationResult),
  };
}

const basePayload: CreateUserPayload = {
  full_name: 'QA User',
  email: 'qa.user@example.com',
  password: 'Temp1234',
  role_id: 'role-1',
  site_id: 'site-1',
  active_flag: 1,
};

describe('UserService.createUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a user and dispatches an account-created notification', async () => {
    const repository = makeRepositoryMock();
    const notifier = makeNotifierMock();
    const createdUser = {
      user_id: 'user-1',
      full_name: basePayload.full_name,
      email: basePayload.email,
      role_id: basePayload.role_id,
      site_id: basePayload.site_id,
    };

    repository.findByEmail.mockResolvedValue(null);
    repository.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    repository.create.mockResolvedValue(createdUser);
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const service = new UserService(repository, notifier);

    const result = await service.createUser(basePayload);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(notifier.sendUserCreated).toHaveBeenCalledWith({
      fullName: 'QA User',
      email: 'qa.user@example.com',
      temporaryPassword: 'Temp1234',
      roleName: 'ENGINEER',
      siteId: 'site-1',
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[users] user-created email notification processed',
      expect.stringContaining('"transport":"file"'),
    );
    expect(result).toEqual(createdUser);
  });

  it('creates supplier-linked users through the supplier transaction and still dispatches notification', async () => {
    const repository = makeRepositoryMock();
    const notifier = makeNotifierMock();
    const createdUser = {
      user_id: 'supplier-user-1',
      full_name: basePayload.full_name,
      email: basePayload.email,
      role_id: basePayload.role_id,
      site_id: basePayload.site_id,
    };

    repository.findByEmail.mockResolvedValue(null);
    repository.findRoleById.mockResolvedValue({ role_name: 'SUPPLIER PIC' });
    repository.createWithSupplier.mockResolvedValue(createdUser);

    const service = new UserService(repository, notifier);

    const result = await service.createUser(basePayload);

    expect(repository.createWithSupplier).toHaveBeenCalledTimes(1);
    expect(repository.create).not.toHaveBeenCalled();
    expect(notifier.sendUserCreated).toHaveBeenCalledTimes(1);
    expect(result).toEqual(createdUser);
  });

  it('does not fail user creation when the notification transport fails', async () => {
    const repository = makeRepositoryMock();
    const notifier = makeNotifierMock();
    const createdUser = {
      user_id: 'user-1',
      full_name: basePayload.full_name,
      email: basePayload.email,
      role_id: basePayload.role_id,
      site_id: basePayload.site_id,
    };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    repository.findByEmail.mockResolvedValue(null);
    repository.findRoleById.mockResolvedValue({ role_name: 'ENGINEER' });
    repository.create.mockResolvedValue(createdUser);
    vi.mocked(notifier.sendUserCreated).mockRejectedValue(new Error('transport failure'));

    const service = new UserService(repository, notifier);

    await expect(service.createUser(basePayload)).resolves.toEqual(createdUser);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('rejects duplicate emails before attempting notification', async () => {
    const repository = makeRepositoryMock();
    const notifier = makeNotifierMock();

    repository.findByEmail.mockResolvedValue({ user_id: 'existing-user' });

    const service = new UserService(repository, notifier);

    await expect(service.createUser(basePayload)).rejects.toThrow(ConflictError);
    expect(notifier.sendUserCreated).not.toHaveBeenCalled();
  });

  it('sends a test email without creating a user record', async () => {
    const repository = makeRepositoryMock();
    const notifier = makeNotifierMock();
    const service = new UserService(repository, notifier);
    const payload: TestEmailPayload = {
      email: 'test@example.com',
      full_name: 'Test User',
      temporary_password: 'Temp1234',
      role_name: 'ENGINEER',
      site_id: 'site-1',
    };

    const result = await service.sendTestEmail(payload);

    expect(notifier.sendUserCreated).toHaveBeenCalledWith({
      fullName: 'Test User',
      email: 'test@example.com',
      temporaryPassword: 'Temp1234',
      roleName: 'ENGINEER',
      siteId: 'site-1',
    });
    expect(repository.create).not.toHaveBeenCalled();
    expect(result.subject).toBe('Account Confirmation');
  });
});
