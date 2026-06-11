import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createRecordFromPlanMock,
  achievementMock,
  lookupsMock,
  reviewMock,
  resolveActorContextMock,
} = vi.hoisted(() => ({
  createRecordFromPlanMock: vi.fn(),
  achievementMock: vi.fn(),
  lookupsMock: vi.fn(),
  reviewMock: vi.fn(),
  resolveActorContextMock: vi.fn(),
}));

vi.mock('../../../../src/modules/ssi/plans/ssi-plan.service.js', () => ({
  ssiPlanService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    delete: vi.fn(),
    createRecordFromPlan: createRecordFromPlanMock,
  },
}));

vi.mock('../../../../src/modules/ssi/records/ssi-record-query.service.js', () => ({
  ssiRecordQueryService: {
    list: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('../../../../src/modules/ssi/records/ssi-record-command.service.js', () => ({
  ssiRecordCommandService: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../../src/modules/ssi/workflow/ssi-workflow.service.js', () => ({
  ssiWorkflowService: {
    applyAction: vi.fn(),
  },
}));

vi.mock('../../../../src/modules/ssi/responses/ssi-response.service.js', () => ({
  ssiResponseService: {
    save: vi.fn(),
    submit: vi.fn(),
    review: reviewMock,
  },
}));

vi.mock('../../../../src/modules/ssi/reports/ssi-report.service.js', () => ({
  ssiReportService: {
    search: vi.fn(),
    achievement: achievementMock,
    reports: vi.fn(),
    calendar: vi.fn(),
  },
}));

vi.mock('../../../../src/modules/ssi/lookups/ssi-lookup.service.js', () => ({
  ssiLookupService: {
    getLookups: lookupsMock,
  },
}));

vi.mock('../../../../src/modules/ssi/artifacts/ssi-artifact.service.js', () => ({
  ssiArtifactService: {
    generateCertificate: vi.fn(),
  },
}));

vi.mock('../../../../src/modules/ssi/shared/ssi-access.service.js', () => ({
  ssiAccessService: {
    resolveActorContext: resolveActorContextMock,
  },
}));

import { ssiController } from '../../../../src/modules/ssi/ssi.controller.js';

describe('SsiController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveActorContextMock.mockResolvedValue({
      userId: 'user-1',
      roleId: 'role-1',
      roleName: 'SQE',
      supplierIds: [],
    });
  });

  it('creates records from plans using the resolved actor context', async () => {
    createRecordFromPlanMock.mockResolvedValue({ id: 'record-1' });
    const req = {
      params: { id: 'plan-1' },
      body: {
        payload: JSON.stringify({
          categoryFamily: 'QUALIFICATION',
          mfgSiteId: 'site-1',
          supplierId: 'supplier-1',
          scheduledDate: '2026-05-14',
        }),
      },
      user: { userId: 'user-1', roleId: 'role-1' },
    } as any;
    const res = {
      status: vi.fn(() => ({ json: vi.fn() })),
    } as any;
    const next = vi.fn();

    await ssiController.createRecordFromPlan(req, res, next);

    expect(createRecordFromPlanMock).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({ userId: 'user-1' }),
      expect.objectContaining({
        categoryFamily: 'QUALIFICATION',
        mfgSiteId: 'site-1',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns backend-owned achievement payloads unchanged', async () => {
    achievementMock.mockResolvedValue({
      records: [],
      metrics: { totalRecords: 0, passedRecords: 0, failedRecords: 0, pendingRecords: 0, issuedRecords: 0, closedRecords: 0 },
    });
    const req = {
      query: { category: 'QUALIFICATION' },
      user: { userId: 'user-1', roleId: 'role-1' },
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await ssiController.achievement(req, res, next);

    expect(achievementMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      { category: 'QUALIFICATION' },
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards response review payloads with outcome and remarks', async () => {
    reviewMock.mockResolvedValue({ id: 'response-1' });
    const req = {
      params: { id: 'record-1' },
      body: { outcome: 'reject', remarks: 'Need revision', payload: { score: 10 } },
      user: { userId: 'user-1', roleId: 'role-1' },
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await ssiController.reviewResponse(req, res, next);

    expect(reviewMock).toHaveBeenCalledWith(
      'record-1',
      expect.objectContaining({ userId: 'user-1' }),
      expect.objectContaining({
        outcome: 'reject',
        remarks: 'Need revision',
      }),
    );
  });

  it('returns lookup payloads through the lightweight endpoint', async () => {
    lookupsMock.mockResolvedValue({ sites: [], suppliers: [], inspectors: [], sqeUsers: [], categories: [] });
    const req = {} as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await ssiController.lookups(req, res, next);

    expect(lookupsMock).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
