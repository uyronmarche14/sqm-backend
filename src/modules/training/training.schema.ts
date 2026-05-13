import { z } from 'zod';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_PATTERN = /^\d{4}-\d{2}$/;
const ISO_TIME_PATTERN = /^\d{2}:\d{2}$/;

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyStringToUndefined(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const optionalString = () =>
  z.preprocess(emptyStringToUndefined, z.string().optional());

const requiredString = (label: string) =>
  z.preprocess(trimString, z.string().min(1, `${label} is required`));

const optionalDateString = () =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().regex(ISO_DATE_PATTERN, 'Expected YYYY-MM-DD date format').optional(),
  );

const optionalMonthString = () =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().regex(ISO_MONTH_PATTERN, 'Expected YYYY-MM month format').optional(),
  );

const optionalTimeString = () =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().regex(ISO_TIME_PATTERN, 'Expected HH:MM time format').optional(),
  );

const trainingStatusSchema = z.enum([
  'DRAFT',
  'PLANNED',
  'ONGOING',
  'COMPLETED',
  'CANCELLED',
]);

const attendeeStatusSchema = z.enum([
  'PLANNED',
  'ATTENDED',
  'COMPLETED',
  'ABSENT',
  'CANCELLED',
]);

const trainingSurfaceSchema = z.enum([
  'calendar',
  'calendar-list',
  'search',
  'achievement',
]);

export const TrainingIdParamSchema = z.object({
  params: z.object({
    id: requiredString('Training ID'),
  }),
});

export const TrainingAttendeeInputSchema = z.object({
  id: requiredString('Attendee ID'),
  employeeId: optionalString(),
  employeeNo: requiredString('Employee number'),
  fullName: requiredString('Full name'),
  firstName: optionalString(),
  middleName: optionalString(),
  lastName: optionalString(),
  groupId: optionalString(),
  groupName: optionalString(),
  siteId: optionalString(),
  siteName: optionalString(),
  status: attendeeStatusSchema.default('PLANNED'),
  remarks: optionalString(),
});

export const TrainingRecordInputSchema = z.object({
  id: optionalString(),
  controlNo: optionalString(),
  title: optionalString(),
  supplier: optionalString(),
  trainingName: requiredString('Training name'),
  trainingProgramId: optionalString(),
  trainingProgramName: optionalString(),
  trainingLevel: optionalString(),
  trainingDate: z.preprocess(trimString, z.string().regex(ISO_DATE_PATTERN, 'Expected YYYY-MM-DD date format')),
  startDate: optionalDateString(),
  endDate: optionalDateString(),
  startTime: optionalTimeString(),
  endTime: optionalTimeString(),
  room: optionalString(),
  siteId: optionalString(),
  siteName: optionalString(),
  groupId: optionalString(),
  groupName: optionalString(),
  trainerId: optionalString(),
  trainerName: optionalString(),
  status: trainingStatusSchema.default('PLANNED'),
  remarks: optionalString(),
  attendees: z.array(TrainingAttendeeInputSchema).default([]),
  attendeeCount: z.coerce.number().int().min(0).default(0),
  attendedCount: z.coerce.number().int().min(0).default(0),
  completedCount: z.coerce.number().int().min(0).default(0),
  achievementRate: z.coerce.number().min(0).default(0),
}).superRefine((record, ctx) => {
  if (record.startDate && record.endDate && record.startDate > record.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date cannot be before start date',
      path: ['endDate'],
    });
  }

  if (record.startTime && record.endTime && record.startTime > record.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End time cannot be before start time',
      path: ['endTime'],
    });
  }

  const seenEmployeeNumbers = new Set<string>();
  for (const attendee of record.attendees) {
    const key = attendee.employeeNo.toLowerCase();
    if (seenEmployeeNumbers.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate attendee employee numbers are not allowed',
        path: ['attendees'],
      });
      break;
    }

    seenEmployeeNumbers.add(key);
  }
});

function parseBooleanFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return undefined;
}

export const TrainingListQuerySchema = z.object({
  query: z.object({
    status: optionalString(),
    surface: z.preprocess(emptyStringToUndefined, trainingSurfaceSchema.optional()),
    assignedToMe: z.preprocess(parseBooleanFlag, z.boolean().optional()),
    date: optionalDateString(),
    month: optionalMonthString(),
  }),
});

export const TrainingSearchQuerySchema = z.object({
  query: z.object({
    keyword: optionalString(),
    status: optionalString(),
    siteId: optionalString(),
    trainingProgramId: optionalString(),
    groupId: optionalString(),
    month: optionalMonthString(),
    employeeKeyword: optionalString(),
    trainingDateFrom: optionalDateString(),
    trainingDateTo: optionalDateString(),
  }),
}).superRefine(({ query }, ctx) => {
  if (
    query.trainingDateFrom &&
    query.trainingDateTo &&
    query.trainingDateFrom > query.trainingDateTo
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'trainingDateTo must be on or after trainingDateFrom',
      path: ['query', 'trainingDateTo'],
    });
  }
});

export const TrainingAchievementQuerySchema = z.object({
  query: z.object({
    siteId: optionalString(),
    trainingProgramId: optionalString(),
    groupId: optionalString(),
    employeeKeyword: optionalString(),
    keyword: optionalString(),
    month: optionalMonthString(),
  }),
});

export type TrainingRecordInput = z.infer<typeof TrainingRecordInputSchema>;
export type TrainingListQuery = z.infer<typeof TrainingListQuerySchema>['query'];
export type TrainingSearchQuery = z.infer<typeof TrainingSearchQuerySchema>['query'];
export type TrainingAchievementQuery = z.infer<typeof TrainingAchievementQuerySchema>['query'];
