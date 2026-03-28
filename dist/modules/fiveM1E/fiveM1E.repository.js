import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { fiveM1eActionItemsRepository } from './repositories/fiveM1e-action-items.repository.js';
import { fiveM1eAttachmentsRepository } from './repositories/fiveM1e-attachments.repository.js';
import { fiveM1eCcRepository } from './repositories/fiveM1e-cc.repository.js';
import { fiveM1eCheckItemsRepository } from './repositories/fiveM1e-check-items.repository.js';
import { fiveM1eCommandRepository } from './repositories/fiveM1e-command.repository.js';
import { fiveM1eNotificationRepository } from './repositories/fiveM1e-notification.repository.js';
import { fiveM1ePartsRepository } from './repositories/fiveM1e-parts.repository.js';
import { fiveM1eQueryRepository } from './repositories/fiveM1e-query.repository.js';
import { fiveM1eRemarksRepository } from './repositories/fiveM1e-remarks.repository.js';
export class FiveM1ERepository extends BaseRepository {
    constructor() {
        super('TBL_5M1E_Application');
    }
    findWithApproval(idOrControlNo) {
        return fiveM1eQueryRepository.findWithApproval(idOrControlNo);
    }
    findAllWithApproval(statusFilter) {
        return fiveM1eQueryRepository.findAllWithApproval(statusFilter);
    }
    createWithApproval(appData, approvalStatus = 'DRAFT', approvalData = {}) {
        return fiveM1eCommandRepository.createWithApproval(appData, approvalStatus, approvalData);
    }
    updateByControlNo(idOrControlNo, updateData) {
        return fiveM1eCommandRepository.updateByControlNo(idOrControlNo, updateData);
    }
    updateApprovalStatus(controlNo, status, extraFields) {
        return fiveM1eCommandRepository.updateApprovalStatus(controlNo, status, extraFields);
    }
    renameControlNo(oldControlNo, newControlNo) {
        return fiveM1eCommandRepository.renameControlNo(oldControlNo, newControlNo);
    }
    deleteApproval(controlNo) {
        return fiveM1eCommandRepository.deleteApproval(controlNo);
    }
    deleteByControlNo(controlNo) {
        return fiveM1eCommandRepository.deleteByControlNo(controlNo);
    }
    findParts(controlNo) {
        return fiveM1ePartsRepository.findParts(controlNo);
    }
    insertParts(controlNo, parts) {
        return fiveM1ePartsRepository.insertParts(controlNo, parts);
    }
    replaceParts(controlNo, parts) {
        return fiveM1ePartsRepository.replaceParts(controlNo, parts);
    }
    findAttachments(controlNo) {
        return fiveM1eAttachmentsRepository.findAttachments(controlNo);
    }
    reserveAttachmentIds(count, trxOrDb) {
        return fiveM1eAttachmentsRepository.reserveAttachmentIds(count, trxOrDb);
    }
    insertAttachments(controlNo, attachments) {
        return fiveM1eAttachmentsRepository.insertAttachments(controlNo, attachments);
    }
    replaceAttachments(controlNo, attachments) {
        return fiveM1eAttachmentsRepository.replaceAttachments(controlNo, attachments);
    }
    findActionItems(controlNo) {
        return fiveM1eActionItemsRepository.findActionItems(controlNo);
    }
    insertActionItems(controlNo, items) {
        return fiveM1eActionItemsRepository.insertActionItems(controlNo, items);
    }
    replaceActionItems(controlNo, items) {
        return fiveM1eActionItemsRepository.replaceActionItems(controlNo, items);
    }
    findCheckItems(controlNo) {
        return fiveM1eCheckItemsRepository.findCheckItems(controlNo);
    }
    insertCheckItems(controlNo, items) {
        return fiveM1eCheckItemsRepository.insertCheckItems(controlNo, items);
    }
    replaceCheckItems(controlNo, items) {
        return fiveM1eCheckItemsRepository.replaceCheckItems(controlNo, items);
    }
    deleteActionItemAttachmentsByControlNo(controlNo) {
        return fiveM1eActionItemsRepository.deleteActionItemAttachmentsByControlNo(controlNo);
    }
    insertActionItemAttachments(actionItemId, attachments) {
        return fiveM1eActionItemsRepository.insertActionItemAttachments(actionItemId, attachments);
    }
    deleteCheckItemAttachmentsByControlNo(controlNo) {
        return fiveM1eCheckItemsRepository.deleteCheckItemAttachmentsByControlNo(controlNo);
    }
    insertCheckItemAttachments(checkItemId, attachments) {
        return fiveM1eCheckItemsRepository.insertCheckItemAttachments(checkItemId, attachments);
    }
    findStatusRemarks(controlNo) {
        return fiveM1eRemarksRepository.findStatusRemarks(controlNo);
    }
    insertStatusRemark(controlNo, remark) {
        return fiveM1eRemarksRepository.insertStatusRemark(controlNo, remark);
    }
    replaceStatusRemarks(controlNo, remarks) {
        return fiveM1eRemarksRepository.replaceStatusRemarks(controlNo, remarks);
    }
    findCCUsers(controlNo) {
        return fiveM1eCcRepository.findCCUsers(controlNo);
    }
    findEmailElements(pic, action) {
        return fiveM1eNotificationRepository.findEmailElements(pic, action);
    }
    findUserContactsByIds(userIds) {
        return fiveM1eNotificationRepository.findUserContactsByIds(userIds);
    }
    replaceCCUsers(controlNo, ccList, userId = 'SYSTEM') {
        return fiveM1eCcRepository.replaceCCUsers(controlNo, ccList, userId);
    }
}
export const fiveM1ERepository = new FiveM1ERepository();
