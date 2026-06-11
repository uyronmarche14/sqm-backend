import {
  SQMP_STAGE_CODE,
  SQMP_WORKFLOW_ACTION_LABEL,
  SQMP_WORKFLOW_STAGE_DEFINITION,
  SQMP_WORKFLOW_ACTION,
  type SqmpWorkflowAction,
} from './workflow.constants.js';
import { isAdminRole } from '../../../shared/utils/admin.utils.js';

export interface SqmpActorMetadataInput {
  record: any;
  latestResponse?: any;
  userId?: string;
  roleName?: string;
  userSiteId?: string | null;
  supplierIds?: string[];
}

export interface SqmpWorkflowMetadata {
  workflowStage: string;
  workflowStageCode: string;
  workflowStageName: string;
  workflowStageLabel: string;
  status: string;
  nextApproverId: string | null;
  nextApproverName: string | null;
  availableActions: SqmpWorkflowAction[];
}

const isGlobalRole = (roleName?: string) => isAdminRole(roleName);

const isSupplierRole = (roleName?: string) => (roleName || '').toUpperCase().includes('SUPPLIER');

const hasSqmpSupplierAccess = (record: any, userId?: string, supplierIds: string[] = []) => {
  if (!record || !userId) return false;

  return supplierIds.includes(record.supplier_id) || record.attention_id === userId;
};

const SQMP_STAGE_ALIAS_TO_CODE: Record<string, string> = {
  '1': SQMP_STAGE_CODE.CLOSED,
  CL: SQMP_STAGE_CODE.CLOSED,
  CLOSED: SQMP_STAGE_CODE.CLOSED,
  '2': SQMP_STAGE_CODE.DRAFT,
  DR: SQMP_STAGE_CODE.DRAFT,
  NW: SQMP_STAGE_CODE.DRAFT,
  NEW: SQMP_STAGE_CODE.DRAFT,
  PL: SQMP_STAGE_CODE.DRAFT,
  PLANNED: SQMP_STAGE_CODE.DRAFT,
  DRAFT: SQMP_STAGE_CODE.DRAFT,
  '3': SQMP_STAGE_CODE.CHECKER,
  SU: SQMP_STAGE_CODE.CHECKER,
  AC: SQMP_STAGE_CODE.CHECKER,
  SUBMITTED: SQMP_STAGE_CODE.CHECKER,
  AWAITING_CHECKED: SQMP_STAGE_CODE.CHECKER,
  CHECKER: SQMP_STAGE_CODE.CHECKER,
  '4': SQMP_STAGE_CODE.APPROVER,
  CK: SQMP_STAGE_CODE.APPROVER,
  AA: SQMP_STAGE_CODE.APPROVER,
  CHECKED: SQMP_STAGE_CODE.APPROVER,
  AWAITING_APPROVAL: SQMP_STAGE_CODE.APPROVER,
  APPROVER: SQMP_STAGE_CODE.APPROVER,
  '5': SQMP_STAGE_CODE.REJECTED_BY_CHECKER,
  REJECT_CHECKER: SQMP_STAGE_CODE.REJECTED_BY_CHECKER,
  REJECTED_BY_CHECKER: SQMP_STAGE_CODE.REJECTED_BY_CHECKER,
  '6': SQMP_STAGE_CODE.REJECTED_BY_APPROVER,
  REJECT_APPROVER: SQMP_STAGE_CODE.REJECTED_BY_APPROVER,
  REJECTED_BY_APPROVER: SQMP_STAGE_CODE.REJECTED_BY_APPROVER,
  '9': SQMP_STAGE_CODE.CANCELLED,
  CA: SQMP_STAGE_CODE.CANCELLED,
  CANCEL: SQMP_STAGE_CODE.CANCELLED,
  CANCELLED: SQMP_STAGE_CODE.CANCELLED,
  '10': SQMP_STAGE_CODE.ISSUER,
  AP: SQMP_STAGE_CODE.ISSUER,
  AW: SQMP_STAGE_CODE.ISSUER,
  APPROVED: SQMP_STAGE_CODE.ISSUER,
  APPROVEDWC: SQMP_STAGE_CODE.ISSUER,
  ISSUER: SQMP_STAGE_CODE.ISSUER,
  '11': SQMP_STAGE_CODE.SUPPLIER,
  IS: SQMP_STAGE_CODE.SUPPLIER,
  RW: SQMP_STAGE_CODE.SUPPLIER,
  RV: SQMP_STAGE_CODE.SUPPLIER,
  '13': SQMP_STAGE_CODE.SUPPLIER,
  INITIALRESPONSE: SQMP_STAGE_CODE.SUPPLIER,
  INITIAL_RESPONSE: SQMP_STAGE_CODE.SUPPLIER,
  '14': SQMP_STAGE_CODE.SUPPLIER,
  FINALRESPONSE: SQMP_STAGE_CODE.SUPPLIER,
  FINAL_RESPONSE: SQMP_STAGE_CODE.SUPPLIER,
  ISSUED: SQMP_STAGE_CODE.SUPPLIER,
  RESPONSE_AWAITING: SQMP_STAGE_CODE.SUPPLIER,
  RESPONSE_RECEIVED: SQMP_STAGE_CODE.SUPPLIER,
  SUPPLIER: SQMP_STAGE_CODE.SUPPLIER,
  '15': SQMP_STAGE_CODE.ISSUER_2ND,
  RS: SQMP_STAGE_CODE.ISSUER_2ND,
  RESPONSE_SUBMITTED: SQMP_STAGE_CODE.ISSUER_2ND,
  ISSUER2ND: SQMP_STAGE_CODE.ISSUER_2ND,
  ISSUER_2ND: SQMP_STAGE_CODE.ISSUER_2ND,
  '16': SQMP_STAGE_CODE.CHECKER_2ND,
  RC: SQMP_STAGE_CODE.CHECKER_2ND,
  RESPONSE_AWAITING_CHECKED: SQMP_STAGE_CODE.CHECKER_2ND,
  CHECKER2ND: SQMP_STAGE_CODE.CHECKER_2ND,
  CHECKER_2ND: SQMP_STAGE_CODE.CHECKER_2ND,
  '17': SQMP_STAGE_CODE.APPROVER_2ND,
  RA: SQMP_STAGE_CODE.APPROVER_2ND,
  RESPONSE_AWAITING_APPROVAL: SQMP_STAGE_CODE.APPROVER_2ND,
  APPROVER2ND: SQMP_STAGE_CODE.APPROVER_2ND,
  APPROVER_2ND: SQMP_STAGE_CODE.APPROVER_2ND,
  '19': SQMP_STAGE_CODE.ISSUER_3RD,
  ISSUER3RD: SQMP_STAGE_CODE.ISSUER_3RD,
  ISSUER_3RD: SQMP_STAGE_CODE.ISSUER_3RD,
  '21': SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND,
  REJECTED_BY_CHECKER_2ND: SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND,
  '22': SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND,
  RJ: SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND,
  RESPONSE_REJECTED: SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND,
  REJECTED_BY_APPROVER_2ND: SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND,
  '24': SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
  '20': SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
  REJECT_ISSUER2ND: SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
  REJECT_ISSUER_2ND: SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
  REJECTED_BY_ISSUER_2ND: SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
  NOT_ACCEPT: SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
  NOT_ACCEPTED_BY_ISSUER: SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
};

