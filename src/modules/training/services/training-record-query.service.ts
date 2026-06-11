import { permissionService } from '../../../shared/services/permission.service.js';
import { isAdminRole } from '../../../shared/utils/admin.utils.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { trainingRepository, type TrainingAttendeeRow, type TrainingScheduleRow } from '../training.repository.js';
import type { TrainingListQuery, TrainingSearchQuery } from '../training.schema.js';
import {
  applySearchFilters,
  buildTrainingCalendarEntry,
  isTrainingAssignedRecord,
  mapTrainingRecord,
  splitStatuses,
  type TrainingCalendarEntry,
  type TrainingPermissionSnapshot,
  type TrainingRecordReadModel,
} from './training-shared.js';

export class TrainingRecordQueryService {
  constructor(
    private readonly repository = trainingRepository,
    private readonly permissions = permissionService,
  ) {}

  private async resolvePermissions(userId?: string | null): Promise<TrainingPermissionSnapshot> {
    if (!userId) {
      return { canEdit: false, canDelete: false };
    }

    const [canEdit, canDelete] = await Promise.all([
      this.permissions.checkPermission(userId, 'TRAINING-10-02', 'edit'),
      this.permissions.checkPermission(userId, 'TRAINING-10-02', 'delete'),
    ]);

    return { canEdit, canDelete };
  }

  private async resolveUserSiteId(userId: string | undefined): Promise<string | null | undefined> {
    if (!userId) {
      return undefined;
    }

    const roleName = await this.repository.findActorRoleName(userId);
    if (isAdminRole(roleName)) {
      return undefined;
    }

    return this.repository.findUserSiteId(userId);
  }

  private filterBySite(records: TrainingRecordReadModel[], siteId: string | null | undefined): TrainingRecordReadModel[] {
    if (siteId === undefined) {
      return records;
    }

    if (siteId === null) {
      return [];
    }

    return records.filter((r) => r.siteId === siteId);
  }

  async materializeRecords(
    schedules: TrainingScheduleRow[],
    userId?: string | null,
  ): Promise<TrainingRecordReadModel[]> {
    const scheduleIds = schedules.map((schedule) => schedule.sqe_training_schedule_id);
    const attendeeRows = await this.repository.findAttendeesByScheduleIds(scheduleIds);
    const groupedAttendees = new Map<string, TrainingAttendeeRow[]>();

    for (const attendee of attendeeRows) {
      const key = attendee.sqe_training_schedule_id;
      const collection = groupedAttendees.get(key);
      if (collection) {
        collection.push(attendee);
      } else {
        groupedAttendees.set(key, [attendee]);
      }
    }

    const permissions = await this.resolvePermissions(userId);
    return schedules.map((schedule) =>
      mapTrainingRecord(schedule, groupedAttendees.get(schedule.sqe_training_schedule_id) || [], permissions),
    );
  }

  private applyAssignedScope(records: TrainingRecordReadModel[], assignedToMe?: boolean) {
    if (!assignedToMe) {
      return records;
    }

    return records.filter(isTrainingAssignedRecord);
  }

  async list(userId: string | undefined, query: TrainingListQuery) {
    const schedules = await this.repository.findSchedules({
      statuses: splitStatuses(query.status),
      date: query.date,
      month: query.month,
    });

    const records = await this.materializeRecords(schedules, userId);
    const siteId = await this.resolveUserSiteId(userId);
    return this.applyAssignedScope(this.filterBySite(records, siteId), query.assignedToMe);
  }

  async calendar(userId: string | undefined, query: TrainingListQuery): Promise<TrainingCalendarEntry[]> {
    const records = await this.list(userId, query);
    return records.map(buildTrainingCalendarEntry);
  }

  async getById(id: string, userId?: string | null) {
    const schedule = await this.repository.findScheduleById(id);
    if (!schedule) {
      throw new NotFoundError('Training record not found');
    }

    const records = await this.materializeRecords([schedule], userId);
    const siteId = await this.resolveUserSiteId(userId ?? undefined);
    const filtered = this.filterBySite(records, siteId);

    if (filtered.length === 0) {
      throw new NotFoundError('Training record not found');
    }

    return filtered[0];
  }

  async search(userId: string | undefined, query: TrainingSearchQuery) {
    const schedules = await this.repository.findSchedules({
      statuses: splitStatuses(query.status),
      month: query.month,
      trainingDateFrom: query.trainingDateFrom,
      trainingDateTo: query.trainingDateTo,
      keyword: query.keyword,
    });

    const records = await this.materializeRecords(schedules, userId);
    const siteId = await this.resolveUserSiteId(userId);
    return this.filterBySite(records, siteId).filter((record) => applySearchFilters(record, query));
  }
}

export const trainingRecordQueryService = new TrainingRecordQueryService();
