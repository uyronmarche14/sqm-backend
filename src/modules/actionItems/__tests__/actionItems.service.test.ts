import { describe, expect, it, vi } from 'vitest';
import { actionItemsService } from '../actionItems.service.js';

vi.mock('../actionItems.repository.js', () => ({
  actionItemsRepository: {
    findAllDetailed: vi.fn(),
    countTotal: vi.fn(),
    findById: vi.fn(),
  },
}));

import { actionItemsRepository } from '../actionItems.repository.js';

describe('Action Items Service', () => {
  it('returns paginated results', async () => {
    vi.mocked(actionItemsRepository.findAllDetailed).mockResolvedValue([]);
    vi.mocked(actionItemsRepository.countTotal).mockResolvedValue(0);

    const result = await actionItemsService.list({ page: 1, pageSize: 20 });
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.query.page).toBe(1);
  });

  it('applies filters to repository calls', async () => {
    vi.mocked(actionItemsRepository.findAllDetailed).mockResolvedValue([]);
    vi.mocked(actionItemsRepository.countTotal).mockResolvedValue(0);

    await actionItemsService.list({ page: 1, pageSize: 50, status: 'OPEN', sourceModule: '5M1E' });
    expect(actionItemsRepository.findAllDetailed).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'OPEN', sourceModule: '5M1E' })
    );
  });

  it('returns null for non-existent id', async () => {
    vi.mocked(actionItemsRepository.findAllDetailed).mockResolvedValue([]);
    const result = await actionItemsService.getById('nonexistent');
    expect(result).toBeNull();
  });
});
