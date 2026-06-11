import { describe, expect, it } from 'vitest';
import { mapRoleAccessPayloadToDb } from '../../src/modules/masterData/master-data.controller.js';
import { mapRoleAccessRow } from '../../src/modules/masterData/master-data.service.js';

describe('role access contract mapping', () => {
  it('persists every supported role access flag to the legacy ROLE_ACCESS columns', () => {
    const result = mapRoleAccessPayloadToDb(
      'ra-1',
      {
        roleId: 'role-1',
        formId: 'FORM-01',
        description: 'Role access contract test',
        isActive: true,
        permissions: {
          view: true,
          viewList: true,
          add: true,
          edit: false,
          delete: true,
          approve: true,
          check: false,
          response: true,
          multipleApproval: true,
          print: false,
          export: true,
          canAttach: true,
          perSite: true,
          perSupplier: true,
          registrationNotify: true,
          maintenanceNotify: false,
          transactionNotify: true,
          pic: true,
        },
      },
      'user-1',
    );

    expect(result).toMatchObject({
      roleaccess_id: 'ra-1',
      role_id: 'role-1',
      form_id: 'FORM-01',
      roleaccess_desc: 'Role access contract test',
      can_view: 1,
      can_viewlist: 1,
      can_add: 1,
      can_edit: 0,
      can_delete: 1,
      can_approve: 1,
      can_check: 0,
      can_response: 1,
      multiple_approval: 1,
      can_print: 0,
      can_export: 1,
      can_attach: 1,
      per_site: 1,
      per_supplier: 1,
      registration_notify: 1,
      maintenance_notify: 0,
      transaction_notify: 1,
      pic: 1,
      active_flag: 1,
      updateby: 'user-1',
    });
  });

  it('maps every legacy ROLE_ACCESS column back to the canonical API permission payload', () => {
    const result = mapRoleAccessRow({
      roleaccess_id: 'ra-2',
      role_id: 'role-2',
      form_id: 'FORM-02',
      roleaccess_desc: 'Mapped role access',
      active_flag: 1,
      can_view: 1,
      can_viewlist: 1,
      can_add: 0,
      can_edit: 1,
      can_delete: 0,
      can_approve: 1,
      can_check: 1,
      can_response: 1,
      multiple_approval: 1,
      can_print: 0,
      can_export: 1,
      can_attach: 1,
      per_site: 1,
      per_supplier: 1,
      registration_notify: 1,
      maintenance_notify: 0,
      transaction_notify: 1,
      pic: 1,
    });

    expect(result).toEqual({
      id: 'ra-2',
      roleId: 'role-2',
      formId: 'FORM-02',
      description: 'Mapped role access',
      isActive: true,
      permissions: {
        view: true,
        viewList: true,
        add: false,
        edit: true,
        delete: false,
        approve: true,
        check: true,
        response: true,
        multipleApproval: true,
        print: false,
        export: true,
        canAttach: true,
        perSite: true,
        perSupplier: true,
        registrationNotify: true,
        maintenanceNotify: false,
        transactionNotify: true,
        pic: true,
      },
    });
  });
});
