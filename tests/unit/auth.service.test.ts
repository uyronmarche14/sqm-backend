import { beforeEach, describe, expect, it, vi } from 'vitest';

const authRepositoryMock = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  findAssignedSqmpAccessibleForms: vi.fn(),
}));

const hashMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
}));

const jwtMock = vi.hoisted(() => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('../../src/modules/auth/auth.repository.js', () => ({
  authRepository: authRepositoryMock,
}));

vi.mock('../../src/shared/utils/hash.js', () => ({
  verifyPassword: hashMock.verifyPassword,
}));

vi.mock('../../src/shared/utils/jwt.js', () => ({
  generateAccessToken: jwtMock.generateAccessToken,
  generateRefreshToken: jwtMock.generateRefreshToken,
  verifyRefreshToken: jwtMock.verifyRefreshToken,
}));

import { AuthService } from '../../src/modules/auth/auth.service.js';

describe('AuthService login SQMP assignment access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockUser = {
      user_id: 'user-1',
      role_id: 'role-1',
      role_name: 'ENGINEER',
      full_name: 'Checker User',
      email: 'checker@example.com',
      site_id: 'site-1',
      creation_date: '2026-03-12T00:00:00.000Z',
      active_flag: true,
      change_pw: false,
      local_user: true,
      login_flag: true,
      last_update: '2026-03-12T00:00:00.000Z',
      updateby: 'seed',
      last_pasword_change: '2026-03-12T00:00:00.000Z',
      password: 'hashed-password',
    };
    authRepositoryMock.findByEmail.mockResolvedValue(mockUser);
    authRepositoryMock.findById.mockResolvedValue(mockUser);
    hashMock.verifyPassword.mockResolvedValue(true);
    jwtMock.generateAccessToken.mockReturnValue('access-token');
    jwtMock.generateRefreshToken.mockReturnValue('refresh-token');
  });

  it('includes SQMP accessibleForms and module menu when the user is assigned to SQMP approval queues', async () => {
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue(['SQMP-09-03']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['SQMP-09-03']);
    expect(result.userMenu).toEqual(['Supplier Quality Management Plan']);
  });

  it('keeps SQMP accessibleForms empty when the user has no assigned SQMP approval queues', async () => {
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue([]);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual([]);
    expect(result.userMenu).toEqual([]);
  });

  it('includes SQMP response access when the user belongs to a supplier with active response-stage SQMP records', async () => {
    authRepositoryMock.findByEmail.mockResolvedValue({
      user_id: 'supplier-user-1',
      role_id: 'role-supplier',
      role_name: 'SUPPLIER',
      full_name: 'Supplier User',
      email: 'supplier@example.com',
      site_id: '',
      creation_date: '2026-03-12T00:00:00.000Z',
      active_flag: true,
      change_pw: false,
      local_user: false,
      login_flag: true,
      last_update: '2026-03-12T00:00:00.000Z',
      updateby: 'seed',
      last_pasword_change: '2026-03-12T00:00:00.000Z',
      password: 'hashed-password',
    });
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue(['SQMP-09-06']);

    const service = new AuthService();
    const result = await service.login({
      email: 'supplier@example.com',
      password: 'secret',
    });

    expect(result.isSupplier).toBe(true);
    expect(result.accessibleForms).toEqual(['SQMP-09-06']);
    expect(result.userMenu).toEqual(['Supplier Quality Management Plan']);
  });

  it('refreshes the current user context with updated SQMP accessibleForms', async () => {
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue(['SQMP-09-07']);

    const service = new AuthService();
    const result = await service.getCurrentUserContext('user-1');

    expect(authRepositoryMock.findById).toHaveBeenCalledWith('user-1');
    expect(result.accessibleForms).toEqual(['SQMP-09-07']);
    expect(result.userMenu).toEqual(['Supplier Quality Management Plan']);
    expect(result.userData.USER_ID).toBe('user-1');
  });
});
