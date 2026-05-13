import { v4 as uuidv4 } from 'uuid';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { permissionService } from '../../shared/services/permission.service.js';
import { trainingRepository, type TrainingAttendeeRow, type TrainingScheduleRow } from './training.repository.js';
import type { TrainingAchievementQuery, TrainingListQuery, TrainingRecordInput, TrainingSearchQuery } from './training.schema.js';

const TRAINING_STATUS_SET = new Set([
  'DRAFT',
  'PLANNED',
  'ONGOING',
  'COMPLETED',
  'CANCELLED',
]);

const ATTENDEE_STATUS_SET = new Set([
  'PLANNED',
  'ATTENDED',
  'COMPLETED',
  'ABSENT',
  'CANCELLED',
]);

const TRAINING_SCHEDULE_REMARKS_MARKER = '__sqmTrainingScheduleEnvelope';
const TRAINING_ATTENDEE_REMARKS_MARKER = '__sqmTrainingAttendeeEnvelope';

export interface TrainingRecordMetadata {
  title?: string;
  supplier?: string;
  trainingProgramId?: string;
  trainingProgramName?: string;
  trainingLevel?: string;
  startDate?: string;
  endDate?: string;
  siteId?: string;
  siteName?: string;
  groupId?: string;
  groupName?: string;
  trainerId?: string;
  trainerName?: string;
}

export interface TrainingAttendeeMetadata {
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  employeeId?: string;
  groupId?: string;
  groupName?: string;
  siteId?: string;
  siteName?: string;
}

interface ParsedTrainingScheduleRemarks {
  remarks?: string;
  metadata: TrainingRecordMetadata;
}

interface ParsedTrainingAttendeeRemarks {
  remarks?: string;
  metadata: TrainingAttendeeMetadata;
}

export interface TrainingAttendeeRecord extends TrainingAttendeeMetadata {
  id: string;
  employeeNo: string;
  fullName: string;
  status: string;
  remarks?: string;
}

export interface TrainingRecord {
  id: string;
  controlNo: string;
  title: string;
  supplier: string;
  trainingName: string;
  trainingProgramId?: string;
  trainingProgramName?: string;
  trainingLevel?: string;
  trainingDate: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  siteId?: string;
  siteName?: string;
  groupId?: string;
  groupName?: string;
  trainerId?: string;
  trainerName?: string;
  status: string;
  remarks?: string;
  attendees: TrainingAttendeeRecord[];
  attendeeCount: number;
  attendedCount: number;
  completedCount: number;
  achievementRate: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  availableActions: string[];
}

interface TrainingPermissionSnapshot {
  canEdit: boolean;
  canDelete: boolean;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatus(value: unknown) {
  const normalized = normalizeString(value)
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .toUpperCase();

  if (TRAINING_STATUS_SET.has(normalized)) {
    return normalized;
  }

  if (normalized === 'DONE') {
    return 'COMPLETED';
  }

  if (normalized === 'ON_GOING') {
    return 'ONGOING';
  }

  return normalized || 'DRAFT';
}

function normalizeAttendeeStatus(value: unknown) {
  const normalized = normalizeString(value)
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .toUpperCase();

  if (ATTENDEE_STATUS_SET.has(normalized)) {
    return normalized;
  }

  if (normalized === 'DONE') {
    return 'COMPLETED';
  }

  return normalized || 'PLANNED';
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function formatTrainingTime(value: number | string | null | undefined) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return undefined;
  }

  const hours = Math.floor(numericValue / 100);
  const minutes = numericValue % 100;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseTrainingTime(value: string | null | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return 0;
  }

  const [hoursText, minutesText] = normalized.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return hours * 100 + minutes;
}

function sanitizeMetadata<T extends object>(metadata: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => normalizeString(value).length > 0),
  ) as Partial<T>;
}