export const normalizeSqmpStageCode = (value?: unknown): string => {
  if (value === null || value === undefined || value === '') return SQMP_STAGE_CODE.DRAFT;

  const normalized = String(value).trim().toUpperCase();
  return SQMP_STAGE_ALIAS_TO_CODE[normalized] || String(value).trim();
};

export const resolveSqmpStageCode = (record?: any, latestResponse?: any): string => {
  const normalized = normalizeSqmpStageCode(record?.request_status);

  if (String(record?.request_status || '').trim().toUpperCase() === 'RE') {
    return record?.approver_date || record?.approver_remarks
      ? SQMP_STAGE_CODE.REJECTED_BY_APPROVER
      : SQMP_STAGE_CODE.REJECTED_BY_CHECKER;
  }

  if (String(record?.request_status || '').trim().toUpperCase() === 'RJ') {
    if (latestResponse?.accept_date) {
      return SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER;
    }
    return latestResponse?.approver_date || latestResponse?.approver_remarks
      ? SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND
      : SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND;
  }

  if (String(record?.request_status || '').trim().toUpperCase() === 'RA' && (latestResponse?.approver_date || latestResponse?.approver_remarks)) {
    return SQMP_STAGE_CODE.ISSUER_3RD;
  }

  return normalized;
};

