import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { NewFiveM1EApp, FiveM1EAppUpdate } from './fiveM1E.db.types.js';
import { fiveM1eActionItemsRepository } from './repositories/fiveM1e-action-items.repository.js';
import { fiveM1eAttachmentsRepository } from './repositories/fiveM1e-attachments.repository.js';
import { fiveM1eCcRepository } from './repositories/fiveM1e-cc.repository.js';
import { fiveM1eCheckItemsRepository } from './repositories/fiveM1e-check-items.repository.js';
import { fiveM1eCommandRepository } from './repositories/fiveM1e-command.repository.js';
import { fiveM1eNotificationRepository } from './repositories/fiveM1e-notification.repository.js';
import { fiveM1ePartsRepository } from './repositories/fiveM1e-parts.repository.js';
import { fiveM1eQueryRepository } from './repositories/fiveM1e-query.repository.js';
import { fiveM1eRemarksRepository } from './repositories/fiveM1e-remarks.repository.js';

export class FiveM1ERepository extends BaseRepository<'TBL_5M1E_Application'> {
  constructor() {
    super('TBL_5M1E_Application');
  }

  findWithApproval(idOrControlNo: string) {
    return fiveM1eQueryRepository.findWithApproval(idOrControlNo);
  }

  findAllWithApproval(statusFilter?: string) {
    return fiveM1eQueryRepository.findAllWithApproval(statusFilter);
  }

  createWithApproval(
    appData: NewFiveM1EApp,
    approvalStatus = 'DRAFT',
    approvalData: Record<string, unknown> = {},
  ) {
    return fiveM1eCommandRepository.createWithApproval(appData, approvalStatus, approvalData);
  }

  updateByControlNo(idOrControlNo: string, updateData: FiveM1EAppUpdate) {
    return fiveM1eCommandRepository.updateByControlNo(idOrControlNo, updateData);
  }

  updateApprovalStatus(controlNo: string, status: string, extraFields?: Record<string, unknown>) {
    return fiveM1eCommandRepository.updateApprovalStatus(controlNo, status, extraFields);
  }

  renameControlNo(oldControlNo: string, newControlNo: string) {
    return fiveM1eCommandRepository.renameControlNo(oldControlNo, newControlNo);
  }

  deleteApproval(controlNo: string) {
    return fiveM1eCommandRepository.deleteApproval(controlNo);
  }

  deleteByControlNo(controlNo: string) {
    return fiveM1eCommandRepository.deleteByControlNo(controlNo);
  }

  findParts(controlNo: string) {
    return fiveM1ePartsRepository.findParts(controlNo);
  }

  insertParts(controlNo: string, parts: Array<{ part_id?: string }>) {
    return fiveM1ePartsRepository.insertParts(controlNo, parts);
  }

  replaceParts(controlNo: string, parts: Array<{ part_id?: string }>) {
    return fiveM1ePartsRepository.replaceParts(controlNo, parts);
  }

  findAttachments(controlNo: string) {
    return fiveM1eAttachmentsRepository.findAttachments(controlNo);
  }

  reserveAttachmentIds(count: number, trxOrDb?: any) {
    return fiveM1eAttachmentsRepository.reserveAttachmentIds(count, trxOrDb);
  }

  insertAttachments(controlNo: string, attachments: Array<{ id?: string; file_name?: string; attribute_1?: string; attribute_2?: string }>) {
    return fiveM1eAttachmentsRepository.insertAttachments(controlNo, attachments);
  }

  replaceAttachments(controlNo: string, attachments: Array<{ id?: string; file_name?: string; attribute_1?: string; attribute_2?: string }>) {
    return fiveM1eAttachmentsRepository.replaceAttachments(controlNo, attachments);
  }

  findActionItems(controlNo: string) {
    return fiveM1eActionItemsRepository.findActionItems(controlNo);
  }

  insertActionItems(controlNo: string, items: Array<{ action_item?: string; pic?: string; first_target_dt?: string; verification_result?: string; remarks?: string }>) {
    return fiveM1eActionItemsRepository.insertActionItems(controlNo, items);
  }

  replaceActionItems(controlNo: string, items: Array<{ action_item?: string; pic?: string; first_target_dt?: string; verification_result?: string; remarks?: string }>) {
    return fiveM1eActionItemsRepository.replaceActionItems(controlNo, items);
  }

  findCheckItems(controlNo: string) {
    return fiveM1eCheckItemsRepository.findCheckItems(controlNo);
  }

  insertCheckItems(controlNo: string, items: Array<{ check_item?: string; judgement?: string; remarks?: string; attribute_1?: string; attribute_2?: string }>) {
    return fiveM1eCheckItemsRepository.insertCheckItems(controlNo, items);
  }

  replaceCheckItems(controlNo: string, items: Array<{ check_item?: string; judgement?: string; remarks?: string; attribute_1?: string; attribute_2?: string }>) {
    return fiveM1eCheckItemsRepository.replaceCheckItems(controlNo, items);
  }

  deleteActionItemAttachmentsByControlNo(controlNo: string) {
    return fiveM1eActionItemsRepository.deleteActionItemAttachmentsByControlNo(controlNo);
  }

  insertActionItemAttachments(actionItemId: number, attachments: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>) {
    return fiveM1eActionItemsRepository.insertActionItemAttachments(actionItemId, attachments);
  }

  deleteCheckItemAttachmentsByControlNo(controlNo: string) {
    return fiveM1eCheckItemsRepository.deleteCheckItemAttachmentsByControlNo(controlNo);
  }

  insertCheckItemAttachments(checkItemId: number, attachments: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>) {
    return fiveM1eCheckItemsRepository.insertCheckItemAttachments(checkItemId, attachments);
  }

  findStatusRemarks(controlNo: string) {
    return fiveM1eRemarksRepository.findStatusRemarks(controlNo);
  }

  insertStatusRemark(controlNo: string, remark: { remarks?: string; remark_by: string; status: string }) {
    return fiveM1eRemarksRepository.insertStatusRemark(controlNo, remark);
  }

  replaceStatusRemarks(controlNo: string, remarks: Array<{ remarks?: string; remark_by: string; status: string; create_date?: string }>) {
    return fiveM1eRemarksRepository.replaceStatusRemarks(controlNo, remarks);
  }

  findCCUsers(controlNo: string) {
    return fiveM1eCcRepository.findCCUsers(controlNo);
  }

  findEmailElements(pic: string, action: string) {
    return fiveM1eNotificationRepository.findEmailElements(pic, action);
  }

  findUserContactsByIds(userIds: string[]) {
    return fiveM1eNotificationRepository.findUserContactsByIds(userIds);
  }

  replaceCCUsers(controlNo: string, ccList: any[], userId: string = 'SYSTEM') {
    return fiveM1eCcRepository.replaceCCUsers(controlNo, ccList, userId);
  }
}

export const fiveM1ERepository = new FiveM1ERepository();