export function parseTrainingScheduleRemarks(value: string | null | undefined): ParsedTrainingScheduleRemarks {
  const normalized = normalizeString(value);
  if (!normalized) {
    return { remarks: undefined, metadata: {} };
  }

  try {
    const parsed = JSON.parse(normalized) as Record<string, unknown>;
    if (parsed?.[TRAINING_SCHEDULE_REMARKS_MARKER] === 1) {
      return {
        remarks: normalizeString(parsed.remarks) || undefined,
        metadata: sanitizeMetadata({
          title: normalizeString(parsed.title) || undefined,
          supplier: normalizeString(parsed.supplier) || undefined,
          trainingProgramId: normalizeString(parsed.trainingProgramId) || undefined,
          trainingProgramName: normalizeString(parsed.trainingProgramName) || undefined,
          trainingLevel: normalizeString(parsed.trainingLevel) || undefined,
          startDate: normalizeString(parsed.startDate) || undefined,
          endDate: normalizeString(parsed.endDate) || undefined,
          siteId: normalizeString(parsed.siteId) || undefined,
          siteName: normalizeString(parsed.siteName) || undefined,
          groupId: normalizeString(parsed.groupId) || undefined,
          groupName: normalizeString(parsed.groupName) || undefined,
          trainerId: normalizeString(parsed.trainerId) || undefined,
          trainerName: normalizeString(parsed.trainerName) || undefined,
        }),
      };
    }
  } catch {
    // Treat legacy plain text remarks as-is.
  }

  return {
    remarks: normalized,
    metadata: {},
  };
}

export function serializeTrainingScheduleRemarks(
  remarks: string | undefined,
  metadata: TrainingRecordMetadata,
) {
  const normalizedRemarks = normalizeString(remarks) || undefined;
  const normalizedMetadata = sanitizeMetadata(metadata);

  if (Object.keys(normalizedMetadata).length === 0) {
    return normalizedRemarks ?? null;
  }

  return JSON.stringify({
    [TRAINING_SCHEDULE_REMARKS_MARKER]: 1,
    remarks: normalizedRemarks ?? '',
    ...normalizedMetadata,
  });
}

export function parseTrainingAttendeeRemarks(value: string | null | undefined): ParsedTrainingAttendeeRemarks {
  const normalized = normalizeString(value);
  if (!normalized) {
    return { remarks: undefined, metadata: {} };
  }

  try {
    const parsed = JSON.parse(normalized) as Record<string, unknown>;
    if (parsed?.[TRAINING_ATTENDEE_REMARKS_MARKER] === 1) {
      return {
        remarks: normalizeString(parsed.remarks) || undefined,
        metadata: sanitizeMetadata({
          fullName: normalizeString(parsed.fullName) || undefined,
          firstName: normalizeString(parsed.firstName) || undefined,
          middleName: normalizeString(parsed.middleName) || undefined,
          lastName: normalizeString(parsed.lastName) || undefined,
          employeeId: normalizeString(parsed.employeeId) || undefined,
          groupId: normalizeString(parsed.groupId) || undefined,
          groupName: normalizeString(parsed.groupName) || undefined,
          siteId: normalizeString(parsed.siteId) || undefined,
          siteName: normalizeString(parsed.siteName) || undefined,
        }),
      };
    }
  } catch {
    // Treat legacy plain text remarks as-is.
  }

  return {
    remarks: normalized,
    metadata: {},
  };
}

export function serializeTrainingAttendeeRemarks(
  remarks: string | undefined,
  metadata: TrainingAttendeeMetadata,
) {
  const normalizedRemarks = normalizeString(remarks) || undefined;
  const normalizedMetadata = sanitizeMetadata(metadata);

  if (Object.keys(normalizedMetadata).length === 0) {
    return normalizedRemarks ?? null;
  }

  return JSON.stringify({
    [TRAINING_ATTENDEE_REMARKS_MARKER]: 1,
    remarks: normalizedRemarks ?? '',
    ...normalizedMetadata,
  });
}

function deriveControlNo(scheduleId: string, trainingDate?: string) {
  const normalizedDate = normalizeString(trainingDate).replace(/-/g, '') || '00000000';
  const suffix = normalizeString(scheduleId).slice(0, 8).toUpperCase() || 'UNKNOWN';
  return `TRN-${normalizedDate}-${suffix}`;
}

function buildTrainingMetrics(attendees: TrainingAttendeeRecord[]) {
  const attendeeCount = attendees.length;
  const attendedCount = attendees.filter((attendee) =>
    attendee.status === 'ATTENDED' || attendee.status === 'COMPLETED',
  ).length;
  const completedCount = attendees.filter((attendee) => attendee.status === 'COMPLETED').length;
  const achievementRate = attendeeCount > 0
    ? Math.round((completedCount / attendeeCount) * 100)
    : 0;

  return {
    attendeeCount,
    attendedCount,
    completedCount,
    achievementRate,
  };
}

