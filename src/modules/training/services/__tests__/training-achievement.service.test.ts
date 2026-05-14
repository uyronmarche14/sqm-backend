import { beforeEach, describe, expect, it, vi } from 'vitest';

const findSchedulesMock = vi.hoisted(() => vi.fn());
const materializeRecordsMock = vi.hoisted(() => vi.fn());

vi.mock('../../training.repository.js', () => ({
  trainingRepository: {
    findSchedules: findSchedulesMock,
  },
}));

vi.mock('../training-record-query.service.js', () => ({
  trainingRecordQueryService: {
    materializeRecords: materializeRecordsMock,
  },
}));

import { trainingAchievementService } from '../training-achievement.service.js';

describe('trainingAchievementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSchedulesMock.mockResolvedValue([]);
  });

  it('returns backend-owned aggregate metrics with filtered records', async () => {
    materializeRecordsMock.mockResolvedValue([
      {
        id: 'sched-1',
        status: 'COMPLETED',
        trainingDate: '2026-05-20',
        title: 'SPC',
        trainingName: 'SPC',
        controlNo: 'TRN-1',
        attendees: [],
        attendeeCount: 10,
        attendedCount: 8,
        completedCount: 7,
        availableActions: ['view'],
      },
      {
        id: 'sched-2',
        status: 'PLANNED',
        trainingDate: '2026-05-21',
        title: 'MSA',
        trainingName: 'MSA',
        controlNo: 'TRN-2',
        attendees: [],
        attendeeCount: 5,
        attendedCount: 0,
        completedCount: 0,
        availableActions: ['view'],
      },
    ]);

    const result = await trainingAchievementService.getAchievement('user-1', { month: '2026-05' });

    expect(result.records).toHaveLength(2);
    expect(result.metrics).toEqual({
      totalSessions: 2,
      completedSessions: 1,
      activeSessions: 1,
      totalAttendees: 15,
      attendedAttendees: 8,
      completedAttendees: 7,
      attendanceRate: 53,
    });
  });
});
