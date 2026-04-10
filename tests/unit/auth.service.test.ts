import { beforeEach, describe, expect, it, vi } from 'vitest';

const authRepositoryMock = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findUserById: vi.fn(),
  updatePassword: vi.fn(),
  createPasswordResetToken: vi.fn(),
  invalidatePasswordResetTokensForUser: vi.fn(),
  findPasswordResetTokenByHash: vi.fn(),
  markPasswordResetTokenUsed: vi.fn(),
  findRoleBasedAccessibleForms: vi.fn(),
  findCurrentUserRoleAccessRecords: vi.fn(),
  findAssignedSqmpAccessibleForms: vi.fn(),
  findAssignedNpiAccessibleForms: vi.fn(),
  findAssignedOgiAccessibleForms: vi.fn(),
  findAssignedMnrAccessibleForms: vi.fn(),
  findAssignedQmqaAccessibleForms: vi.fn(),
  findAssignedQmqaMediaAccessibleForms: vi.fn(),
  findAssignedSqprAccessibleForms: vi.fn(),
  findAssignedFiveM1EAccessibleForms: vi.fn(),
}));

const hashMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

const jwtMock = vi.hoisted(() => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

const notificationMock = vi.hoisted(() => ({
  sendPasswordChanged: vi.fn(),
  sendPasswordResetRequested: vi.fn(),
}));

vi.mock('../../src/modules/auth/auth.repository.js', () => ({
  authRepository: authRepositoryMock,
}));

vi.mock('../../src/shared/utils/hash.js', () => ({
  verifyPassword: hashMock.verifyPassword,
  hashPassword: hashMock.hashPassword,
}));

vi.mock('../../src/shared/utils/jwt.js', () => ({
  generateAccessToken: jwtMock.generateAccessToken,
  generateRefreshToken: jwtMock.generateRefreshToken,
  verifyRefreshToken: jwtMock.verifyRefreshToken,
}));

vi.mock('../../src/shared/notifications/auth-notification.service.js', () => ({
  authNotificationService: notificationMock,
}));

vi.mock('../../src/shared/notifications/email.config.js', () => ({
  getEmailConfig: vi.fn(() => ({
    frontendBaseUrl: 'http://localhost:5000',
    internetBaseUrl: 'https://sqm.example.com',
  })),
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
    authRepositoryMock.findRoleBasedAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findCurrentUserRoleAccessRecords.mockResolvedValue([]);
    authRepositoryMock.updatePassword.mockResolvedValue(undefined);
    authRepositoryMock.createPasswordResetToken.mockResolvedValue(undefined);
    authRepositoryMock.invalidatePasswordResetTokensForUser.mockResolvedValue(undefined);
    authRepositoryMock.findPasswordResetTokenByHash.mockResolvedValue(null);
    authRepositoryMock.markPasswordResetTokenUsed.mockResolvedValue(undefined);
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedNpiAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedOgiAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaMediaAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedSqprAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue([]);
    hashMock.verifyPassword.mockResolvedValue(true);
    hashMock.hashPassword.mockResolvedValue('new-hash');
    jwtMock.generateAccessToken.mockReturnValue('access-token');
    jwtMock.generateRefreshToken.mockReturnValue('refresh-token');
    jwtMock.verifyRefreshToken.mockReturnValue({
      userId: 'user-1',
      roleId: 'role-1',
      iat: Math.floor(new Date('2026-03-12T00:00:00.000Z').getTime() / 1000),
    });
    notificationMock.sendPasswordChanged.mockResolvedValue({
      delivered: true,
      transport: 'smtp',
      referenceId: '<message-id@example.com>',
      subject: 'Password Change Confirmation',
      recipient: 'checker@example.com',
      localUrl: 'http://localhost:5000/auth/login',
      internetUrl: 'https://sqm.example.com/auth/login',
    });
    notificationMock.sendPasswordResetRequested.mockResolvedValue({
      delivered: true,
      transport: 'smtp',
      referenceId: '<message-id@example.com>',
      subject: 'Reset Your SQM Password',
      recipient: 'checker@example.com',
      resetUrl: 'https://sqm.example.com/auth/reset-password?token=test-token',
    });
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
    expect(result.roleAccessRecords).toEqual([]);
  });

  it('merges role-access workflow forms into auth accessibleForms and module menu', async () => {
    authRepositoryMock.findRoleBasedAccessibleForms.mockResolvedValue([
      'OGI-01-01',
      'OGI-01-02',
      'OGI-01-03',
      'OGI-01-04',
      'MNR-12-03',
    ]);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.accessibleForms).toEqual([
      'OGI-01-01',
      'OGI-01-02',
      'OGI-01-03',
      'OGI-01-04',
      'MNR-12-03',
    ]);
    expect(result.userMenu).toEqual(['OGI', 'MNR Tracking']);
  });

  it('includes current-user role access records in the auth payload', async () => {
    authRepositoryMock.findCurrentUserRoleAccessRecords.mockResolvedValue([
      {
        id: 'ra-1',
        roleId: 'role-1',
        formId: 'NPILOT-09-01',
        formName: 'NPILOT-09-01',
        formUrl: '/dashboard/new-parts/new',
        menuGroup: 'NPI Transaction',
        isActive: 1,
        canView: 1,
        canViewList: 1,
        canAdd: 1,
        canEdit: 0,
        canDelete: 0,
        canApprove: 0,
        canCheck: 0,
        canResponse: 1,
        multipleApproval: 1,
        canPrint: 0,
        canExport: 0,
        canAttach: 0,
        perSite: 0,
        perSupplier: 1,
        registrationNotify: 1,
        maintenanceNotify: 0,
        transactionNotify: 1,
        pic: 0,
      },
    ]);

    const service = new AuthService();
    const result = await service.login({
      email: 'checker@example.com',
      password: 'secret',
    });

    expect(result.roleAccessRecords).toEqual([
      expect.objectContaining({
        formId: 'NPILOT-09-01',
        canAdd: 1,
        canView: 1,
        canResponse: 1,
        multipleApproval: 1,
        perSupplier: 1,
      }),
    ]);
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
    authRepositoryMock.findCurrentUserRoleAccessRecords.mockResolvedValue([
      {
        id: 'ra-2',
        roleId: 'role-1',
        formId: 'SQMP-09-07',
        formName: 'SQMP-09-07',
        formUrl: '/dashboard/sqm-plan/response-await-approval',
        menuGroup: 'SQMP Transaction',
        isActive: 1,
        canView: 1,
        canViewList: 1,
        canAdd: 0,
        canEdit: 1,
        canDelete: 0,
        canApprove: 1,
        canCheck: 1,
        canResponse: 1,
        multipleApproval: 0,
        canPrint: 0,
        canExport: 0,
        canAttach: 0,
        perSite: 0,
        perSupplier: 1,
        registrationNotify: 0,
        maintenanceNotify: 1,
        transactionNotify: 1,
        pic: 0,
      },
    ]);

    const service = new AuthService();
    const result = await service.getCurrentUserContext('user-1');

    expect(authRepositoryMock.findUserById).toHaveBeenCalledWith('user-1');
    expect(result.accessibleForms).toEqual(['SQMP-09-07']);
    expect(result.userMenu).toEqual(['Supplier Quality Management Plan']);
    expect(result.userData.USER_ID).toBe('user-1');
    expect(result.roleAccessRecords).toEqual([
      expect.objectContaining({
        formId: 'SQMP-09-07',
        canApprove: 1,
        canResponse: 1,
        perSupplier: 1,
        maintenanceNotify: 1,
      }),
    ]);
  });

  it('sends a password-changed email after a successful password update', async () => {
    const service = new AuthService();

    const result = await service.changePassword('user-1', {
      currentPassword: 'secret',
      newPassword: 'NewSecret123',
    });

    expect(hashMock.hashPassword).toHaveBeenCalledWith('NewSecret123');
    expect(authRepositoryMock.updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
    expect(notificationMock.sendPasswordChanged).toHaveBeenCalledWith({
      fullName: 'Checker User',
      email: 'checker@example.com',
    });
    expect(result).toEqual({
      success: true,
      message: 'Password changed successfully',
    });
  });

  it('does not fail password change when the notification send fails', async () => {
    notificationMock.sendPasswordChanged.mockRejectedValueOnce(new Error('smtp unavailable'));
    const service = new AuthService();

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'secret',
        newPassword: 'NewSecret123',
      }),
    ).resolves.toEqual({
      success: true,
      message: 'Password changed successfully',
    });

    expect(authRepositoryMock.updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
  });

  it('returns a generic success response for forgot password when no user exists', async () => {
    authRepositoryMock.findByEmail.mockResolvedValueOnce(undefined);
    const service = new AuthService();

    await expect(
      service.forgotPassword({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      success: true,
      message: 'If the account exists, a reset email has been sent.',
    });

    expect(authRepositoryMock.createPasswordResetToken).not.toHaveBeenCalled();
    expect(notificationMock.sendPasswordResetRequested).not.toHaveBeenCalled();
  });

  it('creates a password reset token and sends the reset email for existing users', async () => {
    const service = new AuthService();

    const result = await service.forgotPassword({ email: 'checker@example.com' });

    expect(authRepositoryMock.invalidatePasswordResetTokensForUser).toHaveBeenCalledWith('user-1');
    expect(authRepositoryMock.createPasswordResetToken).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        token_hash: expect.any(String),
      }),
    );
    expect(notificationMock.sendPasswordResetRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Checker User',
        email: 'checker@example.com',
        resetUrl: expect.stringContaining('/auth/reset-password?token='),
        expiresInMinutes: 30,
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'If the account exists, a reset email has been sent.',
    });
  });

  it('resets the password when the reset token is valid', async () => {
    authRepositoryMock.findPasswordResetTokenByHash.mockResolvedValueOnce({
      password_reset_token_id: 'prt-1',
      user_id: 'user-1',
      token_hash: 'hashed-token',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      used_at: null,
      email: 'checker@example.com',
      full_name: 'Checker User',
    });

    const service = new AuthService();
    const result = await service.resetPassword({
      token: 'plain-token',
      newPassword: 'NewSecret123',
    });

    expect(hashMock.hashPassword).toHaveBeenCalledWith('NewSecret123');
    expect(authRepositoryMock.updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
    expect(authRepositoryMock.markPasswordResetTokenUsed).toHaveBeenCalledWith('prt-1');
    expect(notificationMock.sendPasswordChanged).toHaveBeenCalledWith({
      fullName: 'Checker User',
      email: 'checker@example.com',
    });
    expect(result).toEqual({
      success: true,
      message: 'Password reset successfully',
    });
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

  it('issues a rolling access and refresh token pair when a valid refresh token is presented', async () => {
    jwtMock.generateAccessToken.mockReturnValueOnce('rotated-access-token');
    jwtMock.generateRefreshToken.mockReturnValueOnce('rotated-refresh-token');

    const service = new AuthService();
    const result = await service.refreshTokens('refresh-token');

    expect(result).toEqual({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
    });
    expect(authRepositoryMock.findUserById).toHaveBeenCalledWith('user-1');
  });

  it('rejects refresh when the token predates the latest password change', async () => {
    authRepositoryMock.findUserById.mockResolvedValue({
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
      last_update: '2026-03-13T00:00:00.000Z',
      updateby: 'seed',
      last_pasword_change: '2026-03-13T00:00:00.000Z',
      password: 'hashed-password',
    });
    const service = new AuthService();

    await expect(service.refreshTokens('refresh-token')).rejects.toThrow(
      'Refresh token expired. Please sign in again.',
    );
  });

  it('returns a successful logout response without requiring server-side session state', async () => {
    const service = new AuthService();

    await expect(service.logout('refresh-token')).resolves.toEqual({
      status: 'success',
      message: 'Successfully logged out',
    });
  });
});
