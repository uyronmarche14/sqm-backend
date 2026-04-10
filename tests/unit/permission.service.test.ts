import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  selectFrom: vi.fn(),
}));

const authRepositoryMock = vi.hoisted(() => ({
  findAssignedSqmpAccessibleForms: vi.fn(),
  findAssignedNpiAccessibleForms: vi.fn(),
  findAssignedOgiAccessibleForms: vi.fn(),
  findAssignedMnrAccessibleForms: vi.fn(),
  findAssignedQmqaAccessibleForms: vi.fn(),
  findAssignedQmqaMediaAccessibleForms: vi.fn(),
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
    authRepositoryMock.findAssignedOgiAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedMnrAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedQmqaMediaAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedSqprAccessibleForms.mockResolvedValue([]);
    authRepositoryMock.findAssignedFiveM1EAccessibleForms.mockResolvedValue([]);
  });

  it('treats non-exact admin role names as admin overrides', async () => {
    const userQuery = createQuery({
      role_id: 'role-admin',
      role_name: 'Regional Tip Admin',
    });

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();
    const result = await service.checkPermission('admin-1', 'MNR-12-03', 'approve');

    expect(result).toBe(true);
  });

  it('allows submit when ROLE_ACCESS grants edit but not add', async () => {
    const userQuery = createQuery({
      role_id: 'role-issuer',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery([
      { form_id: 'form-uuid-qmqa-response', form_name: 'QMQA-05-08' },
    ]);
    const permissionQuery = createQuery([
      {
        form_id: 'form-uuid-qmqa-response',
        active_flag: 1,
        can_add: 0,
        can_edit: 1,
      },
    ]);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();
    const result = await service.checkPermission('issuer-1', 'QMQA-05-08', 'submit');

    expect(result).toBe(true);
  });

  it('aggregates matching ROLE_ACCESS records instead of taking only the first row', async () => {
    const userQuery = createQuery({
      role_id: 'role-checker',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery([
      { form_id: 'legacy-qmqa-approval', form_name: 'QMQA-05-03' },
    ]);
    const permissionQuery = createQuery([
      {
        form_id: 'some-other-compatible-form',
        active_flag: 1,
        can_check: 0,
        can_approve: 0,
      },
      {
        form_id: 'legacy-qmqa-approval',
        active_flag: 1,
        can_check: 1,
        can_approve: 0,
      },
    ]);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();
    const result = await service.checkPermission('checker-1', 'QMQA-05-03', 'check');

    expect(result).toBe(true);
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

  it('allows 5M1E create when ROLE_ACCESS stores the new-form UUID instead of the legacy form code', async () => {
    const userQuery = createQuery({
      role_id: 'role-creator',
      role_name: 'TIP_APPROVER_5M1E',
    });
    const formsQuery = createQuery([
      { form_id: 'form-uuid-5m1e-new', form_name: '5M1EMAIN-11-01' },
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
    const result = await service.checkPermission('creator-1', '5M1EMAIN-11-01', 'add');

    expect(result).toBe(true);
    expect(formsQuery.where).toHaveBeenCalledWith(
      'form_name',
      'in',
      expect.arrayContaining(['5M1EMAIN-11-01']),
    );
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

  it('allows OGI module list access from assigned forms without ROLE_ACCESS', async () => {
    const userQuery = createQuery({
      role_id: 'role-ogi',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery([]);
    const permissionQuery = createQuery([]);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    authRepositoryMock.findAssignedOgiAccessibleForms.mockResolvedValue(['OGI-01-04']);

    const service = new PermissionService();
    const result = await service.checkModulePermission('ogi-owner-1', 'OGI', 'viewlist');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedOgiAccessibleForms).toHaveBeenCalledWith('ogi-owner-1');
  });

  it('allows QMQA media module list access from role permissions without assignment fallback', async () => {
    const userQuery = createQuery({
      role_id: 'role-media',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery([
      { form_id: 'form-uuid-qmqa-media-draft', form_name: 'QMQA-MEDIA-02' },
    ]);
    const permissionQuery = createQuery({
      form_id: 'form-uuid-qmqa-media-draft',
      can_view: 1,
      can_viewlist: 1,
      can_add: 0,
      can_edit: 0,
      can_delete: 0,
      can_approve: 0,
      can_check: 0,
      can_export: 0,
      can_attach: 0,
    });

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();
    const result = await service.checkModulePermission('media-user-1', 'QMQA_MEDIA', 'viewlist');

    expect(result).toBe(true);
    expect(authRepositoryMock.findAssignedQmqaMediaAccessibleForms).not.toHaveBeenCalled();
  });

  it('reports missing baseline actions when a checker assignment relies on scoped runtime access', async () => {
    const userQuery = createQuery({
      role_id: 'role-checker',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery(undefined);
    const permissionQuery = createQuery([]);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();
    const [coverage] = await service.getAssignmentCoverage('checker-1', [
      { formId: 'SQMP-09-03', assignmentRole: 'checker' },
    ]);

    expect(coverage.assignmentRole).toBe('checker');
    expect(coverage.derivedActions).toEqual(expect.arrayContaining(['view', 'viewlist', 'check', 'reject']));
    expect(coverage.missingBaselineActions).toEqual(expect.arrayContaining(['check', 'reject']));
    expect(coverage.reliesOnAssignment).toBe(true);
  });

  it('reports baseline coverage when role access already grants the assigned approver actions', async () => {
    const userQuery = createQuery({
      role_id: 'role-approver',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery(undefined);
    const permissionQuery = createQuery([
      {
        can_view: 1,
        can_viewlist: 1,
        can_approve: 1,
        can_check: 0,
        can_edit: 1,
        can_add: 0,
        can_delete: 0,
        can_export: 1,
        can_attach: 0,
      },
    ]);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();
    const [coverage] = await service.getAssignmentCoverage('approver-1', [
      { formId: 'SQPR-03-02', assignmentRole: 'approver' },
    ]);

    expect(coverage.baselineActions).toEqual(expect.arrayContaining(['view', 'viewlist', 'approve', 'reject']));
    expect(coverage.missingBaselineActions).toEqual([]);
    expect(coverage.reliesOnAssignment).toBe(false);
  });

  it('does not treat can_view as implicit viewlist access', async () => {
    const userQuery = createQuery({
      role_id: 'role-view-only',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery([
      { form_id: 'form-uuid-sqpr-draft', form_name: 'SQPR-03-01' },
    ]);
    const permissionQuery = createQuery([
      {
        form_id: 'form-uuid-sqpr-draft',
        active_flag: 1,
        can_view: 1,
        can_viewlist: 0,
      },
    ]);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();

    await expect(service.checkModulePermission('viewer-1', 'SQPR', 'view')).resolves.toBe(true);
    await expect(service.checkModulePermission('viewer-1', 'SQPR', 'viewlist')).resolves.toBe(false);
  });

  it('does not treat can_approve as implicit check access', async () => {
    const userQuery = createQuery({
      role_id: 'role-approver',
      role_name: 'ENGINEER',
    });
    const formsQuery = createQuery([
      { form_id: 'form-uuid-qmqa-approval', form_name: 'QMQA-05-03' },
    ]);
    const permissionQuery = createQuery([
      {
        form_id: 'form-uuid-qmqa-approval',
        active_flag: 1,
        can_view: 1,
        can_viewlist: 1,
        can_approve: 1,
        can_check: 0,
      },
    ]);

    dbMock.selectFrom.mockImplementation((table: string) => {
      if (table === 'USERS as u') return userQuery;
      if (table === 'FORMS') return formsQuery;
      if (table === 'ROLE_ACCESS') return permissionQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const service = new PermissionService();

    await expect(service.checkPermission('approver-1', 'QMQA-05-03', 'approve')).resolves.toBe(true);
    await expect(service.checkPermission('approver-1', 'QMQA-05-03', 'check')).resolves.toBe(false);
  });
});
