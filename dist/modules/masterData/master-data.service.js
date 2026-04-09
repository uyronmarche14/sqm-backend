import { v4 as uuidv4 } from 'uuid';
import { ROLE_ACCESS_DB_FIELD_MAP, ROLE_ACCESS_PERMISSION_FIELDS, ROLE_ACCESS_PERMISSION_PAYLOAD_MAP, resolvePageRegistryEntry, } from '@sqm/permissions-contract';
import { NotFoundError } from '../../shared/errors/AppError.js';
/**
 * Reusable DTO Mappers to maintain 100% backwards compatibility with the
 * frontend without dirtying the Database layer types.
 */
const mapRoleAccessPermissionRow = (row) => Object.fromEntries(ROLE_ACCESS_PERMISSION_FIELDS.map((field) => [
    ROLE_ACCESS_PERMISSION_PAYLOAD_MAP[field],
    Boolean(row[ROLE_ACCESS_DB_FIELD_MAP[field]]),
]));
export const mapRoleAccessRow = (r) => ({
    id: r.roleaccess_id,
    roleId: r.role_id,
    formId: r.form_id,
    description: r.roleaccess_desc || '',
    isActive: !!r.active_flag,
    permissions: mapRoleAccessPermissionRow(r),
});
function mapFormRegistryMetadata(row) {
    const registryEntry = resolvePageRegistryEntry(row.form_name);
    const isRegistryBacked = Boolean(registryEntry);
    const canonicalRoute = registryEntry?.kind === 'internal'
        ? ''
        : registryEntry?.route || String(row.form_url || '').trim();
    return {
        title: registryEntry?.title || row.form_name,
        url: canonicalRoute,
        menuGroup: registryEntry?.menuGroup || row.menu_group || '',
        kind: registryEntry?.kind || 'page',
        assignable: registryEntry?.assignable ?? false,
        source: isRegistryBacked ? 'registry' : 'database',
        canonicalRoute,
        module: registryEntry?.module,
        pageType: registryEntry?.pageType,
        stage: registryEntry?.stage,
        registryStatus: isRegistryBacked ? 'registry' : 'legacy_unregistered',
    };
}
export const mappers = {
    site: (r) => ({
        id: r.site_id, name: r.site_name, code: r.site_code || '',
        description: r.site_desc || '', isActive: !!r.active_flag
    }),
    supplier: (r) => ({
        id: r.supplier_id, name: r.supplier_name, siteId: r.site_id,
        description: r.supplier_desc || '', location: r.location || '', isActive: !!r.active_flag
    }),
    role: (r) => ({
        id: r.role_id, name: r.role_name, description: r.role_desc || '', isActive: !!r.active_flag
    }),
    model: (r) => ({
        id: r.model_id, name: r.model_name, code: r.model_no || '',
        description: r.model_desc || '', productId: r.product_id, siteId: r.site_id, isActive: !!r.active_flag
    }),
    product: (r) => ({
        id: r.product_id, name: r.product_name, code: r.product_code || '',
        description: r.product_desc || '', siteId: r.site_id, isActive: !!r.active_flag
    }),
    mfgArea: (r) => ({
        id: r.mfg_area_id, name: r.mfg_area_name, description: r.mfg_area_desc || '', isActive: !!r.active_flag
    }),
    partClass: (r) => ({
        id: r.partclass_id, name: r.partclass_name, description: r.partclass_desc || '',
        siteId: r.site_id, isActive: !!r.active_flag
    }),
    defectCat: (r) => ({
        id: r.defectcategory_id, name: r.defectcategory_name, acronym: r.defectcategory_acronym || '',
        description: r.defectcategory_desc || '', isActive: !!r.active_flag
    }),
    defect: (r) => ({
        id: r.defect_id, name: r.defect_name, description: r.defect_desc || '', isActive: !!r.active_flag
    }),
    defectClass: (r) => ({
        id: r.defectclass_id, name: r.defectclass_name, description: r.defectclass_desc || '', isActive: !!r.active_flag
    }),
    disposition: (r) => ({
        id: r.disposition_id, name: r.disposition_name, description: r.disposition_desc || '', isActive: !!r.active_flag
    }),
    severity: (r) => ({
        id: r.severity_id, name: r.severity_name, description: r.severity_desc || '', isActive: !!r.active_flag
    }),
    aql: (r) => ({
        id: r.aql_id, name: r.aql_name, minor: r.minor, major: r.major,
        siteId: r.site_id, description: r.aql_desc || '', isActive: !!r.active_flag
    }),
    inspCat: (r) => ({
        id: r.inspectioncat_id, name: r.inspectioncat_name, description: r.inspectioncat_desc || '', isActive: !!r.active_flag
    }),
    inspMethod: (r) => ({
        id: r.inspectionmethod_id, name: r.inspectionmethod_name, description: r.inspectionmethod_desc || '',
        defaultTemp: r.default_temp, defaultHum: r.default_hum, defaultValue: !!r.default_value, isActive: !!r.active_flag
    }),
    inspector: (r) => ({
        id: r.inspector_id, name: r.inspector_name, description: r.inspector_desc || '', isActive: !!r.active_flag
    }),
    mnrType: (r) => ({
        id: r.mnrtype_id, name: r.mnrtype_name, description: r.mnrtype_desc || '', isActive: !!r.active_flag
    }),
    partType: (r) => ({
        id: r.parttype_id, name: r.parttype_name, code: r.parttype_code || '', description: r.parttype_desc || '', isActive: !!r.active_flag
    }),
    partDataCat: (r) => ({
        id: r.partdatacategory_id, name: r.partdatacategory_name, parentId: r.part_id,
        min: r.minimum, max: r.maximum, description: r.partdatacategory_desc || '', isActive: !!r.active_flag
    }),
    partDimCat: (r) => ({
        id: r.partdimensioncategory_id, name: r.partdimensioncategory_name, parentId: r.part_id,
        min: r.minimum, max: r.maximum, description: r.partdimensioncategory_desc || '', isActive: !!r.active_flag
    }),
    partNoiseCat: (r) => ({
        id: r.partnoisecategory_id, name: r.partnoisecategory_name, parentId: r.part_id,
        min: r.minimum, max: r.maximum, description: r.partnoisecategory_desc || '', isActive: !!r.active_flag
    }),
    partMaster: (r) => ({
        id: r.part_id, code: r.part_code, name: r.part_name, siteId: r.site_id,
        description: r.part_desc || '', classId: r.partclass_id, typeId: r.parttype_id,
        aqlId: r.aql_id, isActive: !!r.active_flag
    }),
    form: (r) => ({
        id: r.form_id,
        name: r.form_name,
        icon: r.icon || '',
        description: r.form_desc || '',
        isActive: !!r.active_flag,
        ...mapFormRegistryMetadata(r),
    }),
    roleAccess: mapRoleAccessRow,
    supplierInfo: (r) => ({
        id: r.supplier_information_id, supplierId: r.supplier_id, firstName: r.first_name,
        middleName: r.middle_name || '', lastName: r.last_name, description: r.supplier_information_desc || '',
        attachmentId: r.attachment_id || '', attachmentName: r.attachment_name || '',
        attachmentExtension: r.attachment_extension || '', isActive: !!r.active_flag
    }),
    auditCat: (r) => ({
        id: r.audit_category_id, name: r.audit_category_name, code: r.audit_category_code,
        description: r.audit_category_desc || '', withRating: r.with_rating, withAuditees: r.with_auditees,
        withAuditors: r.with_auditors, withAttendees: r.with_attendees, withAuditPlan: r.with_audit_plan, isActive: !!r.active_flag
    }),
    auditType: (r) => ({
        id: r.audit_type_id, name: r.audit_type_name, description: r.audit_type_desc || '',
        categoryId: r.audit_category_id, categoryName: r.audit_category_name || '', isActive: !!r.active_flag
    }),
    criteria: (r) => ({
        id: r.criteria_id, name: r.criteria_name, description: r.criteria_desc || '', isActive: !!r.active_flag
    }),
    fiveM1ECat: (r) => ({
        id: r.Category_ID, name: r.Category_name, description: r.Category_desc || '',
        partClassId: r.Partclass_id, partClassName: r.partclass_name || '', siteName: r.site_name || '', isActive: !!r.Active_flag
    }),
    registration: (r) => ({
        id: r.registration_id, confirmationCode: r.confirmation_code, userId: r.user_id,
        fullName: r.full_name || '', email: r.email || '', roleName: r.role_name || '', siteName: r.site_name || '',
        confirmed: !!r.confirmed, confirmationDate: r.confirmation_date, registrationType: r.registration_type,
        isActive: !!r.active_flag, lastUpdate: r.last_update, updatedBy: r.updateby
    }),
    supplierIncharge: (r) => ({
        id: r.Id, supplierId: r.supplier_id, supplierName: r.supplier_name,
        siteId: r.site_id, siteName: r.site_name, userId: r.user_id,
        fullName: r.full_name, email: r.email, isActive: !!r.active_flag
    }),
    faqItem: (r) => ({
        id: r.faq_item_id, category: r.faq_category, question: r.question, answer: r.answer,
        sequence: r.sequence, description: r.faq_item_desc || '', isActive: !!r.active_flag
    }),
    certification: (r) => ({
        id: r.certification_id, name: r.certification_name, description: r.certification_desc || '', isActive: !!r.active_flag
    }),
    group: (r) => ({
        id: r.group_id, name: r.group_name, description: r.group_desc || '', isActive: !!r.active_flag
    }),
    trainingProgram: (r) => ({
        id: r.training_program_id, name: r.training_program_name, description: r.training_program_desc || '', isActive: !!r.active_flag
    }),
    messageInfo: (r) => ({
        id: r.messageinfo_id, key: r.key_name, value: r.value || '', isActive: !!r.active_flag
    })
};
/**
 * A highly reusable generic engine to process ALL Master Data requests.
 * By combining the DB Table interface, the repo instance, and the legacy response mapper,
 * we can collapse thousands of lines of boilerplate into ~80 lines.
 */
