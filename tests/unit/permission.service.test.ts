import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  selectFrom: vi.fn(),
}));

const authRepositoryMock = vi.hoisted(() => ({
  findAssignedSqmpAccessibleForms: vi.fn(),
}));

vi.mock('../../src/shared/infrastructure/db.js', () => ({
  db: dbMock,
}));

vi.mock('../../src/modules/auth/auth.repository.js', () => ({
  authRepository: authRepositoryMock,
}));

import { PermissionService } from '../../src/shared/services/permission.service.js';

function createQuery(result: unknown) {
  const query = {
    innerJoin: vi.fn(() => query),
    select: vi.fn(() => query),
    selectAll: vi.fn(() => query),
    where: vi.fn(() => query),
    executeTakeFirst: vi.fn().mockResolvedValue(result),
  };

  return query;
}

describe('PermissionService SQMP assigned-form fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows SQMP create when ROLE_ACCESS stores the form UUID instead of the legacy form code', async () => {
    const userQuery = createQuery({
      role_id: 'role-1',
      role_name: 'ACCESSSS',
    });
    const formsQuery = createQuery({
      form_id: 'form-uuid-sqmp-new',
    });
    const permissionQuery = createQuery({
      can_add: 1,
      can_approve: 0,
    });

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue([]);

    const service = new PermissionService();
    const result = await service.checkPermission('issuer-1', 'SQMP-09-01', 'add');

    expect(result).toBe(true);
    expect(formsQuery.where).toHaveBeenCalledWith('form_name', '=', 'SQMP-09-01');
  });

  it('allows assigned SQMP checker access for SQMP-09-03 check without ROLE_ACCESS', async () => {
    const userQuery = createQuery({
      role_id: 'role-1',
      role_name: 'ACCESSSS',
    });
    const formsQuery = createQuery(undefined);
    const permissionQuery = createQuery(undefined);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue(['SQMP-09-03']);

    const service = new PermissionService();
    const result = await service.checkPermission('checker-1', 'SQMP-09-03', 'check');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedSqmpAccessibleForms).toHaveBeenCalledWith('checker-1');
  });

  it('does not grant unrelated add access from assigned SQMP queue access', async () => {
    const userQuery = createQuery({
      role_id: 'role-1',
      role_name: 'ACCESSSS',
    });
    const formsQuery = createQuery(undefined);
    const permissionQuery = createQuery(undefined);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue(['SQMP-09-03']);

    const service = new PermissionService();
    const result = await service.checkPermission('checker-1', 'SQMP-09-03', 'add');

    expect(result).toBe(false);
  });

  it('allows assigned SQMP supplier response access for SQMP-09-06 edit without ROLE_ACCESS', async () => {
    const userQuery = createQuery({
      role_id: 'role-supplier',
      role_name: 'SUPPLIER',
    });
    const formsQuery = createQuery(undefined);
    const permissionQuery = createQuery(undefined);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue(['SQMP-09-06']);

    const service = new PermissionService();
    const result = await service.checkPermission('supplier-user-1', 'SQMP-09-06', 'edit');

    expect(result).toBe(true);
  });

  it('allows issuer-owned SQMP approved records to issue through SQMP-09-05 without explicit ROLE_ACCESS', async () => {
    const userQuery = createQuery({
      role_id: 'role-issuer',
      role_name: 'TIP_APPROVER_5M1E',
    });
    const formsQuery = createQuery(undefined);
    const permissionQuery = createQuery(undefined);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue(['SQMP-09-04']);

    const service = new PermissionService();
    const result = await service.checkPermission('issuer-1', 'SQMP-09-05', 'issue');

    expect(result).toBe(true);
  });
});
