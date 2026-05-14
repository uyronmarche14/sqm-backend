import { trainingRepository } from '../training.repository.js';
import type { TrainingAchievementQuery } from '../training.schema.js';
import {
  applySearchFilters,
  buildTrainingAchievementMetric,
  type TrainingAchievementResponse,
} from './training-shared.js';
import { trainingRecordQueryService } from './training-record-query.service.js';

export class TrainingAchievementService {
  constructor(
    private readonly repository = trainingRepository,
    private readonly queryService = trainingRecordQueryService,
  ) {}

  async getAchievement(userId: string | undefined, query: TrainingAchievementQuery): Promise<TrainingAchievementResponse> {
    const schedules = await this.repository.findSchedules({
      month: query.month,
      keyword: query.keyword,
    });

    const records = await this.queryService.materializeRecords(schedules, userId);
    const filtered = records.filter((record) => applySearchFilters(record, query));

    return {
      records: filtered,
      metrics: buildTrainingAchievementMetric(filtered),
    };
  }
}

export const trainingAchievementService = new TrainingAchievementService();
