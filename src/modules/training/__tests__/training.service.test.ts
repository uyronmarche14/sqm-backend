import { describe, expect, it } from 'vitest';
import {
  formatTrainingTime,
  mapTrainingRecord,
  parseTrainingAttendeeRemarks,
  parseTrainingScheduleRemarks,
  parseTrainingTime,
  serializeTrainingAttendeeRemarks,
  serializeTrainingScheduleRemarks,
} from '../training.service.js';

describe('training service helpers', () => {
  it('round-trips schedule metadata inside the legacy remarks column', () => {
    const serialized = serializeTrainingScheduleRemarks('Bring projector', {
      siteId: 'site-1',
      siteName: 'Batam',
      trainingProgramId: 'prog-1',
      trainingProgramName: 'Foundations',
      trainerName: 'Alex Trainer',
    });

    const parsed = parseTrainingScheduleRemarks(serialized);
    expect(parsed.remarks).toBe('Bring projector');
    expect(parsed.metadata).toMatchObject({
      siteId: 'site-1',
      siteName: 'Batam',
      trainingProgramId: 'prog-1',
      trainingProgramName: 'Foundations',
      trainerName: 'Alex Trainer',
    });
  });

  it('round-trips attendee metadata inside attendee remarks', () => {
    const serialized = serializeTrainingAttendeeRemarks('Needs laptop', {
      fullName: 'John Sample',
      groupId: 'grp-1',
      siteName: 'Plant 1',
    });

    const parsed = parseTrainingAttendeeRemarks(serialized);
    expect(parsed.remarks).toBe('Needs laptop');
    expect(parsed.metadata).toMatchObject({
      fullName: 'John Sample',
      groupId: 'grp-1',
      siteName: 'Plant 1',
    });
  });

  it('maps schedule rows and attendee rows into the modern training DTO', () => {
    const record = mapTrainingRecord(
      {
        sqe_training_schedule_id: 'sched-1',
        training_name: 'SPC Basics',
        training_date: '2026-05-20',
        room: 'Conf A',
        start_time: 930,
        end_time: 1130,
        status: 'completed',
        remarks: serializeTrainingScheduleRemarks('Bring checklist', {
          siteId: 'site-1',
          siteName: 'Batam',
          title: 'SPC Session',
        }),
        last_update: '2026-05-13T09:30:00.000Z',
        updateby: 'trainer-1',
        updated_by_name: 'Trainer One',
      },
      [
        {
          sqe_training_attendees_id: 'att-1',
          sqe_training_schedule_id: 'sched-1',
          employee_no: 'EMP001',
          status: 'completed',
          remarks: serializeTrainingAttendeeRemarks('Passed', {
            fullName: 'John Sample',
          }),
        },
        {
          sqe_training_attendees_id: 'att-2',
          sqe_training_schedule_id: 'sched-1',
          employee_no: 'EMP002',
          status: 'attended',
          remarks: null,
        },
      ],
      { canEdit: true, canDelete: true },
    );

    expect(record).toMatchObject({
      id: 'sched-1',
      controlNo: 'TRN-20260520-SCHED-1',
      title: 'SPC Session',
      siteId: 'site-1',
      siteName: 'Batam',
      trainingName: 'SPC Basics',
      trainingDate: '2026-05-20',
      startTime: '09:30',
      endTime: '11:30',
      attendeeCount: 2,
      attendedCount: 2,
      completedCount: 1,
      achievementRate: 50,
      status: 'COMPLETED',
      updatedBy: 'Trainer One',
    });
    expect(record.availableActions).toEqual(['view']);
    expect(record.attendees[0]?.fullName).toBe('John Sample');
    expect(record.attendees[1]?.fullName).toBe('EMP002');
  });

  it('converts between time strings and legacy integer time storage', () => {
    expect(parseTrainingTime('08:45')).toBe(845);
    expect(formatTrainingTime(845)).toBe('08:45');
    expect(formatTrainingTime(0)).toBeUndefined();
  });
});
