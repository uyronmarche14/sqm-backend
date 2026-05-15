import { describe, expect, it } from 'vitest';
import { ssiAccessService } from '../shared/ssi-access.service.js';

describe('SsiAccessService plan visibility', () => {
  it('allows SQE PIC users to read their plans', () => {
    expect(
      ssiAccessService.canReadPlan(
        {
          id: 'plan-1',
          controlNo: 'PLN-001',
          mfgSiteId: 'site-1',
          supplierId: 'supplier-1',
          categoryFamily: 'QUALIFICATION',
          scheduledDate: '2026-05-15',
          sqePicId: 'sqe-1',
          status: 'PLANNED',
        },
        { userId: 'sqe-1', roleId: 'role-1', roleName: 'SQE', supplierIds: [] },
      ),
    ).toBe(true);
  });

  it('allows supplier-linked users to read their supplier plans', () => {
    expect(
      ssiAccessService.canReadPlan(
        {
          id: 'plan-1',
          controlNo: 'PLN-001',
          mfgSiteId: 'site-1',
          supplierId: 'supplier-1',
          categoryFamily: 'QUALIFICATION',
          scheduledDate: '2026-05-15',
          status: 'PLANNED',
        },
        { userId: 'supplier-user-1', roleId: 'role-1', roleName: 'SUPPLIER', supplierIds: ['supplier-1'] },
      ),
    ).toBe(true);
  });

  it('hides plans from unrelated non-admin users', () => {
    expect(
      ssiAccessService.canReadPlan(
        {
          id: 'plan-1',
          controlNo: 'PLN-001',
          mfgSiteId: 'site-1',
          supplierId: 'supplier-1',
          categoryFamily: 'QUALIFICATION',
          scheduledDate: '2026-05-15',
          status: 'PLANNED',
        },
        { userId: 'other-user', roleId: 'role-1', roleName: 'USER', supplierIds: ['supplier-2'] },
      ),
    ).toBe(false);
  });
});
