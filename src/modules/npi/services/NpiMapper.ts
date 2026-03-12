/**
 * NPI Mapper
 * Handles DTO transformations for NPI records
 * Type-safe implementation with no 'any' types
 */

import { mapStatusFromDB } from '../../../shared/utils/status-mapper.js';
import { 
  NpiListDTO, 
  NpiDetailDTO, 
  NpiDetailQueryResult 
} from '../types/npi.types.js';
import { NpiLot } from '../npi.db.types.js';

export class NpiMapper {
  /**
   * Map database record to list DTO
   */
  toListDTO(record: NpiLot & Record<string, unknown>): NpiListDTO {
    return {
      ...record,
      status: mapStatusFromDB(record.request_status),
      created_at: record.datecreated,
    } as NpiListDTO;
  }

  /**
   * Map multiple records to list DTOs
   */
  toListDTOs(records: (NpiLot & Record<string, unknown>)[]): NpiListDTO[] {
    return records.map(r => this.toListDTO(r));
  }

  /**
   * Map database record with relations to detail DTO
   */
  toDetailDTO(data: NpiDetailQueryResult): NpiDetailDTO {
    const { record, attachments, visual_categories, data_categories, dimension_categories, cc_list } = data;

    return {
      ...record,
      status: mapStatusFromDB(record.request_status),
      created_at: record.datecreated,
      attachments: attachments || [],
      visual_categories: visual_categories || [],
      data_categories: data_categories || [],
      dimension_categories: dimension_categories || [],
      cc_list: cc_list || []
    } as NpiDetailDTO;
  }

  /**
   * Parse date string/object to Date or null
   */
  parseDate(d?: Date | string | null): Date | null {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
