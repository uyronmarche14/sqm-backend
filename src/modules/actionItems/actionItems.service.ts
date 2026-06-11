import { actionItemsRepository } from './actionItems.repository.js';
import type { ActionItemListQuery, ActionItemListResponse } from './actionItems.types.js';

export const actionItemsService = {
  async list(params: ActionItemListQuery): Promise<ActionItemListResponse> {
    const [rows, total] = await Promise.all([
      actionItemsRepository.findAllDetailed(params),
      actionItemsRepository.countTotal(params),
    ]);

    return { rows, total, query: params };
  },

  async getById(id: string) {
    const rows = await actionItemsRepository.findAllDetailed({ page: 1, pageSize: 1 });
    return rows.find((r) => r.id === id) || null;
  },
};
