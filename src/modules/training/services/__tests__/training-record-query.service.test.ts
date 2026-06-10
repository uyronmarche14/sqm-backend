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

describe('trainingRecordQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findActorRoleName.mockResolvedValue('Administrator');
    repositoryMock.findUserSiteId.mockResolvedValue(null);
    checkPermissionMock.mockResolvedValue(true);
  });

  it('projects calendar entries from training records', async () => {
    repositoryMock.findSchedules.mockResolvedValue([
      {
        sqe_training_schedule_id: 'sched-1',
        training_name: 'SPC Basics',
        training_date: '2026-05-20',
        room: 'Conf A',
        start_time: 930,
        end_time: 1130,
        status: 'PLANNED',
        remarks: null,
        last_update: '2026-05-13T09:30:00.000Z',
        updateby: 'trainer-1',
        updated_by_name: 'Trainer One',
      },
    ]);
    repositoryMock.findAttendeesByScheduleIds.mockResolvedValue([
      {
        sqe_training_attendees_id: 'att-1',
        sqe_training_schedule_id: 'sched-1',
        employee_no: 'EMP001',
        status: 'PLANNED',
        remarks: null,
      },
    ]);

    const entries = await trainingRecordQueryService.calendar('user-1', { month: '2026-05' });

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'sched-1',
        title: 'SPC Basics',
        controlNo: 'TRN-20260520-SCHED-1',
        attendeeCount: 1,
      }),
    ]);
  });

  it('filters assigned scope to actionable records only', async () => {
    repositoryMock.findSchedules.mockResolvedValue([
      {
        sqe_training_schedule_id: 'sched-1',
        training_name: 'Editable',
        training_date: '2026-05-20',
        room: '',
        start_time: 930,
        end_time: 1130,
        status: 'PLANNED',
        remarks: null,
        last_update: '2026-05-13T09:30:00.000Z',
        updateby: 'trainer-1',
        updated_by_name: 'Trainer One',
      },
      {
        sqe_training_schedule_id: 'sched-2',
        training_name: 'Locked',
        training_date: '2026-05-21',
        room: '',
        start_time: 930,
        end_time: 1130,
        status: 'COMPLETED',
        remarks: null,
        last_update: '2026-05-13T09:30:00.000Z',
        updateby: 'trainer-1',
        updated_by_name: 'Trainer One',
      },
    ]);
    repositoryMock.findAttendeesByScheduleIds.mockResolvedValue([]);

    const records = await trainingRecordQueryService.list('user-1', { assignedToMe: true });

    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe('sched-1');
  });
});
