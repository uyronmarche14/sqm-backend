import { beforeEach, describe, expect, it, vi } from 'vitest';

const authRepositoryMock = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findUserById: vi.fn(),
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
    authRepositoryMock.findRoleBasedAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findCurrentUserRoleAccessRecords.mockResolvedValue([]);
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedNpiAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedOgiAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaMediaAccessibleForms.mockResolvedValue([]);
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
        canPrint: 0,
        canExport: 0,
        canAttach: 0,
        perSite: 0,
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
        canPrint: 0,
        canExport: 0,
        canAttach: 0,
        perSite: 0,
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
      }),
    ]);
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
