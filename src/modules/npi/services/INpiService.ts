/**
 * NPI Service Interface
 * Defines the contract for NPI business logic operations
 * Type-safe implementation with no 'any' types
 */

import { NPICreationInput, NPIUpdateInput } from '../npi.schema.js';
import { 
  NpiListDTO, 
  NpiDetailDTO, 
  ServiceResponse, 
  CreateRecordResponse,
  UploadedFile,
  NpiWorkflowActorContext,
} from '../types/npi.types.js';

export interface INpiService {
  // CRUD Operations
  getAllRecords(actor?: unknown, filters?: Record<string, string | undefined>): Promise<NpiListDTO[]>;
  getRecordById(id: string): Promise<NpiDetailDTO>;
  createRecord(
    payload: NPICreationInput, 
    userId: string, 
    files?: UploadedFile[]
  ): Promise<ServiceResponse<CreateRecordResponse>>;
  updateRecord(
    id: string, 
    payload: NPIUpdateInput, 
    actor?: NpiWorkflowActorContext, 
    files?: UploadedFile[]
  ): Promise<ServiceResponse<{ id: string }>>;
  deleteRecord(id: string, actor?: NpiWorkflowActorContext): Promise<ServiceResponse<{ id: string }>>;
  
  // Utility Operations
  generateSequence(siteId: string): Promise<string>;
}
