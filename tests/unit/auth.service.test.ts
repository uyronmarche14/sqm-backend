import { beforeEach, describe, expect, it, vi } from 'vitest';

const authRepositoryMock = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findUserById: vi.fn(),
  findAssignedSqmpAccessibleForms: vi.fn(),
  findAssignedNpiAccessibleForms: vi.fn(),
  findAssignedMnrAccessibleForms: vi.fn(),
  findAssignedQmqaAccessibleForms: vi.fn(),
  findAssignedSqprAccessibleForms: vi.fn(),
  findAssignedFiveM1EAccessibleForms: vi.fn(),
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
    authRepositoryMock.findUserById.mockResolvedValue(mockUser);
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedNpiAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedSqprAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue([]);
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

  it('includes NPI accessibleForms and menu when the user is assigned to NPI approval queues', async () => {
    authRepositoryMock.findAssignedNpiAccessibleForms.mockResolvedValue(['NPILOT-09-03']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['NPILOT-09-03']);
    expect(result.userMenu).toEqual(['New Parts Incoming']);
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

    expect(authRepositoryMock.findUserById).toHaveBeenCalledWith('user-1');
    expect(result.accessibleForms).toEqual(['SQMP-09-07']);
    expect(result.userMenu).toEqual(['Supplier Quality Management Plan']);
    expect(result.userData.USER_ID).toBe('user-1');
  });

  it('includes MNR accessibleForms and module menu when the user is assigned to MNR approval queues', async () => {
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue(['MNR-12-10']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['MNR-12-10']);
    expect(result.userMenu).toEqual(['MNR Tracking']);
  });

  it('includes QMQA accessibleForms and module menu when the user is assigned to a QMQA queue', async () => {
    authRepositoryMock.findAssignedQmqaAccessibleForms.mockResolvedValue(['QMQA-05-09']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['QMQA-05-09']);
    expect(result.userMenu).toEqual(['QMQA']);
  });

  it('includes SQPR accessibleForms and module menu when the user is assigned to an SQPR queue', async () => {
    authRepositoryMock.findAssignedSqprAccessibleForms.mockResolvedValue(['SQPR-03-02']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['SQPR-03-02']);
    expect(result.userMenu).toEqual(['SQPR']);
  });

  it('includes MNR issuer response workspace access after supplier-response handoff', async () => {
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue(['MNR-12-09']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['MNR-12-09']);
    expect(result.userMenu).toEqual(['MNR Tracking']);
  });

  it('keeps MNR issuer response workspace access for issuer-owned response review stages', async () => {
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue(['MNR-12-09', 'MNR-12-10']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['MNR-12-09', 'MNR-12-10']);
    expect(result.userMenu).toEqual(['MNR Tracking']);
  });

  it('includes 5M1E accessibleForms and module menu when the user is assigned to a 5M1E queue', async () => {
    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue(['5M1EApprovalSecDes-06-17']);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual(['5M1EApprovalSecDes-06-17']);
    expect(result.userMenu).toEqual(['5M1E']);
  });

  it('refreshes the current user context with updated 5M1E accessibleForms', async () => {
    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue(['5M1EJudgementSec-06-17']);

    const service = new AuthService();
    const result = await service.getCurrentUserContext('user-1');

    expect(result.accessibleForms).toEqual(['5M1EJudgementSec-06-17']);
    expect(result.userMenu).toEqual(['5M1E']);
  });
});
