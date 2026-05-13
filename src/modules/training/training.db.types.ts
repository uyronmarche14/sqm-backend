import { Insertable, Selectable, Updateable } from 'kysely';

export interface SqeTrainingScheduleTable {
  sqe_training_schedule_id: string;
  training_name: string;
  training_date: Date | string;
  room: string;
  start_time: number;
  end_time: number;
  status: string | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqeTrainingAttendeesTable {
  sqe_training_attendees_id: string;
  sqe_training_schedule_id: string;
  employee_no: string;
  status: string | null;
  remarks: string | null;
}

export type SqeTrainingSchedule = Selectable<SqeTrainingScheduleTable>;
export type NewSqeTrainingSchedule = Insertable<SqeTrainingScheduleTable>;
export type SqeTrainingScheduleUpdate = Updateable<SqeTrainingScheduleTable>;
export type SqeTrainingAttendee = Selectable<SqeTrainingAttendeesTable>;
export type NewSqeTrainingAttendee = Insertable<SqeTrainingAttendeesTable>;
export type SqeTrainingAttendeeUpdate = Updateable<SqeTrainingAttendeesTable>;
