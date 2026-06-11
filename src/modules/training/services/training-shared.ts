import type { TrainingAttendeeRow, TrainingScheduleRow } from '../training.repository.js';

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

export const TRAINING_SCHEDULE_REMARKS_MARKER = '__sqmTrainingScheduleEnvelope';
export const TRAINING_ATTENDEE_REMARKS_MARKER = '__sqmTrainingAttendeeEnvelope';

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

export interface TrainingRecordReadModel {
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

export interface TrainingPermissionSnapshot {
  canEdit: boolean;
  canDelete: boolean;
}

export interface TrainingCalendarEntry {
  id: string;
  date: string;
  title: string;
  controlNo: string;
  status: string;
  attendeeCount: number;
  siteName?: string;
  room?: string;
  recordId?: string;
}

export interface TrainingAchievementMetric {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  totalAttendees: number;
  attendedAttendees: number;
  completedAttendees: number;
  attendanceRate: number;
}

export interface TrainingAchievementResponse {
  records: TrainingRecordReadModel[];
  metrics: TrainingAchievementMetric;
}

export function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeStatus(value: unknown) {
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

export function normalizeAttendeeStatus(value: unknown) {
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

export function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

export function toIsoDateTime(value: Date | string | null | undefined) {
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
): TrainingRecordReadModel {
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

export function buildTrainingCalendarEntry(record: TrainingRecordReadModel): TrainingCalendarEntry {
  return {
    id: record.id,
    date: record.trainingDate,
    title: record.trainingName || record.title,
    controlNo: record.controlNo,
    status: record.status,
    attendeeCount: record.attendeeCount,
    siteName: record.siteName,
    room: record.room,
    recordId: record.id,
  };
}

export function buildTrainingAchievementMetric(records: TrainingRecordReadModel[]): TrainingAchievementMetric {
  const totalSessions = records.length;
  const completedSessions = records.filter((record) => record.status === 'COMPLETED').length;
  const activeSessions = records.filter((record) => ['PLANNED', 'ONGOING', 'DRAFT'].includes(record.status)).length;
  const totalAttendees = records.reduce((sum, record) => sum + record.attendeeCount, 0);
  const attendedAttendees = records.reduce((sum, record) => sum + record.attendedCount, 0);
  const completedAttendees = records.reduce((sum, record) => sum + record.completedCount, 0);
  const attendanceRate = totalAttendees > 0 ? Math.round((attendedAttendees / totalAttendees) * 100) : 0;

  return {
    totalSessions,
    completedSessions,
    activeSessions,
    totalAttendees,
    attendedAttendees,
    completedAttendees,
    attendanceRate,
  };
}

export function splitStatuses(value: string | undefined) {
  const normalized = normalizeString(value);
  if (!normalized || normalized.toUpperCase() === 'ALL') {
    return [] as string[];
  }

  return normalized
    .split(',')
    .map((entry) => normalizeStatus(entry))
    .filter(Boolean);
}

function matchesKeyword(record: TrainingRecordReadModel, keyword?: string) {
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

function matchesEmployeeKeyword(record: TrainingRecordReadModel, keyword?: string) {
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

function matchesMonth(record: TrainingRecordReadModel, month?: string) {
  const normalizedMonth = normalizeString(month);
  if (!normalizedMonth) {
    return true;
  }

  return normalizeString(record.trainingDate).startsWith(normalizedMonth);
}

function matchesDateRange(record: TrainingRecordReadModel, from?: string, to?: string) {
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

export function applySearchFilters(
  record: TrainingRecordReadModel,
  filters: {
    keyword?: string;
    employeeKeyword?: string;
    month?: string;
    siteId?: string;
    trainingProgramId?: string;
    groupId?: string;
    trainingDateFrom?: string;
    trainingDateTo?: string;
  },
) {
  return (
    matchesKeyword(record, filters.keyword) &&
    matchesEmployeeKeyword(record, filters.employeeKeyword) &&
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
    matchesDateRange(record, filters.trainingDateFrom, filters.trainingDateTo)
  );
}

export function isTrainingAssignedRecord(record: TrainingRecordReadModel) {
  return record.availableActions.some((action) => action === 'edit' || action === 'delete');
}
