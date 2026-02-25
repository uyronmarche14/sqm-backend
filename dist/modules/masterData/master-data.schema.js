import { z } from 'zod';
// Helper for common active flag conversions
const activeFlagSchema = z.union([z.boolean(), z.number()]).optional().transform(v => (v === true || v === 1 ? 1 : 0));
// 1. Sites
export const SiteSchema = z.object({
    name: z.string().min(1),
    code: z.string().optional(),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 2. Suppliers
export const SupplierSchema = z.object({
    name: z.string().min(1),
    siteId: z.string().optional().nullable(),
    description: z.string().optional(),
    location: z.string().optional(),
    isActive: activeFlagSchema
});
// 3. Roles
export const RoleSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 4. Models
export const ModelSchema = z.object({
    name: z.string().min(1),
    code: z.string().optional(),
    productId: z.string().optional().nullable(),
    siteId: z.string().optional().nullable(),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 5. Products
export const ProductSchema = z.object({
    name: z.string().min(1),
    code: z.string().optional(),
    description: z.string().optional(),
    siteId: z.string().optional().nullable(),
    isActive: activeFlagSchema
});
// 6. Mfg Areas
export const MfgAreaSchema = z.object({
    mfg_area_name: z.string().min(1),
    mfg_area_desc: z.string().optional(),
    active_flag: activeFlagSchema
});
// 7. Parts (PARTCLASS)
export const PartClassSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    siteId: z.string().optional().nullable(),
    isActive: activeFlagSchema
});
// 8. Defect Categories
export const DefectCategorySchema = z.object({
    name: z.string().min(1),
    acronym: z.string().optional(),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 9. Defects
export const DefectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 9.5 Defect Classes
export const DefectClassSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 10. Dispositions
export const DispositionSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 10.5 Severity
export const SeveritySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 11. AQL
export const AQLSchema = z.object({
    name: z.string().min(1),
    minor: z.string().optional(),
    major: z.string().optional(),
    siteId: z.string().optional().nullable(),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 12. Inspection Categories
export const InspectionCategorySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 13. Inspection Methods
export const InspectionMethodSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    defaultTemp: z.number().optional().nullable(),
    defaultHum: z.number().optional().nullable(),
    defaultValue: z.union([z.boolean(), z.number()]).optional().transform(v => (v === true || v === 1 ? 1 : 0)),
    isActive: activeFlagSchema
});
// 14. Inspectors
export const InspectorSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
// 15. General Master / MNR Types
export const GeneralMasterSchema = z.object({
    mnrtype_name: z.string().min(1),
    mnrtype_desc: z.string().optional(),
    active_flag: activeFlagSchema
});
// ============================================
// Parts Catalog
// ============================================
export const PartTypeSchema = z.object({
    name: z.string().min(1),
    code: z.string().optional(),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
export const PartCategoryParamSchema = z.object({
    name: z.string().min(1),
    parentId: z.string().optional().nullable(),
    min: z.number().optional().nullable(),
    max: z.number().optional().nullable(),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
export const PartMasterSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    siteId: z.string().optional().nullable(),
    description: z.string().optional(),
    classId: z.string().optional().nullable(),
    typeId: z.string().optional().nullable(),
    aqlId: z.string().optional().nullable(),
    active_flag: activeFlagSchema
});
// ============================================
// Roles, Forms, & Security
// ============================================
export const FormSchema = z.object({
    name: z.string().min(1),
    url: z.string().optional(),
    menuGroup: z.string().optional(),
    icon: z.string().optional(),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
export const RoleAccessSchema = z.object({
    roleId: z.string().min(1),
    formId: z.string().min(1),
    description: z.string().optional(),
    permissions: z.record(z.string(), z.any()).optional().default({}),
    isActive: activeFlagSchema
});
// ============================================
// Suppliers Ex
// ============================================
export const SupplierInchargeSchema = z.object({
    supplierId: z.string().min(1),
    userId: z.string().min(1),
    isActive: activeFlagSchema
});
export const SupplierInfoSchema = z.object({
    supplierId: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    middleName: z.string().optional(),
    description: z.string().optional(),
    attachmentId: z.string().optional(),
    attachmentName: z.string().optional(),
    attachmentExtension: z.string().optional(),
    isActive: activeFlagSchema
});
// ============================================
// Audit & QMS
// ============================================
export const AuditCategorySchema = z.object({
    name: z.string().min(1),
    code: z.string().optional().nullable(),
    description: z.string().optional(),
    withRating: activeFlagSchema,
    withAuditees: activeFlagSchema,
    withAuditors: activeFlagSchema,
    withAttendees: activeFlagSchema,
    withAuditPlan: activeFlagSchema,
    isActive: activeFlagSchema
});
export const AuditTypeSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    categoryId: z.string().optional().nullable(),
    isActive: activeFlagSchema
});
export const CriteriaSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isActive: activeFlagSchema
});
export const FiveM1ECategorySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    partClassId: z.string().optional().nullable(),
    isActive: activeFlagSchema
});
export const RegistrationSchema = z.object({
    confirmationCode: z.string().min(1),
    userId: z.string().min(1),
    registrationType: z.number().optional().nullable(),
    isActive: activeFlagSchema
});
// ============================================
// Missing Admin Tables
// ============================================
export const FAQItemSchema = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    faq_category: z.number().optional().default(0),
    sequence: z.number().optional().default(0),
    faq_item_desc: z.string().optional(),
    active_flag: activeFlagSchema
});
export const CertificationSchema = z.object({
    certification_name: z.string().min(1),
    certification_desc: z.string().optional(),
    active_flag: activeFlagSchema
});
export const GroupSchema = z.object({
    group_name: z.string().min(1),
    group_desc: z.string().optional(),
    active_flag: activeFlagSchema
});
export const TrainingProgramSchema = z.object({
    training_program_name: z.string().min(1),
    training_program_desc: z.string().optional(),
    active_flag: activeFlagSchema
});
export const MessageInfoSchema = z.object({
    key_name: z.string().min(1),
    value: z.string().optional().nullable(),
    active_flag: activeFlagSchema
});
// Export basic param id for deletes/gets
export const ParamIdSchema = z.object({
    id: z.string().uuid('Invalid ID format')
});