const getSqmpStageDefinition = (record?: any, latestResponse?: any) => {
  const code = resolveSqmpStageCode(record, latestResponse);
  return SQMP_WORKFLOW_STAGE_DEFINITION[code as keyof typeof SQMP_WORKFLOW_STAGE_DEFINITION]
    || SQMP_WORKFLOW_STAGE_DEFINITION[SQMP_STAGE_CODE.DRAFT];
};

export const mapSqmpStageCodeToWorkflowStage = (value?: unknown): string => {
  const code = normalizeSqmpStageCode(value);
  return (
    SQMP_WORKFLOW_STAGE_DEFINITION[code as keyof typeof SQMP_WORKFLOW_STAGE_DEFINITION]
    || SQMP_WORKFLOW_STAGE_DEFINITION[SQMP_STAGE_CODE.DRAFT]
  ).name;
};

export const mapSqmpStageCodeToStatus = (value?: unknown): string => {
  const code = normalizeSqmpStageCode(value);
  return (
    SQMP_WORKFLOW_STAGE_DEFINITION[code as keyof typeof SQMP_WORKFLOW_STAGE_DEFINITION]
    || SQMP_WORKFLOW_STAGE_DEFINITION[SQMP_STAGE_CODE.DRAFT]
  ).status;
};

export const getSqmpWorkflowActionLabel = (action: SqmpWorkflowAction): string =>
  SQMP_WORKFLOW_ACTION_LABEL[action];

export const canUserAccessSqmpRecord = ({
  record,
  latestResponse,
  userId,
  roleName,
  userSiteId,
  supplierIds = [],
}: SqmpActorMetadataInput): boolean => {
  if (!record || !userId) return true;
  if (isGlobalRole(roleName)) return true;

  if (isSupplierRole(roleName)) {
    return hasSqmpSupplierAccess(record, userId, supplierIds);
  }

  return [
    record.encoder_id,
    record.issuer_id,
    record.checker_id,
    record.approver_id,
    latestResponse?.checker_id,
    latestResponse?.approver_id,
  ].includes(userId) || (!!userSiteId && record.site_id === userSiteId);
};

export const getSqmpNextApprover = (record: any, latestResponse?: any) => {
  const stageCode = resolveSqmpStageCode(record, latestResponse);

  switch (stageCode) {
    case SQMP_STAGE_CODE.CHECKER:
      return {
        nextApproverId: record?.checker_id || null,
        nextApproverName: record?.checker_name || null,
      };
    case SQMP_STAGE_CODE.APPROVER:
      return {
        nextApproverId: record?.approver_id || null,
        nextApproverName: record?.approver_name || null,
      };
    case SQMP_STAGE_CODE.SUPPLIER:
    case SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER:
      return {
        nextApproverId: record?.attention_id || record?.supplier_id || null,
        nextApproverName: record?.attention_name || record?.supplier_name || null,
      };
    case SQMP_STAGE_CODE.ISSUER:
    case SQMP_STAGE_CODE.ISSUER_2ND:
    case SQMP_STAGE_CODE.ISSUER_3RD:
    case SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND:
    case SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND:
      return {
        nextApproverId: record?.issuer_id || null,
        nextApproverName: record?.issuer_name || null,
      };
    case SQMP_STAGE_CODE.CHECKER_2ND:
      return {
        nextApproverId: latestResponse?.checker_id || null,
        nextApproverName: latestResponse?.checker_name || null,
      };
    case SQMP_STAGE_CODE.APPROVER_2ND:
      return {
        nextApproverId: latestResponse?.approver_id || null,
        nextApproverName: latestResponse?.approver_name || null,
      };
    default:
      return {
        nextApproverId: null,
        nextApproverName: null,
      };
  }
};