function buildAvailableActions(status: string, permissions: TrainingPermissionSnapshot) {
  const actions = ['view'];
  const locked = status === 'COMPLETED' || status === 'CANCELLED';

  if (!locked && permissions.canEdit) {
    actions.push('edit');
  }

  if (!locked && permissions.canDelete) {
    actions.push('delete');
  }

  return actions;
}

function buildAttendeeRecord(row: TrainingAttendeeRow): TrainingAttendeeRecord {
  const parsedRemarks = parseTrainingAttendeeRemarks(row.remarks);
  const fullName = normalizeString(parsedRemarks.metadata.fullName) || normalizeString(row.employee_no);
  const employeeNo = normalizeString(row.employee_no);

  return {
    id: normalizeString(row.sqe_training_attendees_id),
    employeeId: parsedRemarks.metadata.employeeId,
    employeeNo,
    fullName,
    firstName: parsedRemarks.metadata.firstName,
    middleName: parsedRemarks.metadata.middleName,
    lastName: parsedRemarks.metadata.lastName,
    groupId: parsedRemarks.metadata.groupId,
    groupName: parsedRemarks.metadata.groupName,
    siteId: parsedRemarks.metadata.siteId,
    siteName: parsedRemarks.metadata.siteName,
    status: normalizeAttendeeStatus(row.status),
    remarks: parsedRemarks.remarks,
  };
}

export function mapTrainingRecord(
  schedule: TrainingScheduleRow,
  attendeeRows: TrainingAttendeeRow[],
  permissions: TrainingPermissionSnapshot = { canEdit: false, canDelete: false },
): TrainingRecord {
  const parsedRemarks = parseTrainingScheduleRemarks(schedule.remarks);
  const attendees = attendeeRows.map(buildAttendeeRecord);
  const metrics = buildTrainingMetrics(attendees);
  const status = normalizeStatus(schedule.status);
  const trainingDate = toIsoDate(schedule.training_date) || '';

  return {
    id: normalizeString(schedule.sqe_training_schedule_id),
    controlNo: deriveControlNo(schedule.sqe_training_schedule_id, trainingDate),
    title: normalizeString(parsedRemarks.metadata.title) || normalizeString(schedule.training_name),
    supplier: normalizeString(parsedRemarks.metadata.supplier) || 'Internal',
    trainingName: normalizeString(schedule.training_name),
    trainingProgramId: parsedRemarks.metadata.trainingProgramId,
    trainingProgramName: parsedRemarks.metadata.trainingProgramName,
    trainingLevel: parsedRemarks.metadata.trainingLevel,
    trainingDate,
    startDate: parsedRemarks.metadata.startDate,
    endDate: parsedRemarks.metadata.endDate,
    startTime: formatTrainingTime(schedule.start_time),
    endTime: formatTrainingTime(schedule.end_time),
    room: normalizeString(schedule.room) || undefined,
    siteId: parsedRemarks.metadata.siteId,
    siteName: parsedRemarks.metadata.siteName,
    groupId: parsedRemarks.metadata.groupId,
    groupName: parsedRemarks.metadata.groupName,
    trainerId: parsedRemarks.metadata.trainerId,
    trainerName: parsedRemarks.metadata.trainerName,
    status,
    remarks: parsedRemarks.remarks,
    attendees,
    ...metrics,
    createdAt: toIsoDateTime(schedule.last_update),
    updatedAt: toIsoDateTime(schedule.last_update),
    createdBy: normalizeString(schedule.updateby) || undefined,
    updatedBy: normalizeString(schedule.updated_by_name) || normalizeString(schedule.updateby) || undefined,
    availableActions: buildAvailableActions(status, permissions),
  };
}

function splitStatuses(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized || normalized.toUpperCase() === 'ALL') {
    return [] as string[];
  }

  return normalized
    .split(',')
    .map((entry) => normalizeStatus(entry))
    .filter(Boolean);
}

function matchesKeyword(record: TrainingRecord, keyword?: string) {
  const normalizedKeyword = normalizeString(keyword).toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  const haystack = [
    record.controlNo,
    record.title,
    record.trainingName,
    record.trainingProgramName,
    record.trainingLevel,
    record.siteName,
    record.groupName,
    record.trainerName,
    record.room,
    record.remarks,
    record.supplier,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedKeyword);
}

