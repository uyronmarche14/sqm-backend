import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findDuplicateSchedule: vi.fn(),
  createRecord: vi.fn(),
  findScheduleById: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

vi.mock('../../training.repository.js', () => ({
  trainingRepository: repositoryMock,
}));

import { trainingRecordCommandService } from '../training-record-command.service.js';

function createPayload() {
  return {
    trainingName: 'SPC Basics',
    trainingDate: '2026-05-20',
    startTime: '09:30',
    endTime: '11:30',
    status: 'PLANNED',
    remarks: 'Bring checklist',
    siteId: 'site-1',
    siteName: 'Batam',
    groupId: 'group-1',
    groupName: 'QA',
    attendees: [
      {
        employeeNo: 'EMP001',
        fullName: 'John Sample',
        status: 'PLANNED',
      },
    ],
  } as any;
}

describe('trainingRecordCommandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findDuplicateSchedule.mockResolvedValue(undefined);
  });

  it('creates a training schedule with attendee child rows', async () => {
    const id = await trainingRecordCommandService.create('user-1', createPayload());

    expect(id).toBeTruthy();
    expect(repositoryMock.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        sqe_training_schedule_id: expect.any(String),
        training_name: 'SPC Basics',
      }),
      [expect.objectContaining({ employee_no: 'EMP001' })],
    );
  });

  it('updates a training schedule and replaces attendee rows', async () => {
    repositoryMock.findScheduleById.mockResolvedValue({
      sqe_training_schedule_id: 'sched-1',
    });

    const id = await trainingRecordCommandService.update('sched-1', 'user-1', createPayload());

    expect(id).toBe('sched-1');
    expect(repositoryMock.updateRecord).toHaveBeenCalledWith(
      'sched-1',
      expect.objectContaining({
        training_name: 'SPC Basics',
      }),
      [expect.objectContaining({ employee_no: 'EMP001' })],
    );
  });

  it('deletes an existing training schedule', async () => {
    repositoryMock.findScheduleById.mockResolvedValue({
      sqe_training_schedule_id: 'sched-1',
    });

    const result = await trainingRecordCommandService.delete('sched-1');

    expect(result).toEqual({ id: 'sched-1' });
    expect(repositoryMock.deleteRecord).toHaveBeenCalledWith('sched-1');
  });
});
