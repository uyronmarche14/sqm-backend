import { describe, expect, it } from 'vitest';
import { mappers } from '../../src/modules/masterData/master-data.service.js';

describe('form registry mapping', () => {
  it('projects registry-backed page metadata over stale FORMS rows', () => {
    const result = mappers.form({
      form_id: 'form-1',
      form_name: 'OGI-01-04',
      form_url: '/dashboard/ogi-up/search',
      menu_group: 'OGI Transaction',
      icon: 'Search',
      form_desc: 'Legacy search route',
      active_flag: 1,
    });

    expect(result).toMatchObject({
      id: 'form-1',
      name: 'OGI-01-04',
      title: 'Advanced Search',
      url: '/dashboard/ogi-up/advanced-search',
      canonicalRoute: '/dashboard/ogi-up/advanced-search',
      kind: 'page',
      assignable: true,
      source: 'registry',
      registryStatus: 'registry',
      module: 'OGI',
      pageType: 'utility',
    });
  });

  it('marks internal workflow codes as non-assignable and non-navigable', () => {
    const result = mappers.form({
      form_id: 'form-2',
      form_name: 'MNR-SEC-01',
      form_url: '#',
      menu_group: 'MNR Transaction',
      icon: '',
      form_desc: '',
      active_flag: 1,
    });

    expect(result).toMatchObject({
      id: 'form-2',
      name: 'MNR-SEC-01',
      kind: 'internal',
      assignable: false,
      url: '',
      source: 'registry',
      registryStatus: 'registry',
      module: 'MNR',
      pageType: 'section',
    });
  });

  it('classifies database-only forms as legacy unregistered audit rows', () => {
    const result = mappers.form({
      form_id: 'form-3',
      form_name: 'CUSTOM-LEGACY-01',
      form_url: '/legacy/custom',
      menu_group: 'Legacy',
      icon: '',
      form_desc: 'Legacy only',
      active_flag: 1,
    });

    expect(result).toMatchObject({
      id: 'form-3',
      name: 'CUSTOM-LEGACY-01',
      kind: 'page',
      assignable: false,
      source: 'database',
      registryStatus: 'legacy_unregistered',
      url: '/legacy/custom',
    });
  });
});
