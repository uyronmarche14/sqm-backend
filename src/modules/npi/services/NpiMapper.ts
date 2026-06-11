/**
 * NPI Mapper
 * Handles DTO transformations for NPI records
 * Type-safe implementation with no 'any' types
 */

import { buildNpiWorkflowMetadata } from '../workflow/npi-workflow.utils.js';
import { 
  NpiListDTO, 
  NpiDetailDTO, 
  NpiDetailQueryResult,
  NpiLegacyParityMetadata,
  NpiWorkflowActorContext,
} from '../types/npi.types.js';
import { NpiLot } from '../npi.db.types.js';

export class NpiMapper {
  /**
   * Map database record to list DTO
   */
  toListDTO(record: NpiLot & Record<string, unknown>, actor?: NpiWorkflowActorContext): NpiListDTO {
    const workflow = buildNpiWorkflowMetadata(record, actor);
    return {
      ...record,
      status: workflow.workflowStatus,
      created_at: record.datecreated,
      ...workflow,
    } as NpiListDTO;
  }

  /**
   * Map multiple records to list DTOs
   */
  toListDTOs(records: (NpiLot & Record<string, unknown>)[], actor?: NpiWorkflowActorContext): NpiListDTO[] {
    return records.map((r) => this.toListDTO(r, actor));
  }

  /**
   * Map database record with relations to detail DTO
   */
  toDetailDTO(
    data: NpiDetailQueryResult,
    actor?: NpiWorkflowActorContext,
    legacyParity?: NpiLegacyParityMetadata,
  ): NpiDetailDTO {
    const {
      record,
      attachments,
      visual_categories,
      data_categories,
      dimension_categories,
      noise_categories,
      material_certificates,
      cc_list,
    } = data;
    const workflow = buildNpiWorkflowMetadata(record as unknown as Record<string, unknown>, actor);

    return {
      ...record,
      status: workflow.workflowStatus,
      created_at: record.datecreated,
      attachments: attachments || [],
      visual_categories: visual_categories || [],
      data_categories: data_categories || [],
      dimension_categories: dimension_categories || [],
      noise_categories: noise_categories || [],
      material_certificates: material_certificates || [],
      cc_list: cc_list || [],
      legacyParity: legacyParity || {
        aqlMinorDefect: null,
        aqlMajorDefect: null,
        sampleSize: Number(record.sample_size || 0),
        visualJudgment: (record.visual_judgment as NpiLegacyParityMetadata['visualJudgment']) || 'Accept',
        sectionJudgments: {
          visual: 'Accept',
          data: 'Accept',
          dimension: 'Accept',
          noise: 'Accept',
          material: 'Accept',
        },
        overallJudgment: (record.judgment as NpiLegacyParityMetadata['overallJudgment']) || 'Accept',
        submitBlockers: [],
        verificationMode: record.ssi_accept ? 'SSI' : 'DATA',
        dataCategoryReadOnly: Boolean(record.ssi_accept),
        requiresOgiRefNo: Boolean(record.ssi_accept),
      },
      ...workflow,
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
