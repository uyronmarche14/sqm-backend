import { v4 as uuidv4 } from 'uuid';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { trainingRepository } from '../training.repository.js';
import type { TrainingRecordInput } from '../training.schema.js';
import {
  normalizeAttendeeStatus,
  normalizeStatus,
  normalizeString,
  parseTrainingTime,
  serializeTrainingAttendeeRemarks,
  serializeTrainingScheduleRemarks,
  type TrainingRecordMetadata,
} from './training-shared.js';

export class TrainingRecordCommandService {
  constructor(private readonly repository = trainingRepository) {}

  private buildScheduleMetadata(input: TrainingRecordInput): TrainingRecordMetadata {
    return {
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
  }

  async create(userId: string, input: TrainingRecordInput) {
    const duplicate = await this.repository.findDuplicateSchedule(input.trainingName, input.trainingDate);
    if (duplicate) {
      throw new ConflictError('A training session with the same name and date already exists');
    }

    const id = uuidv4();
    const now = new Date();
    const scheduleMetadata = this.buildScheduleMetadata(input);

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

    return id;
  }

  async update(id: string, userId: string, input: TrainingRecordInput) {
    const existing = await this.repository.findScheduleById(id);
    if (!existing) {
      throw new NotFoundError('Training record not found');
    }

    const duplicate = await this.repository.findDuplicateSchedule(input.trainingName, input.trainingDate, id);
    if (duplicate) {
      throw new ConflictError('A training session with the same name and date already exists');
    }

    const now = new Date();
    const scheduleMetadata = this.buildScheduleMetadata(input);

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

    return id;
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

export const trainingRecordCommandService = new TrainingRecordCommandService();
