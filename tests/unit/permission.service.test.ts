import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  selectFrom: vi.fn(),
}));

const authRepositoryMock = vi.hoisted(() => ({
  findAssignedSqmpAccessibleForms: vi.fn(),
  findAssignedNpiAccessibleForms: vi.fn(),
  findAssignedMnrAccessibleForms: vi.fn(),
  findAssignedQmqaAccessibleForms: vi.fn(),
  findAssignedSqprAccessibleForms: vi.fn(),
  findAssignedFiveM1EAccessibleForms: vi.fn(),
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
    execute: vi.fn().mockResolvedValue(Array.isArray(result) ? result : result ? [result] : []),
  };

  return query;
}

describe('PermissionService SQMP assigned-form fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRepositoryMock.findAssignedSqmpAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedNpiAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedSqprAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue([]);
  });

  it('allows SQMP create when ROLE_ACCESS stores the form UUID instead of the legacy form code', async () => {
    const userQuery = createQuery({
      role_id: 'role-1',
      role_name: 'ACCESSSS',
    });
    const formsQuery = createQuery([
      { form_id: 'form-uuid-sqmp-new', form_name: 'SQMP-09-01' },
    ]);
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
    expect(formsQuery.where).toHaveBeenCalledWith('form_name', 'in', expect.arrayContaining(['SQMP-09-01']));
  });

  it('allows SQPR create when ROLE_ACCESS stores a compatible legacy form UUID', async () => {
    const userQuery = createQuery({
      role_id: 'role-1',
      role_name: 'ACCESSSS',
    });
    const formsQuery = createQuery([
      { form_id: 'form-uuid-sqpr-new', form_name: 'SQPR-13-01' },
    ]);
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

    const service = new PermissionService();
    const result = await service.checkPermission('issuer-1', 'SQPR-03-01', 'add');

    expect(result).toBe(true);
    expect(formsQuery.where).toHaveBeenCalledWith(
      'form_name',
      'in',
      expect.arrayContaining(['SQPR-03-01', 'SQPR-13-01', 'SFR-05-01']),
    );
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

  it('allows assigned NPI checker access for NPILOT-09-03 check without ROLE_ACCESS', async () => {
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

    authRepositoryMock.findAssignedNpiAccessibleForms.mockResolvedValue(['NPILOT-09-03']);

    const service = new PermissionService();
    const result = await service.checkPermission('checker-1', 'NPILOT-09-03', 'check');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedNpiAccessibleForms).toHaveBeenCalledWith('checker-1');
  });

  it('does not query SQMP assigned access when checking NPI permissions', async () => {
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

    authRepositoryMock.findAssignedNpiAccessibleForms.mockResolvedValue(['NPILOT-09-03']);

    const service = new PermissionService();
    const result = await service.checkPermission('checker-1', 'NPILOT-09-03', 'check');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedSqmpAccessibleForms).not.toHaveBeenCalled();
    expect(authRepositoryMock.findAssignedNpiAccessibleForms).toHaveBeenCalledWith('checker-1');
  });

  it('allows assigned MNR supplier response access for MNR-12-09 edit without ROLE_ACCESS', async () => {
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

    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue(['MNR-12-09']);

    const service = new PermissionService();
    const result = await service.checkPermission('supplier-user-1', 'MNR-12-09', 'edit');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedMnrAccessibleForms).toHaveBeenCalledWith('supplier-user-1');
  });

  it('allows assigned QMQA closure checker access for QMQA-05-09 check without ROLE_ACCESS', async () => {
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

    authRepositoryMock.findAssignedQmqaAccessibleForms.mockResolvedValue(['QMQA-05-09']);

    const service = new PermissionService();
    const result = await service.checkPermission('checker-1', 'QMQA-05-09', 'check');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedQmqaAccessibleForms).toHaveBeenCalledWith('checker-1');
  });

  it('allows assigned SQPR reviewer access for SQPR-03-02 approve without ROLE_ACCESS', async () => {
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

    authRepositoryMock.findAssignedSqprAccessibleForms.mockResolvedValue(['SQPR-03-02']);

    const service = new PermissionService();
    const result = await service.checkPermission('reviewer-1', 'SQPR-03-02', 'approve');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedSqprAccessibleForms).toHaveBeenCalledWith('reviewer-1');
  });

  it('allows assigned 5M1E checker access for 5M1EApprovalSecDes-06-17 check without ROLE_ACCESS', async () => {
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

    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue(['5M1EApprovalSecDes-06-17']);

    const service = new PermissionService();
    const result = await service.checkPermission('mpd-checker-1', '5M1EApprovalSecDes-06-17', 'check');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedFiveM1EAccessibleForms).toHaveBeenCalledWith('mpd-checker-1');
  });

  it('allows assigned 5M1E supplier access for 5M1ESupplier_Submition edit without ROLE_ACCESS', async () => {
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

    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue(['5M1ESupplier_Submition']);

    const service = new PermissionService();
    const result = await service.checkPermission('supplier-user-1', '5M1ESupplier_Submition', 'edit');

    expect(result).toBe(true);
  });

  it('does not grant unrelated add access from assigned 5M1E queue access', async () => {
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

    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue(['5M1ESupplier_Submition']);

    const service = new PermissionService();
    const result = await service.checkPermission('supplier-user-1', '5M1ESupplier_Submition', 'add');

    expect(result).toBe(false);
  });

  it('allows 5M1E release owner access for 5M1EJudgementSec-06-17 release without ROLE_ACCESS', async () => {
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

    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue(['5M1EJudgementSec-06-17']);

    const service = new PermissionService();
    const result = await service.checkPermission('release-owner-1', '5M1EJudgementSec-06-17', 'release');

    expect(result).toBe(true);
  });
});
