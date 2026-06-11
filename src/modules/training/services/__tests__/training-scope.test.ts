import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findSchedules: vi.fn(),
  findAttendeesByScheduleIds: vi.fn(),
  findScheduleById: vi.fn(),
  findUserSiteId: vi.fn(),
  findActorRoleName: vi.fn(),
}));
const checkPermissionMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../shared/services/permission.service.js', () => ({
  permissionService: {
    checkPermission: checkPermissionMock,
  },
}));

vi.mock('../../training.repository.js', () => ({
  trainingRepository: repositoryMock,
}));

import { trainingRecordQueryService } from '../training-record-query.service.js';

function createSchedule(overrides: Record<string, any> = {}) {
  return {
    sqe_training_schedule_id: overrides.id || 'sched-1',
    training_name: overrides.trainingName || 'Training',
    training_date: overrides.date || '2026-05-20',
    room: overrides.room || '',
    start_time: 900,
    end_time: 1700,
    status: overrides.status || 'PLANNED',
    remarks: overrides.remarks || null,
    last_update: '2026-05-13T09:30:00.000Z',
    updateby: overrides.updateby || 'trainer-1',
    updated_by_name: 'Trainer One',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  checkPermissionMock.mockResolvedValue(true);
  repositoryMock.findAttendeesByScheduleIds.mockResolvedValue([]);
});

describe('Training site-scope enforcement', () => {
  it('returns only records matching user site when user has a site', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findUserSiteId.mockResolvedValue('site-alpha');
    repositoryMock.findSchedules.mockResolvedValue([
      createSchedule({ id: 's-1', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-alpha' }) }),
      createSchedule({ id: 's-2', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-beta' }) }),
      createSchedule({ id: 's-3', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-alpha' }) }),
    ]);

    const records = await trainingRecordQueryService.list('user-1', {});

    expect(records).toHaveLength(2);
    expect(records.every((r) => r.siteId === 'site-alpha')).toBe(true);
  });

  it('returns empty array when user has no site assignment', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findUserSiteId.mockResolvedValue(null);
    repositoryMock.findSchedules.mockResolvedValue([
      createSchedule({ id: 's-1', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-alpha' }) }),
    ]);

    const records = await trainingRecordQueryService.list('user-1', {});

    expect(records).toHaveLength(0);
  });

  it('admin user bypasses site filter and sees all records', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('TIP Administrator (Super User)');
    repositoryMock.findSchedules.mockResolvedValue([
      createSchedule({ id: 's-1', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-alpha' }) }),
      createSchedule({ id: 's-2', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-beta' }) }),
    ]);

    const records = await trainingRecordQueryService.list('admin-1', {});

    expect(records).toHaveLength(2);
    expect(repositoryMock.findUserSiteId).not.toHaveBeenCalled();
  });

  it('getById throws NotFoundError for record from another site', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findUserSiteId.mockResolvedValue('site-alpha');
    repositoryMock.findScheduleById.mockResolvedValue(
      createSchedule({
        id: 's-beta',
        remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-beta' }),
      }),
    );

    await expect(
      trainingRecordQueryService.getById('s-beta', 'user-1'),
    ).rejects.toMatchObject({ message: 'Training record not found' });
  });

  it('getById returns record when from same site as user', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findUserSiteId.mockResolvedValue('site-alpha');
    repositoryMock.findScheduleById.mockResolvedValue(
      createSchedule({
        id: 's-alpha',
        remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-alpha' }),
      }),
    );

    const record = await trainingRecordQueryService.getById('s-alpha', 'user-1');

    expect(record).toBeDefined();
    expect(record.id).toBe('s-alpha');
  });

  it('search respects site filter', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findUserSiteId.mockResolvedValue('site-alpha');
    repositoryMock.findSchedules.mockResolvedValue([
      createSchedule({ id: 's-1', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-alpha' }) }),
      createSchedule({ id: 's-2', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-beta' }) }),
    ]);

    const records = await trainingRecordQueryService.search('user-1', { keyword: '' });

    expect(records).toHaveLength(1);
    expect(records[0].siteId).toBe('site-alpha');
  });

  it('records without siteId in metadata are excluded from non-admin results', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findUserSiteId.mockResolvedValue('site-alpha');
    repositoryMock.findSchedules.mockResolvedValue([
      createSchedule({ id: 's-1', remarks: null }),
      createSchedule({ id: 's-2', remarks: JSON.stringify({ __sqmTrainingScheduleEnvelope: 1, siteId: 'site-alpha' }) }),
    ]);

    const records = await trainingRecordQueryService.list('user-1', {});

    expect(records).toHaveLength(1);
    expect(records[0].siteId).toBe('site-alpha');
  });
});