function matchesEmployeeKeyword(record: TrainingRecord, keyword?: string) {
  const normalizedKeyword = normalizeString(keyword).toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return record.attendees.some((attendee) => {
    const haystack = [
      attendee.employeeNo,
      attendee.fullName,
      attendee.firstName,
      attendee.middleName,
      attendee.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedKeyword);
  });
}

function matchesDimension(
  recordValueId: string | undefined,
  recordValueName: string | undefined,
  attendeeValues: Array<{ id?: string; name?: string }>,
  filterValue?: string,
) {
  const normalizedFilter = normalizeString(filterValue);
  if (!normalizedFilter) {
    return true;
  }

  if ([recordValueId, recordValueName].filter(Boolean).includes(normalizedFilter)) {
    return true;
  }

  return attendeeValues.some((entry) =>
    [entry.id, entry.name].filter(Boolean).includes(normalizedFilter),
  );
}

function matchesMonth(record: TrainingRecord, month?: string) {
  const normalizedMonth = normalizeString(month);
  if (!normalizedMonth) {
    return true;
  }

  return normalizeString(record.trainingDate).startsWith(normalizedMonth);
}

function matchesDateRange(record: TrainingRecord, from?: string, to?: string) {
  const date = normalizeString(record.trainingDate);
  if (!date) {
    return false;
  }

  if (from && date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
}

function applySearchFilters(record: TrainingRecord, filters: TrainingSearchQuery | TrainingAchievementQuery) {
  return (
    matchesKeyword(record, 'keyword' in filters ? filters.keyword : undefined) &&
    matchesEmployeeKeyword(record, 'employeeKeyword' in filters ? filters.employeeKeyword : undefined) &&
    matchesMonth(record, filters.month) &&
    matchesDimension(
      record.siteId,
      record.siteName,
      record.attendees.map((attendee) => ({ id: attendee.siteId, name: attendee.siteName })),
      filters.siteId,
    ) &&
    matchesDimension(
      record.trainingProgramId,
      record.trainingProgramName,
      [],
      filters.trainingProgramId,
    ) &&
    matchesDimension(
      record.groupId,
      record.groupName,
      record.attendees.map((attendee) => ({ id: attendee.groupId, name: attendee.groupName })),
      filters.groupId,
    ) &&
    matchesDateRange(
      record,
      'trainingDateFrom' in filters ? filters.trainingDateFrom : undefined,
      'trainingDateTo' in filters ? filters.trainingDateTo : undefined,
    )
  );
}

export class TrainingService {
  constructor(
    private readonly repository = trainingRepository,
    private readonly permissions = permissionService,
  ) {}

  private async resolvePermissions(userId?: string | null): Promise<TrainingPermissionSnapshot> {
    if (!userId) {
      return {
        canEdit: false,
        canDelete: false,
      };
    }

    const [canEdit, canDelete] = await Promise.all([
      this.permissions.checkPermission(userId, 'TRAINING-10-02', 'edit'),
      this.permissions.checkPermission(userId, 'TRAINING-10-02', 'delete'),
    ]);

    return {
      canEdit,
      canDelete,
    };
  }

  private async materializeRecords(
    schedules: TrainingScheduleRow[],
    userId?: string | null,
  ) {
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
      mapTrainingRecord(
        schedule,
        groupedAttendees.get(schedule.sqe_training_schedule_id) || [],
        permissions,
      ),
    );
  }

  async list(userId: string | undefined, query: TrainingListQuery) {
    const schedules = await this.repository.findSchedules({
      statuses: splitStatuses(query.status),
      date: query.date,
      month: query.month,
    });

    return await this.materializeRecords(schedules, userId);
  }

  async getById(id: string, userId?: string | null) {
    const schedule = await this.repository.findScheduleById(id);
    if (!schedule) {
      throw new NotFoundError('Training record not found');
    }

    const records = await this.materializeRecords([schedule], userId);
    return records[0];
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
    return records.filter((record) => applySearchFilters(record, query));
  }

  async achievement(userId: string | undefined, query: TrainingAchievementQuery) {
    const schedules = await this.repository.findSchedules({
      month: query.month,
      keyword: query.keyword,
    });

    const records = await this.materializeRecords(schedules, userId);
    return records.filter((record) => applySearchFilters(record, query));
  }

  async create(userId: string, input: TrainingRecordInput) {
    const duplicate = await this.repository.findDuplicateSchedule(
      input.trainingName,
      input.trainingDate,
    );
    if (duplicate) {
      throw new ConflictError('A training session with the same name and date already exists');
    }

    const id = uuidv4();
    const now = new Date();
    const scheduleMetadata: TrainingRecordMetadata = {
      title: input.title,
      supplier: input.supplier,
      trainingProgramId: input.trainingProgramId,
      trainingProgramName: input.trainingProgramName,
      trainingLevel: input.trainingLevel,
      startDate: input.startDate,
      endDate: input.endDate,
      siteId: input.siteId,
      siteName: input.siteName,
      groupId: input.groupId,
      groupName: input.groupName,
      trainerId: input.trainerId,
      trainerName: input.trainerName,
    };

    await this.repository.createRecord(
      {
        sqe_training_schedule_id: id,
        training_name: input.trainingName,
        training_date: input.trainingDate,
        room: normalizeString(input.room),
        start_time: parseTrainingTime(input.startTime),
        end_time: parseTrainingTime(input.endTime),
        status: normalizeStatus(input.status),
        remarks: serializeTrainingScheduleRemarks(input.remarks, scheduleMetadata),
        last_update: now,
        updateby: userId,
      },
      input.attendees.map((attendee) => ({
        sqe_training_attendees_id: uuidv4(),
        sqe_training_schedule_id: id,
        employee_no: attendee.employeeNo,
        status: normalizeAttendeeStatus(attendee.status),
        remarks: serializeTrainingAttendeeRemarks(attendee.remarks, {
          employeeId: attendee.employeeId,
          fullName: attendee.fullName,
          firstName: attendee.firstName,
          middleName: attendee.middleName,
          lastName: attendee.lastName,
          groupId: attendee.groupId,
          groupName: attendee.groupName,
          siteId: attendee.siteId,
          siteName: attendee.siteName,
        }),
      })),
    );

    return await this.getById(id, userId);
  }

  async update(id: string, userId: string, input: TrainingRecordInput) {
    const existing = await this.repository.findScheduleById(id);
    if (!existing) {
      throw new NotFoundError('Training record not found');
    }

    const duplicate = await this.repository.findDuplicateSchedule(
      input.trainingName,
      input.trainingDate,
      id,
    );
    if (duplicate) {
      throw new ConflictError('A training session with the same name and date already exists');
    }

    const now = new Date();
    const scheduleMetadata: TrainingRecordMetadata = {
      title: input.title,
      supplier: input.supplier,
      trainingProgramId: input.trainingProgramId,
      trainingProgramName: input.trainingProgramName,
      trainingLevel: input.trainingLevel,
      startDate: input.startDate,
      endDate: input.endDate,
      siteId: input.siteId,
      siteName: input.siteName,
      groupId: input.groupId,
      groupName: input.groupName,
      trainerId: input.trainerId,
      trainerName: input.trainerName,
    };

    await this.repository.updateRecord(
      id,
      {
        training_name: input.trainingName,
        training_date: input.trainingDate,
        room: normalizeString(input.room),
        start_time: parseTrainingTime(input.startTime),
        end_time: parseTrainingTime(input.endTime),
        status: normalizeStatus(input.status),
        remarks: serializeTrainingScheduleRemarks(input.remarks, scheduleMetadata),
        last_update: now,
        updateby: userId,
      },
      input.attendees.map((attendee) => ({
        sqe_training_attendees_id: normalizeString(attendee.id) || uuidv4(),
        sqe_training_schedule_id: id,
        employee_no: attendee.employeeNo,
        status: normalizeAttendeeStatus(attendee.status),
        remarks: serializeTrainingAttendeeRemarks(attendee.remarks, {
          employeeId: attendee.employeeId,
          fullName: attendee.fullName,
          firstName: attendee.firstName,
          middleName: attendee.middleName,
          lastName: attendee.lastName,
          groupId: attendee.groupId,
          groupName: attendee.groupName,
          siteId: attendee.siteId,
          siteName: attendee.siteName,
        }),
      })),
    );

    return await this.getById(id, userId);
  }

  async delete(id: string) {
    const existing = await this.repository.findScheduleById(id);
    if (!existing) {
      throw new NotFoundError('Training record not found');
    }

    await this.repository.deleteRecord(id);
    return { id };
  }
}

export const trainingService = new TrainingService();
