import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findRoleById: vi.fn(),
}));

const rolePermissionUtilsMock = vi.hoisted(() => ({
  hasAnyRolePermissionForForms: vi.fn(),
  hasRolePermission: vi.fn(),
}));

vi.mock('../../src/modules/users/user.repository.js', () => ({
  userRepository: userRepositoryMock,
}));

vi.mock('../../src/shared/utils/role-permission.utils.js', () => ({
  hasAnyRolePermissionForForms: rolePermissionUtilsMock.hasAnyRolePermissionForForms,
  hasRolePermission: rolePermissionUtilsMock.hasRolePermission,
}));

import {
  validateApprover,
  validateChecker,
} from '../../src/shared/utils/assignment-validation.utils.js';

describe('assignment validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userRepositoryMock.findById.mockResolvedValue({
      user_id: 'user-1',
      active_flag: 1,
      role_id: 'role-1',
    });
    userRepositoryMock.findRoleById.mockResolvedValue({
      role_name: 'SQE_ENGINEER',
    });
    rolePermissionUtilsMock.hasRolePermission.mockResolvedValue(false);
    rolePermissionUtilsMock.hasAnyRolePermissionForForms.mockResolvedValue(false);
  });

  it('rejects checker assignments that do not have form-scoped permission coverage', async () => {
    await expect(validateChecker('user-1', 'SQMP-09-03')).rejects.toThrow(
      'Selected checker does not have check permission for SQMP-09-03 or a compatible form.',
    );

    expect(rolePermissionUtilsMock.hasAnyRolePermissionForForms).toHaveBeenCalledWith(
      'role-1',
      ['check'],
      expect.arrayContaining(['SQMP-09-03']),
    );
  });

  it('accepts approver assignments through compatible alias forms', async () => {
    rolePermissionUtilsMock.hasAnyRolePermissionForForms.mockImplementation(
      async (_roleId: string, actions: string[], formIds: string[]) =>
        formIds.includes('5M1EEvaluationIC-07-21')
        && (
          actions.includes('approve')
          || actions.includes('edit')
          || actions.includes('add')
          || actions.includes('view')
          || actions.includes('viewlist')
        ),
    );

    await expect(
      validateApprover('user-1', '5M1EApprovalSecEnvi-06-17'),
    ).resolves.toBeUndefined();
  });

  it('preserves admin bypass through the centralized admin helper path', async () => {
    userRepositoryMock.findRoleById.mockResolvedValue({
      role_name: 'TIP_ADMIN',
    });

    await expect(validateChecker('user-1', 'SQMP-09-03')).resolves.toBeUndefined();
    expect(rolePermissionUtilsMock.hasAnyRolePermissionForForms).not.toHaveBeenCalled();
  });
});
