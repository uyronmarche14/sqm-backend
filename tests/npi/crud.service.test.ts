import { beforeEach, describe, expect, it, vi } from 'vitest';

const controlNumberServiceMock = vi.hoisted(() => ({
  buildNpiDraft: vi.fn(),
  getControlNoState: vi.fn(),
}));

const permissionServiceMock = vi.hoisted(() => ({
  checkRolePermission: vi.fn(),
}));

const attachmentServiceMock = vi.hoisted(() => ({
  downloadAttachment: vi.fn(),
}));

const assignmentValidationMock = vi.hoisted(() => ({
  validateChecker: vi.fn(),
  validateApprover: vi.fn(),
}));

const npiLegacyParityServiceMock = vi.hoisted(() => ({
  prepareForCreate: vi.fn(),
  prepareForUpdate: vi.fn(),
  evaluateDetailedRecord: vi.fn(),
  resolveFormState: vi.fn(),
}));

vi.mock('../../src/shared/services/control-number.service.js', () => ({
  controlNumberService: controlNumberServiceMock,
}));

vi.mock('../../src/shared/services/permission.service.js', () => ({
  permissionService: permissionServiceMock,
}));

vi.mock('../../src/shared/services/attachment.service.js', () => ({
  attachmentService: attachmentServiceMock,
}));

vi.mock('../../src/shared/utils/assignment-validation.utils.js', () => ({
  validateChecker: assignmentValidationMock.validateChecker,
  validateApprover: assignmentValidationMock.validateApprover,
}));

vi.mock('../../src/modules/npi/services/NpiLegacyParityService.js', () => ({
  npiLegacyParityService: npiLegacyParityServiceMock,
}));

import { NpiCrudService } from '../../src/modules/npi/services/NpiCrudService.js';
import { NpiMapper } from '../../src/modules/npi/services/NpiMapper.js';

function createTransactionRecorder() {
  const inserted: Array<{ table: string; values: Record<string, unknown> }> = [];
  const deleted: Array<{ table: string; where: [string, string, unknown] }> = [];
  const updated: Array<{ table: string; values: Record<string, unknown>; where: [string, string, unknown] }> = [];

  const insertInto = vi.fn((table: string) => ({
    values: (values: Record<string, unknown>) => ({
      execute: async () => {
        inserted.push({ table, values });
      },
    }),
  }));

  const deleteFrom = vi.fn((table: string) => ({
    where: (column: string, op: string, value: unknown) => ({
      execute: async () => {
        deleted.push({ table, where: [column, op, value] });
      },
    }),
  }));

  const updateTable = vi.fn((table: string) => ({
    set: (values: Record<string, unknown>) => ({
      where: (column: string, op: string, value: unknown) => ({
        execute: async () => {
          updated.push({ table, values, where: [column, op, value] });
        },
      }),
    }),
  }));

  return {
    trx: { insertInto, deleteFrom, updateTable },
    inserted,
    deleted,
    updated,
  };
}

