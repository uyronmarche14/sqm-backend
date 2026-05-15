import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findPlanByIdMock,
  createRecordMock,
} = vi.hoisted(() => ({
  findPlanByIdMock: vi.fn(),
  createRecordMock: vi.fn(),
}));

vi.mock('../ssi.repository.js', () => ({
  ssiRepository: {
    findPlanById: findPlanByIdMock,
    executeTransaction: vi.fn(),
    insertPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    findAllPlans: vi.fn(),
  },
}));

vi.mock('../records/ssi-record-command.service.js', () => ({
  ssiRecordCommandService: {
    create: createRecordMock,
  },
}));

import { ssiPlanService } from '../plans/ssi-plan.service.js';

describe('SsiPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a record from a plan using inherited plan defaults', async () => {
    findPlanByIdMock.mockResolvedValue({
      ssi_plan_id: 'plan-1',
      control_no: 'PLN-SSI-001',
      mfg_site_id: 'site-1',
      site_name: 'Site One',
      supplier_id: 'supplier-1',
      supplier_name: 'Supplier One',
      category_family: 'QUALIFICATION',
      audit_type: 'SSI Qualification',
      scheduled_date: new Date('2026-05-14T00:00:00.000Z'),
      sqe_pic_id: 'sqe-1',
      sqe_pic_name: 'SQE One',
      remarks: 'Planned remark',
      request_status: 'PLANNED',
      linked_record_id: null,
      created_date: new Date('2026-05-01T00:00:00.000Z'),
      last_update: new Date('2026-05-01T00:00:00.000Z'),
      updateby: 'sqe-1',
      cancel_remarks: null,
      record_status: null,
    });
    createRecordMock.mockResolvedValue({ id: 'record-1' });

    await ssiPlanService.createRecordFromPlan(
      'plan-1',
      { userId: 'user-1', roleId: 'role-1', roleName: 'SQE', supplierIds: [] },
      { remarks: 'Override remark' },
    );

    expect(createRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      expect.objectContaining({
        scheduleId: 'plan-1',
        controlNo: 'PLN-SSI-001',
        mfgSiteId: 'site-1',
        supplierId: 'supplier-1',
        categoryFamily: 'QUALIFICATION',
        remarks: 'Override remark',
      }),
      { scheduleId: 'plan-1', inheritedControlNo: 'PLN-SSI-001' },
    );
  });
});
