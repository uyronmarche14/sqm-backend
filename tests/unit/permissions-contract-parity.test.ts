import { describe, expect, it } from 'vitest';
import {
  EMPTY_ROLE_ACCESS_PERMISSIONS,
  ROLE_ACCESS_DB_FIELD_MAP,
  ROLE_ACCESS_PERMISSION_FIELDS,
  ROLE_ACCESS_PERMISSION_PAYLOAD_MAP,
  getAssignmentRoleActions,
  getAssignmentRolesForForm,
  getCompatibleFormCodes,
  getModulePermissionManifest,
  mapRoleAccessPermissions,
  normalizeStageFromManifest,
} from '@sqm/permissions-contract';

describe('permissions contract parity', () => {
  it('keeps every canonical role-access field aligned across the exported maps', () => {
    expect(ROLE_ACCESS_PERMISSION_FIELDS).toEqual([
      'canView',
      'canViewList',
      'canAdd',
      'canEdit',
      'canDelete',
      'canApprove',
      'canCheck',
      'canResponse',
      'multipleApproval',
      'canPrint',
      'canExport',
      'canAttach',
      'perSite',
      'perSupplier',
      'registrationNotify',
      'maintenanceNotify',
      'transactionNotify',
      'pic',
    ]);

    for (const field of ROLE_ACCESS_PERMISSION_FIELDS) {
      expect(ROLE_ACCESS_DB_FIELD_MAP[field]).toBeTypeOf('string');
      expect(ROLE_ACCESS_PERMISSION_PAYLOAD_MAP[field]).toBeTypeOf('string');
      expect(EMPTY_ROLE_ACCESS_PERMISSIONS[field]).toBe(false);
    }
  });

  it('exports assignment-role helpers with compatible-form support', () => {
    expect(getAssignmentRolesForForm('SQMP-09-03')).toEqual(
      expect.arrayContaining(['checker', 'approver']),
    );
    expect(getAssignmentRoleActions('QMQA-05-09', 'issuer')).toEqual(
      expect.arrayContaining(['view', 'viewlist', 'edit', 'submit']),
    );
    expect(getCompatibleFormCodes('5M1EApprovalSecEnvi-06-17')).toContain('5M1EEvaluationIC-07-21');
  });

  it('does not recurse forever across bidirectional 5M1E aliases', () => {
    expect(getAssignmentRoleActions('5M1EMAIN-11-01', 'issuer')).toEqual([]);
    expect(getAssignmentRolesForForm('5M1EMAIN-11-01')).toEqual([]);
  });

  it('keeps manifest stage normalization available through the shared contract', () => {
    const manifest = getModulePermissionManifest('MNR');
    expect(normalizeStageFromManifest(manifest, 'responseawaitapproval')).toBe('RESPONSE_AWAIT_APPROVAL');
  });

  it('maps permission payload flags from nested API payloads consistently', () => {
    expect(
      mapRoleAccessPermissions({
        permissions: {
          view: true,
          response: 1,
          canAttach: 'true',
          perSite: '1',
          maintenanceNotify: 0,
        },
      }),
    ).toMatchObject({
      canView: true,
      canResponse: true,
      canAttach: true,
      perSite: true,
      maintenanceNotify: false,
    });
  });
});