describe('NpiCrudService legacy child-table parity', () => {
  const repository = {
    findAllDetailed: vi.fn(),
    findByIdDetailed: vi.fn(),
    findAttachmentOwner: vi.fn(),
    findDefaultInspector: vi.fn(),
    getNextSequence: vi.fn(),
    executeTransaction: vi.fn(),
  };
  const mapper = new NpiMapper();

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findDefaultInspector.mockResolvedValue('inspector-default');
    repository.getNextSequence.mockResolvedValue(null);
    controlNumberServiceMock.buildNpiDraft.mockResolvedValue('DRF-2026-3-1-SITE');
    controlNumberServiceMock.getControlNoState.mockReturnValue('draft');
    permissionServiceMock.checkRolePermission.mockResolvedValue(false);
    attachmentServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/npi.txt',
      fileName: 'npi.txt',
      mimeType: 'text/plain',
    });
    assignmentValidationMock.validateChecker.mockResolvedValue(undefined);
    assignmentValidationMock.validateApprover.mockResolvedValue(undefined);
    npiLegacyParityServiceMock.prepareForCreate.mockImplementation(async (payload: any) => ({
      visual_categories: payload.visual_categories ?? [],
      data_categories: payload.data_categories ?? [],
      dimension_categories: payload.dimension_categories ?? [],
      noise_categories: payload.noise_categories ?? [],
      material_certificates: payload.material_certificates ?? [],
      sectionJudgments: {
        visual: 'Accept',
        data: 'Accept',
        dimension: 'Accept',
        noise: 'Accept',
        material: 'Accept',
      },
      overallJudgment: 'Accept',
      submitBlockers: [],
      verificationMode: 'DATA',
      dataCategoryReadOnly: false,
      requiresOgiRefNo: false,
      replaceFlags: {
        data: payload.data_categories !== undefined,
        dimension: payload.dimension_categories !== undefined,
        noise: payload.noise_categories !== undefined,
        material: payload.material_certificates !== undefined,
      },
    }));
    npiLegacyParityServiceMock.prepareForUpdate.mockImplementation(async (payload: any) => ({
      visual_categories: payload.visual_categories ?? [],
      data_categories: payload.data_categories ?? [],
      dimension_categories: payload.dimension_categories ?? [],
      noise_categories: payload.noise_categories ?? [],
      material_certificates: payload.material_certificates ?? [],
      sectionJudgments: {
        visual: 'Accept',
        data: 'Accept',
        dimension: 'Accept',
        noise: 'Accept',
        material: 'Accept',
      },
      overallJudgment: 'Accept',
      submitBlockers: [],
      verificationMode: 'DATA',
      dataCategoryReadOnly: false,
      requiresOgiRefNo: false,
      replaceFlags: {
        data: payload.data_categories !== undefined,
        dimension: payload.dimension_categories !== undefined,
        noise: payload.noise_categories !== undefined,
        material: payload.material_certificates !== undefined,
      },
    }));
    npiLegacyParityServiceMock.evaluateDetailedRecord.mockResolvedValue({
      aqlMinorDefect: null,
      aqlMajorDefect: null,
      sampleSize: 0,
      visualJudgment: 'Accept',
      sectionJudgments: {
        visual: 'Accept',
        data: 'Accept',
        dimension: 'Accept',
        noise: 'Accept',
        material: 'Accept',
      },
      overallJudgment: 'Accept',
      submitBlockers: [],
      verificationMode: 'DATA',
      dataCategoryReadOnly: false,
      requiresOgiRefNo: false,
    });
  });

  function createListRecord(overrides: Record<string, unknown> = {}) {
    return {
      npi_lot_id: 'npi-1',
      control_no: 'NPI-001',
      request_status: 'SU',
      datecreated: new Date('2026-03-20'),
      site_id: 'site-1',
      site_name: 'Site 1',
      supplier_id: 'supplier-1',
      supplier_name: 'Supplier 1',
      part_id: 'part-1',
      part_name: 'Part 1',
      part_code: 'PART-001',
      model_id: 'model-1',
      model_name: 'Model 1',
      lot_no: 'LOT-1',
      lot_size: 10,
      inspection_date: new Date('2026-03-20'),
      inspector_id: 'originator-1',
      checker_id: 'checker-1',
      approver_id: 'approver-1',
      checker_name: 'Checker',
      approver_name: 'Approver',
      ...overrides,
    };
  }

  it('persists restored noise categories and material certificates on create', async () => {
    const tx = createTransactionRecorder();
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.createRecord(
      {
        siteId: 'site-1',
        noise_categories: [
          {
            partnoisecategory_name: 'Noise A',
            std_min: 1,
            std_max: 2,
            actual_min: 1.2,
            actual_max: 1.8,
          },
        ],
        material_certificates: [
          {
            component: 'Tin',
            description: 'Material cert',
            required_data: 'RoHS',
            judgement: true,
          },
        ],
      } as any,
      'originator-1',
      [],
    );

    expect(tx.inserted.some((entry) => entry.table === 'NPI_NOISECAT')).toBe(true);
    expect(tx.inserted.some((entry) => entry.table === 'NPI_MATERIALCERT')).toBe(true);
    expect(
      tx.inserted.find((entry) => entry.table === 'NPI_MATERIALCERT')?.values.judgement,
    ).toBe(1);
  });

  it('persists checker and approver when the frontend sends snake_case approval fields', async () => {
    const tx = createTransactionRecorder();
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.createRecord(
      {
        siteId: 'site-1',
        inspector_id: 'inspector-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        inspector_remarks: 'inspector remark',
        checker_remarks: 'checker remark',
        approver_remarks: 'approver remark',
      } as any,
      'originator-1',
      [],
    );

    expect(tx.inserted.find((entry) => entry.table === 'NPI_LOTS')?.values).toEqual(
      expect.objectContaining({
        inspector_id: 'inspector-1',
        checker_id: 'checker-1',
        approver_id: 'approver-1',
        inspector_remarks: 'inspector remark',
        checker_remarks: 'checker remark',
        approver_remarks: 'approver remark',
      }),
    );
  });

  it('replaces restored noise/material rows on update', async () => {
    const tx = createTransactionRecorder();
    repository.findByIdDetailed.mockResolvedValue({
      record: { npi_lot_id: 'npi-1', inspector_id: 'originator-1' },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.updateRecord(
      'npi-1',
      {
        noise_categories: [
          {
            partnoisecategory_name: 'Noise B',
            std_min: 2,
            std_max: 3,
          },
        ],
        material_certificates: [
          {
            component: 'Copper',
            description: 'Updated cert',
            required_data: 'COC',
            judgement: false,
          },
        ],
      } as any,
      { userId: 'originator-1', roleName: 'INTERNAL USER' },
      [],
    );

    expect(tx.deleted).toContainEqual({
      table: 'NPI_NOISECAT',
      where: ['npi_lot_id', '=', 'npi-1'],
    });
    expect(tx.deleted).toContainEqual({
      table: 'NPI_MATERIALCERT',
      where: ['npi_lot_id', '=', 'npi-1'],
    });
    expect(tx.inserted.some((entry) => entry.table === 'NPI_NOISECAT')).toBe(true);
    expect(tx.inserted.some((entry) => entry.table === 'NPI_MATERIALCERT')).toBe(true);
  });

  it('updates checker and approver when the frontend sends snake_case approval fields', async () => {
    const tx = createTransactionRecorder();
    repository.findByIdDetailed.mockResolvedValue({
      record: { npi_lot_id: 'npi-1', inspector_id: 'originator-1' },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new NpiCrudService(repository as any, mapper);

    await service.updateRecord(
      'npi-1',
      {
        checker_id: 'checker-2',
        approver_id: 'approver-2',
        checker_remarks: 'checked',
        approver_remarks: 'approved',
      } as any,
      { userId: 'originator-1', roleName: 'INTERNAL USER' },
      [],
    );

    expect(tx.updated).toContainEqual({
      table: 'NPI_LOTS',
      values: expect.objectContaining({
        checker_id: 'checker-2',
        approver_id: 'approver-2',
        checker_remarks: 'checked',
        approver_remarks: 'approved',
      }),
      where: ['npi_lot_id', '=', 'npi-1'],
    });
  });

  it('returns the full NPI queue to admin users', async () => {
    repository.findAllDetailed.mockResolvedValue([createListRecord()]);

    const service = new NpiCrudService(repository as any, mapper);
    const result = await service.getAllRecords(
      { userId: 'admin-1', roleName: 'TIP ADMIN' },
      { status: 'PENDING' },
    );

    expect(result).toHaveLength(1);
  });

  it('returns history rows to users with explicit search viewList access', async () => {
    repository.findAllDetailed.mockResolvedValue([createListRecord()]);
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'NPILOT-09-05' && action === 'viewlist',
    );

    const service = new NpiCrudService(repository as any, mapper);
    const result = await service.getAllRecords(
      { userId: 'viewer-1', roleName: 'INTERNAL USER' },
      { status: 'PENDING' },
    );

    expect(result).toHaveLength(1);
  });

  it('keeps non-admin users scoped when they do not have queue viewList access', async () => {
    repository.findAllDetailed.mockResolvedValue([createListRecord()]);

    const service = new NpiCrudService(repository as any, mapper);
    const result = await service.getAllRecords(
      { userId: 'viewer-1', roleName: 'INTERNAL USER' },
      { status: 'PENDING' },
    );

    expect(result).toHaveLength(0);
  });

  it('keeps assigned checker access on assigned scope without queue viewList', async () => {
    repository.findAllDetailed.mockResolvedValue([createListRecord()]);

    const service = new NpiCrudService(repository as any, mapper);
    const result = await service.getAllRecords(
      { userId: 'checker-1', roleName: 'INTERNAL USER' },
      { status: 'PENDING', scope: 'assigned' },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      workflowStage: 'CHECKER',
      availableActions: ['check', 'reject'],
    }));
  });

  it('does not let queue viewList widen mine scope', async () => {
    repository.findAllDetailed.mockResolvedValue([createListRecord()]);
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'NPILOT-09-03' && action === 'viewlist',
    );

    const service = new NpiCrudService(repository as any, mapper);
    const result = await service.getAllRecords(
      { userId: 'viewer-1', roleName: 'INTERNAL USER' },
      { status: 'PENDING', scope: 'mine' },
    );

    expect(result).toHaveLength(0);
  });

  it('allows detail reads when the user has explicit search viewList access', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createListRecord(),
      attachments: [],
      visual_categories: [],
      data_categories: [],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
      cc_list: [],
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'NPILOT-09-05' && action === 'viewlist',
    );

    const service = new NpiCrudService(repository as any, mapper);
    const result = await service.getRecordById('npi-1', {
      userId: 'viewer-1',
      roleName: 'INTERNAL USER',
    });

    expect(result.control_no).toBe('NPI-001');
    expect(result.workflowStage).toBe('CHECKER');
  });

  it('does not let queue viewList widen detail access for unrelated users', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createListRecord(),
      attachments: [],
      visual_categories: [],
      data_categories: [],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
      cc_list: [],
    });
    permissionServiceMock.checkRolePermission.mockImplementation(
      async (_userId: string, formId: string, action: string) =>
        formId === 'NPILOT-09-03' && action === 'viewlist',
    );

    const service = new NpiCrudService(repository as any, mapper);

    await expect(
      service.getRecordById('npi-1', {
        userId: 'viewer-1',
        roleName: 'INTERNAL USER',
      }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to view this NPI record.',
    });
  });

  it('rejects updates from unrelated users even when they know the record id', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createListRecord({ request_status: 'DR' }),
    });

    const service = new NpiCrudService(repository as any, mapper);

    await expect(
      service.updateRecord(
        'npi-1',
        { remarks: 'unauthorized change' } as any,
        { userId: 'outsider-1', roleName: 'INTERNAL USER' },
        [],
      ),
    ).rejects.toMatchObject({
      message: 'You do not have permission to update this NPI record.',
    });
  });

  it('blocks deletes once the record has entered an active approval stage', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createListRecord({ request_status: 'SU', inspector_id: 'originator-1' }),
    });

    const service = new NpiCrudService(repository as any, mapper);

    await expect(
      service.deleteRecord('npi-1', { userId: 'originator-1', roleName: 'INTERNAL USER' }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to delete this NPI record.',
    });
  });

  it('downloads attachments for readable records only', async () => {
    repository.findAttachmentOwner.mockResolvedValue({
      npi_attachment_id: 'att-1',
      npi_lot_id: 'npi-1',
    });
    repository.findByIdDetailed.mockResolvedValue({
      record: createListRecord({ request_status: 'DR', inspector_id: 'originator-1' }),
      attachments: [],
      visual_categories: [],
      data_categories: [],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
      cc_list: [],
    });

    const service = new NpiCrudService(repository as any, mapper);
    const result = await service.downloadAttachment('att-1', {
      userId: 'originator-1',
      roleName: 'INTERNAL USER',
    });

    expect(result).toEqual({
      filePath: '/tmp/npi.txt',
      fileName: 'npi.txt',
      mimeType: 'text/plain',
    });
    expect(attachmentServiceMock.downloadAttachment).toHaveBeenCalledWith('npi-main', 'att-1');
  });

  it('rejects attachment downloads for unrelated users', async () => {
    repository.findAttachmentOwner.mockResolvedValue({
      npi_attachment_id: 'att-1',
      npi_lot_id: 'npi-1',
    });
    repository.findByIdDetailed.mockResolvedValue({
      record: createListRecord({ request_status: 'DR', inspector_id: 'originator-1' }),
      attachments: [],
      visual_categories: [],
      data_categories: [],
      dimension_categories: [],
      noise_categories: [],
      material_certificates: [],
      cc_list: [],
    });

    const service = new NpiCrudService(repository as any, mapper);

    await expect(
      service.downloadAttachment('att-1', {
        userId: 'outsider-1',
        roleName: 'INTERNAL USER',
      }),
    ).rejects.toMatchObject({
      message: 'You do not have permission to download this NPI record.',
    });
  });
});
