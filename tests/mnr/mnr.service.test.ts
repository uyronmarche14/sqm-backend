import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllDetailed: vi.fn(),
  findByIdDetailed: vi.fn(),
  findLatestResponsesByMnrIds: vi.fn(),
  executeTransaction: vi.fn(),
}));

vi.mock('../../src/modules/mnr/mnr.repository.js', () => ({
  mnrRepository: repositoryMock,
}));

import { mnrService } from '../../src/modules/mnr/mnr.service.js';

describe('MnrService workflow metadata hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findLatestResponsesByMnrIds.mockResolvedValue([]);
  });

  it('includes workflow metadata on detail reads', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue({
      record: {
        mnr_id: 'mnr-1',
        control_no: 'MNR-001',
        request_status: 'SU',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        actual_initial_report_date: null,
        actual_final_report_date: null,
        remarks: null,
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        issuer_date: null,
        issuer_remarks: null,
        checker_date: null,
        checker_remarks: null,
        approver_date: null,
        approver_remarks: null,
        site_name: 'Site',
        supplier_name: 'Supplier',
        product_name: 'Product',
        model_name: 'Model',
        model_no: 'ModelNo',
        mfg_area_name: 'Area',
        category_name: 'Category',
        mnr_type_name: 'Type',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        attention_name: 'Attention',
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
      },
      details: [],
      response: null,
      verificationEntries: [],
      ccList: [],
      attachments: [],
      responseAttachments: [],
    });

    const result = await mnrService.getRecordById('mnr-1', 'checker-1');

    expect(result.workflow).toEqual(expect.objectContaining({
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker',
    }));
    expect(result.mainDetails).toEqual(expect.objectContaining({
      status: 'AWAITING_CHECKED',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      availableActions: ['check-main', 'reject-main'],
    }));
  });

  it('includes actor-aware cycle 1 availableActions on list reads', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-1',
        control_no: 'MNR-001',
        status: 'SU',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Attention',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);

    const result = await mnrService.getAllRecords('SUBMITTED', 'checker-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      status: 'AWAITING_CHECKED',
      workflowStage: 'CHECKER',
      workflowStageCode: '3',
      availableActions: ['check-main', 'reject-main'],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker',
    }));
  });

  it('hydrates cycle 2 next approver names from the latest response row on list reads', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-2',
        control_no: 'MNR-002',
        status: 'RC',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'cycle1-checker',
        approver_id: 'cycle1-approver',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Attention',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);
    repositoryMock.findLatestResponsesByMnrIds.mockResolvedValue([
      {
        mnr_id: 'mnr-2',
        checker_id: 'cycle2-checker',
        checker_name: 'Cycle 2 Checker',
        approver_id: 'cycle2-approver',
        approver_name: 'Cycle 2 Approver',
      },
    ]);

    const result = await mnrService.getAllRecords('RESPONSE_AWAITING_CHECKED', 'cycle2-checker');

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'RESPONSE_AWAITING_CHECKED',
      workflowStage: 'CHECKER_2ND',
      workflowStageCode: '16',
      nextApproverId: 'cycle2-checker',
      nextApproverName: 'Cycle 2 Checker',
      response_checker_id: 'cycle2-checker',
      response_checker_name: 'Cycle 2 Checker',
      response_approver_id: 'cycle2-approver',
      response_approver_name: 'Cycle 2 Approver',
    }));
  });

  it('hydrates final issuer actions for response approval stage 19 on list reads', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-3',
        control_no: 'MNR-003',
        status: 'RV',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'attention-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: null,
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        approver_id: 'cycle1-approver',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Attention',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);

    const result = await mnrService.getAllRecords('RESPONSE_RECEIVED', 'issuer-1');

    expect(result[0]).toEqual(expect.objectContaining({
      status: 'RESPONSE_RECEIVED',
      workflowStage: 'ISSUER_3RD',
      workflowStageCode: '19',
      availableActions: ['accept-response', 'not-accept-response'],
      nextApproverId: 'issuer-1',
      nextApproverName: 'Issuer',
    }));
  });

  it('hydrates supplier response actions on issued list reads when attention matches the actor', async () => {
    repositoryMock.findAllDetailed.mockResolvedValue([
      {
        id: 'mnr-4',
        control_no: 'MNR-004',
        status: 'IS',
        date_created: new Date('2026-03-12'),
        site_id: 'site-1',
        supplier_id: 'supplier-1',
        model_id: 'model-1',
        product_id: 'product-1',
        mfg_area_id: 'area-1',
        defectcategory_id: 'defect-cat-1',
        mnrtype_id: 'type-1',
        attention_id: 'supplier-user-1',
        reference_no: null,
        report_issuance_8d: 1,
        recurrence_ref: null,
        issued_date: new Date('2026-03-12'),
        initial_report_date: null,
        due_date: null,
        last_update: new Date('2026-03-12'),
        updateby: 'issuer-1',
        encoder_id: 'encoder-1',
        issuer_id: 'issuer-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        supplier_name: 'Supplier',
        model_name: 'Model',
        product_name: 'Product',
        site_name: 'Site',
        encoder_name: 'Encoder',
        issuer_name: 'Issuer',
        checker_name: 'Checker',
        approver_name: 'Approver',
        mnr_type_name: 'Type',
        category_name: 'Category',
        attention_name: 'Supplier User',
        part_name: 'Part',
        part_code: 'P-001',
      },
    ]);

    const result = await mnrService.getAllRecords('ISSUED', 'supplier-user-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      status: 'ISSUED',
      workflowStage: 'SUPPLIER',
      workflowStageCode: '11',
      availableActions: ['save-initial-response', 'submit-initial-response'],
      nextApproverId: 'supplier-user-1',
    }));
  });
});
