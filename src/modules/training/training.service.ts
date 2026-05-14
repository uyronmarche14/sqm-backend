import { trainingAchievementService } from './services/training-achievement.service.js';
import { trainingRecordCommandService } from './services/training-record-command.service.js';
import { trainingRecordQueryService } from './services/training-record-query.service.js';
import type { TrainingAchievementQuery, TrainingListQuery, TrainingRecordInput, TrainingSearchQuery } from './training.schema.js';

export {
  formatTrainingTime,
  mapTrainingRecord,
  parseTrainingAttendeeRemarks,
  parseTrainingScheduleRemarks,
  parseTrainingTime,
  serializeTrainingAttendeeRemarks,
  serializeTrainingScheduleRemarks,
} from './services/training-shared.js';

export class TrainingService {
  async list(userId: string | undefined, query: TrainingListQuery) {
    return await trainingRecordQueryService.list(userId, query);
  }

  async calendar(userId: string | undefined, query: TrainingListQuery) {
    return await trainingRecordQueryService.calendar(userId, query);
  }

  async getById(id: string, userId?: string | null) {
    return await trainingRecordQueryService.getById(id, userId);
  }

  async search(userId: string | undefined, query: TrainingSearchQuery) {
    return await trainingRecordQueryService.search(userId, query);
  }

  async achievement(userId: string | undefined, query: TrainingAchievementQuery) {
    return await trainingAchievementService.getAchievement(userId, query);
  }

  async create(userId: string, input: TrainingRecordInput) {
    const id = await trainingRecordCommandService.create(userId, input);
    return await this.getById(id, userId);
  }

  async update(id: string, userId: string, input: TrainingRecordInput) {
    const recordId = await trainingRecordCommandService.update(id, userId, input);
    return await this.getById(recordId, userId);
  }

  async delete(id: string) {
    return await trainingRecordCommandService.delete(id);
  }
}

export const trainingService = new TrainingService();
