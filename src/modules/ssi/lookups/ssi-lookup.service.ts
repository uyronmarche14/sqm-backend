import { ssiRepository } from '../ssi.repository.js';
import { SSI_CATEGORY_OPTIONS } from '../shared/ssi-shared.js';

export class SsiLookupService {
  async getLookups() {
    const [sites, suppliers, inspectors, sqeUsers] = await Promise.all([
      ssiRepository.listSites(),
      ssiRepository.listSuppliers(),
      ssiRepository.listInspectors(),
      ssiRepository.listSqeUsers(),
    ]);

    return {
      sites,
      suppliers,
      inspectors,
      sqeUsers,
      categories: SSI_CATEGORY_OPTIONS,
    };
  }
}

export const ssiLookupService = new SsiLookupService();
