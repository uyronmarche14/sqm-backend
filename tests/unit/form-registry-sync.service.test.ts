import { describe, expect, it, vi } from 'vitest';

import {
  FormRegistrySyncService,
} from '../../src/modules/masterData/form-registry-sync.service.js';

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    form_id: '11111111-1111-4111-8111-111111111111',
    form_name: 'OGI-01-04',
    form_url: '/legacy-route',
    menu_group: 'Legacy Group',
    icon: '',
    form_desc: '',
    active_flag: 1,
    updateby: 'LEGACY',
    ...overrides,
  };
}

describe('FormRegistrySyncService', () => {
  it('inserts missing registry-backed forms and normalizes stale registry metadata', async () => {
    const repo = {
      findAll: vi.fn().mockResolvedValue([
        createRow({
          form_name: 'OGI-01-04',
          form_url: '/dashboard/ogi-up/search',
          menu_group: 'Legacy OGI',
        }),
        createRow({
          form_name: 'CUSTOM-LEGACY-01',
          form_url: '/legacy/custom',
          menu_group: 'Legacy',
        }),
      ]),
      create: vi.fn().mockImplementation(async (data) => data),
      update: vi.fn().mockImplementation(async (_id, data) => data),
    };

    const service = new FormRegistrySyncService(repo as any);
    const summary = await service.sync();

    expect(repo.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        form_url: '/dashboard/ogi-up/advanced-search',
        menu_group: 'OGI Transaction',
        updateby: 'SYSTEM_SYNC',
      }),
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        form_name: 'QMQA-05-01',
        form_url: '/dashboard/qmqa/new',
        menu_group: 'QMQA Transaction',
      }),
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        form_name: 'MNR-SEC-01',
        form_url: '',
        menu_group: 'MNR Transaction',
      }),
    );

    expect(summary.inserted).toBeGreaterThan(0);
    expect(summary.updated).toBeGreaterThan(0);
    expect(summary.legacyUnregistered).toBe(1);
    expect(summary.internalSynced).toBeGreaterThan(0);
  });
});