export const getSqmpAvailableActions = ({
  record,
  latestResponse,
  userId,
  roleName,
  supplierIds = [],
}: SqmpActorMetadataInput): SqmpWorkflowAction[] => {
  if (!record || !userId) return [];

  const stageCode = resolveSqmpStageCode(record, latestResponse);
  const globalRole = isGlobalRole(roleName);
  const supplierRole = isSupplierRole(roleName);
  const isOwner = record.encoder_id === userId;
  const isIssuer = record.issuer_id === userId;
  const isChecker = record.checker_id === userId;
  const isApprover = record.approver_id === userId;
  const isSupplier = supplierRole && hasSqmpSupplierAccess(record, userId, supplierIds);
  const isResponseChecker = latestResponse?.checker_id === userId;
  const isResponseApprover = latestResponse?.approver_id === userId;

  const allowInternalSubmit = globalRole || isOwner || isIssuer;
  const allowIssuer = globalRole || isIssuer;
  const allowChecker = globalRole || isChecker;
  const allowApprover = globalRole || isApprover;
  const allowResponseChecker = globalRole || isResponseChecker;
  const allowResponseApprover = globalRole || isResponseApprover;
  const allowSupplier = globalRole || isSupplier;

  switch (stageCode) {
    case SQMP_STAGE_CODE.DRAFT:
    case SQMP_STAGE_CODE.REJECTED_BY_CHECKER:
    case SQMP_STAGE_CODE.REJECTED_BY_APPROVER:
      return [
        ...(allowInternalSubmit ? [SQMP_WORKFLOW_ACTION.SUBMIT_MAIN] : []),
        ...(allowIssuer ? [SQMP_WORKFLOW_ACTION.CANCEL_MAIN] : []),
      ];
    case SQMP_STAGE_CODE.CHECKER:
      return [
        ...(allowChecker ? [SQMP_WORKFLOW_ACTION.CHECK_MAIN, SQMP_WORKFLOW_ACTION.REJECT_MAIN] : []),
        ...(allowIssuer ? [SQMP_WORKFLOW_ACTION.CANCEL_MAIN] : []),
      ];
    case SQMP_STAGE_CODE.APPROVER:
      return [
        ...(allowApprover ? [SQMP_WORKFLOW_ACTION.APPROVE_MAIN, SQMP_WORKFLOW_ACTION.REJECT_MAIN] : []),
        ...(allowIssuer ? [SQMP_WORKFLOW_ACTION.CANCEL_MAIN] : []),
      ];
    case SQMP_STAGE_CODE.ISSUER:
      return [
        ...(allowIssuer ? [SQMP_WORKFLOW_ACTION.ISSUE_MAIN, SQMP_WORKFLOW_ACTION.CANCEL_MAIN] : []),
      ];
    case SQMP_STAGE_CODE.SUPPLIER:
    case SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER:
      return [
        ...(allowSupplier ? [SQMP_WORKFLOW_ACTION.SAVE_RESPONSE, SQMP_WORKFLOW_ACTION.SUBMIT_RESPONSE] : []),
      ];
    case SQMP_STAGE_CODE.ISSUER_2ND:
    case SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND:
    case SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND:
      return [
        ...(allowIssuer ? [SQMP_WORKFLOW_ACTION.SAVE_CLOSURE, SQMP_WORKFLOW_ACTION.SUBMIT_CLOSURE] : []),
      ];
    case SQMP_STAGE_CODE.CHECKER_2ND:
      return [
        ...(allowResponseChecker ? [SQMP_WORKFLOW_ACTION.CHECK_CLOSURE, SQMP_WORKFLOW_ACTION.REJECT_CLOSURE] : []),
      ];
    case SQMP_STAGE_CODE.APPROVER_2ND:
      return [
        ...(allowResponseApprover ? [SQMP_WORKFLOW_ACTION.APPROVE_CLOSURE, SQMP_WORKFLOW_ACTION.REJECT_CLOSURE] : []),
      ];
    case SQMP_STAGE_CODE.ISSUER_3RD:
      return [
        ...(allowIssuer ? [SQMP_WORKFLOW_ACTION.ACCEPT_CLOSURE, SQMP_WORKFLOW_ACTION.NOT_ACCEPT_CLOSURE] : []),
      ];
    default:
      return [];
  }
};

export const buildSqmpWorkflowMetadata = (input: SqmpActorMetadataInput): SqmpWorkflowMetadata => {
  const workflowStageDefinition = getSqmpStageDefinition(input.record, input.latestResponse);
  const workflowStageCode = workflowStageDefinition.code;
  const { nextApproverId, nextApproverName } = getSqmpNextApprover(input.record, input.latestResponse);

  return {
    workflowStage: workflowStageCode,
    workflowStageCode,
    workflowStageName: workflowStageDefinition.name,
    workflowStageLabel: workflowStageDefinition.label,
    status: workflowStageDefinition.status,
    nextApproverId,
    nextApproverName,
    availableActions: getSqmpAvailableActions(input),
  };
};

export const SQMP_LEGACY_STATUS_REMARK = {
  issuedToSupplier: 'Submitted by issuer to supplier',
  submittedBySupplier: 'Submitted by supplier to issuer',
  cancelled: 'Cancelled',
} as const;
