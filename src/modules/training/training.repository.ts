import { sql } from 'kysely';
import { db } from '../../shared/infrastructure/db.js';
import type {
  NewSqeTrainingAttendee,
  NewSqeTrainingSchedule,
  SqeTrainingAttendee,
  SqeTrainingSchedule,
  SqeTrainingScheduleUpdate,
} from './training.db.types.js';

export interface TrainingScheduleRow extends SqeTrainingSchedule {
  updated_by_name?: string | null;
}

export interface TrainingAttendeeRow extends SqeTrainingAttendee {}

export interface TrainingScheduleQuery {
  id?: string;
  statuses?: string[];
  date?: string;
  month?: string;
  trainingDateFrom?: string;
  trainingDateTo?: string;
  keyword?: string;
}

function getMonthBounds(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export class TrainingRepository {
  private buildScheduleQuery(filters: TrainingScheduleQuery = {}) {
    let query = db
      .selectFrom('SQE_TRAINING_SCHEDULE as schedule')
      .leftJoin('USERS as updater', 'schedule.updateby', 'updater.user_id')
      .selectAll('schedule')
      .select([
        sql<string | null>`${sql.ref('updater.full_name')}`.as('updated_by_name'),
      ]);

    if (filters.id) {
      query = query.where('schedule.sqe_training_schedule_id', '=', filters.id);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.where(sql`UPPER(${sql.ref('schedule.status')})`, 'in', filters.statuses);
    }

    if (filters.date) {
      query = query.where(sql`CONVERT(date, ${sql.ref('schedule.training_date')})`, '=', filters.date);
    }

    if (filters.month) {
      const bounds = getMonthBounds(filters.month);
      query = query
        .where(sql`CONVERT(date, ${sql.ref('schedule.training_date')})`, '>=', bounds.start)
        .where(sql`CONVERT(date, ${sql.ref('schedule.training_date')})`, '<', bounds.end);
    }

    if (filters.trainingDateFrom) {
      query = query.where(
        sql`CONVERT(date, ${sql.ref('schedule.training_date')})`,
        '>=',
        filters.trainingDateFrom,
      );
    }

    if (filters.trainingDateTo) {
      query = query.where(
        sql`CONVERT(date, ${sql.ref('schedule.training_date')})`,
        '<=',
        filters.trainingDateTo,
      );
    }

    if (filters.keyword) {
      const normalizedKeyword = `%${filters.keyword.toLowerCase()}%`;
      query = query.where((eb) =>
        eb.or([
          eb(sql`LOWER(${sql.ref('schedule.training_name')})`, 'like', normalizedKeyword),
          eb(sql`LOWER(${sql.ref('schedule.room')})`, 'like', normalizedKeyword),
          eb(sql`LOWER(COALESCE(${sql.ref('schedule.remarks')}, ''))`, 'like', normalizedKeyword),
        ]),
      );
    }

    return query
      .orderBy('schedule.training_date', 'desc')
      .orderBy('schedule.start_time', 'desc')
      .orderBy('schedule.training_name', 'asc');
  }

  async findSchedules(filters: TrainingScheduleQuery = {}) {
    return await this.buildScheduleQuery(filters).execute() as TrainingScheduleRow[];
  }

  async findScheduleById(id: string) {
    return await this.buildScheduleQuery({ id }).executeTakeFirst() as TrainingScheduleRow | undefined;
  }

  async findAttendeesByScheduleIds(scheduleIds: string[]) {
    if (scheduleIds.length === 0) {
      return [] as TrainingAttendeeRow[];
    }

    return await db
      .selectFrom('SQE_TRAINING_ATTENDEES')
      .selectAll()
      .where('sqe_training_schedule_id', 'in', scheduleIds)
      .orderBy('employee_no', 'asc')
      .execute() as TrainingAttendeeRow[];
  }

  async findDuplicateSchedule(trainingName: string, trainingDate: string, excludeId?: string) {
    let query = db
      .selectFrom('SQE_TRAINING_SCHEDULE')
      .select('sqe_training_schedule_id')
      .where(sql`LOWER(${sql.ref('training_name')})`, '=', trainingName.trim().toLowerCase())
      .where(sql`CONVERT(date, ${sql.ref('training_date')})`, '=', trainingDate);

    if (excludeId) {
      query = query.where('sqe_training_schedule_id', '!=', excludeId);
    }

    return await query.executeTakeFirst();
  }

  async createRecord(schedule: NewSqeTrainingSchedule, attendees: NewSqeTrainingAttendee[]) {
    return await db.transaction().execute(async (trx) => {
      await trx.insertInto('SQE_TRAINING_SCHEDULE').values(schedule).execute();

      if (attendees.length > 0) {
        await trx.insertInto('SQE_TRAINING_ATTENDEES').values(attendees).execute();
      }
    });
  }

  async updateRecord(
    scheduleId: string,
    schedule: SqeTrainingScheduleUpdate,
    attendees: NewSqeTrainingAttendee[],
  ) {
    return await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('SQE_TRAINING_SCHEDULE')
        .set(schedule)
        .where('sqe_training_schedule_id', '=', scheduleId)
        .execute();

      await trx
        .deleteFrom('SQE_TRAINING_ATTENDEES')
        .where('sqe_training_schedule_id', '=', scheduleId)
        .execute();

      if (attendees.length > 0) {
        await trx.insertInto('SQE_TRAINING_ATTENDEES').values(attendees).execute();
      }
    });
  }

  async deleteRecord(scheduleId: string) {
    return await db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('SQE_TRAINING_ATTENDEES')
        .where('sqe_training_schedule_id', '=', scheduleId)
        .execute();

      await trx
        .deleteFrom('SQE_TRAINING_SCHEDULE')
        .where('sqe_training_schedule_id', '=', scheduleId)
        .execute();
    });
  }

  async findUserSiteId(userId: string): Promise<string | null> {
    const row = await db
      .selectFrom('USERS')
      .select('site_id')
      .where('user_id', '=', userId)
      .executeTakeFirst();

    return row?.site_id ?? null;
  }

  async findActorRoleName(userId: string): Promise<string | null> {
    const row = await db
      .selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .select('r.role_name')
      .where('u.user_id', '=', userId)
      .executeTakeFirst();

    return row?.role_name ?? null;
  }
}

export const trainingRepository = new TrainingRepository();
