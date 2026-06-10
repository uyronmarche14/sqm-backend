import { isAdminRole } from '../../../shared/utils/admin.utils.js';
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
    const siteId = await this.resolveUserSiteId(userId);
    const siteFiltered = siteId === undefined
      ? records
      : siteId === null
        ? []
        : records.filter((r) => r.siteId === siteId);
    const filtered = siteFiltered.filter((record) => applySearchFilters(record, query));

    return {
      records: filtered,
      metrics: buildTrainingAchievementMetric(filtered),
    };
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
}

export const trainingAchievementService = new TrainingAchievementService();