export class MasterDataService {
    async getAll({ repo, mapper }) {
        // If repo has findAllDetailed, use it (for joins)
        const rows = repo.findAllDetailed ? await repo.findAllDetailed() : await repo.findAll();
        return rows.map(mapper);
    }
    async getById({ repo, mapper }, id) {
        const row = repo.findByIdDetailed ? await repo.findByIdDetailed(id) : await repo.findById(id);
        if (!row)
            throw new NotFoundError('Record not found');
        return mapper(row);
    }
    async create({ repo, mapper, toDB }, payload, userId = 'SYSTEM') {
        const id = uuidv4();
        const dbPayload = toDB(id, payload, userId);
        // All master data tables have last_update (NOT NULL) and updateby (NOT NULL)
        dbPayload.last_update = new Date();
        if (!dbPayload.updateby)
            dbPayload.updateby = userId;
        const created = await repo.create(dbPayload);
        // If it's a join table, we must fetch Detailed after insert to get the joined data names
        if (repo.findByIdDetailed) {
            const detailed = await repo.findByIdDetailed(id);
            return mapper(detailed);
        }
        return mapper(created);
    }
    async update({ repo, mapper, idCol, toDB }, id, payload, userId = 'SYSTEM') {
        const exists = await repo.findById(id);
        if (!exists)
            throw new NotFoundError('Record not found');
        const dbPayload = toDB(id, payload, userId);
        // Remove id from DB payload if present for updates, so we don't accidentally update the PK
        delete dbPayload[idCol];
        dbPayload.last_update = new Date();
        dbPayload.updateby = userId;
        const updated = await repo.update(id, dbPayload);
        if (repo.findByIdDetailed) {
            const detailed = await repo.findByIdDetailed(id);
            return mapper(detailed);
        }
        return mapper(updated);
    }
    async delete({ repo }, id) {
        const exists = await repo.findById(id);
        if (!exists)
            throw new NotFoundError('Record not found');
        try {
            await repo.delete(id);
        }
        catch (err) {
            // Surface FK constraint violations with a clear message
            if (err?.number === 547) {
                throw new Error('Cannot delete: this record is referenced by other data. Remove those references first.');
            }
            throw err;
        }
    }
}
export const masterDataService = new MasterDataService();
