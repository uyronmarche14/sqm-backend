/**
 * NPI Module - TypeScript Type Definitions
 * Replaces all 'any' types with proper type safety
 */

import { 
  NpiLot, 
  NpiAttachment, 
  NpiVisualcat, 
  NpiDatacat, 
  NpiDimensioncat, 
  NpiCc 
} from '../npi.db.types.js';

// ============================================================================
// DTO Types (Data Transfer Objects)
// ============================================================================

/**
 * NPI List DTO - Used for list views
 */
export interface NpiListDTO {
  npi_lot_id: string;
  control_no: string;
  status: string; // Mapped from request_status
  created_at: Date | string; // Mapped from datecreated
  site_id: string;
  site_name?: string;
  supplier_id: string;
  supplier_name?: string;
  part_id: string;
  part_name?: string;
  part_code?: string;
  model_id: string;
  model_name?: string;
  lot_no: string;
  lot_size: number;
  inspection_date: Date | string;
  request_status: string; // DB status code
  inspected_by_name?: string;
  checker_name?: string;
  approver_name?: string;
}

/**
 * NPI Detail DTO - Used for detail views with all relations
 */
export interface NpiDetailDTO extends Omit<NpiLot, 'request_status' | 'datecreated'> {
  status: string; // Mapped from request_status
  created_at?: Date | string; // Mapped from datecreated
  
  // Related data
  attachments: NpiAttachment[];
  visual_categories: NpiVisualcat[];
  data_categories: NpiDatacat[];
  dimension_categories: NpiDimensioncat[];
  cc_list: NpiCcWithUser[];
  
  // Joined names (from related tables)
  site_name?: string;
  supplier_name?: string;
  part_name?: string;
  part_code?: string;
  model_name?: string;
  parttype_name?: string;
  partclass_name?: string;
  inspectionmethod_name?: string;
  inspectioncat_name?: string;
  severity_name?: string;
  disposition_name?: string;
  inspected_by_name?: string;
  data_verified_by_name?: string;
  checker_name?: string;
  approver_name?: string;
}

/**
 * NPI CC with user information
 */
export interface NpiCcWithUser extends NpiCc {
  user_name?: string | null;
}

/**
 * Repository query result with all relations
 */
export interface NpiDetailQueryResult {
  record: NpiLot;
  attachments: NpiAttachment[];
  visual_categories: NpiVisualcat[];
  data_categories: NpiDatacat[];
  dimension_categories: NpiDimensioncat[];
  cc_list: NpiCcWithUser[];
}

// ============================================================================
// Input Types (from schema)
// ============================================================================

/**
 * Attachment input
 */
export interface NpiAttachmentInput {
  npi_attachment_id?: string;
  fileName?: string;
  file_name?: string;
  file_extension?: string;
  remarks?: string;
}

/**
 * Visual category input
 */
export interface NpiVisualCategoryInput {
  defectclass_id: string;
  defect_id: string;
  quantity: number;
}

/**
 * Data category input
 */
export interface NpiDataCategoryInput {
  partdatacategory_name: string;
  std_min: number;
  std_max: number;
  actual_min?: number | null;
  actual_max?: number | null;
  cpk?: number | null;
  remarks?: string;
}

/**
 * Dimension category input
 */
export interface NpiDimensionCategoryInput {
  partdimensioncategory_name: string;
  std_min: number;
  std_max: number;
  actual_min?: number | null;
  actual_max?: number | null;
  cpk?: number | null;
  remarks?: string;
}

/**
 * CC list input
 */
export interface NpiCcInput {
  user_id?: string;
  email?: string;
}

// ============================================================================
// Service Response Types
// ============================================================================

/**
 * Standard service response
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Create record response
 */
export interface CreateRecordResponse {
  id: string;
}

/**
 * Workflow action response
 */
export interface WorkflowActionResponse {
  id: string;
  status?: string;
}

// ============================================================================
// Internal Service Types
// ============================================================================

/**
 * Context for building create payload
 */
export interface CreatePayloadContext {
  npiId: string;
  controlNo: string;
  now: Date;
  effectiveUserId: string;
  dbStatus: string;
  defaultInspector: string | null;
}

/**
 * File upload information
 */
export interface UploadedFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
}

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * Workflow status codes (database)
 */
export type WorkflowStatusDB = 
  | 'DR'  // Draft
  | 'SU'  // Submitted
  | 'CK'  // Checked
  | 'AP'  // Approved
  | 'RA'  // Rejected
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CHECKED'
  | 'APPROVED'
  | 'REJECTED';

/**
 * Workflow actions
 */
export type WorkflowAction = 
  | 'submit'
  | 'check'
  | 'approve'
  | 'reject';

/**
 * User roles
 */
export type UserRole = 
  | 'creator'
  | 'checker'
  | 'approver'
  | 'admin';

// ============================================================================
// Query Types
// ============================================================================

/**
 * Filter options for queries
 */
export interface QueryFilterOptions {
  status?: string | string[];
  siteId?: string;
  supplierId?: string;
  dateFrom?: Date | string;
  dateTo?: Date;
  search?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Complete query options
 */
export interface QueryOptions {
  filters?: QueryFilterOptions;
  pagination?: PaginationOptions;
  sort?: SortOptions;
}

// ============================================================================
// Kysely Transaction Types
// ============================================================================

/**
 * Kysely transaction type for NPI operations
 * This is the proper type for transaction callbacks
 */
import type { Transaction as KyselyTransaction } from 'kysely';
import type { Database as DatabaseType } from '../../shared/infrastructure/db.types.js';

export type NpiTransaction = KyselyTransaction<DatabaseType>;

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Status statistics
 */
export interface StatusStatistics {
  status: string;
  count: number;
}

/**
 * Dashboard statistics
 */
export interface DashboardStatistics {
  total: number;
  draft: number;
  submitted: number;
  checked: number;
  approved: number;
  rejected: number;
  byStatus: StatusStatistics[];
}
