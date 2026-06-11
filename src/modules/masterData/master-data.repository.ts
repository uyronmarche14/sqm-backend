import { db } from '../../shared/infrastructure/db.js';
import { Database } from '../../shared/infrastructure/db.types.js';
import { Insertable, Updateable, Selectable } from 'kysely';

/**
 * A highly generic repository to handle boilerplate CRUD operations 
 * across the standard Master Data tables, massively reducing code duplication.
 */
export class GenericMasterRepository<T extends keyof Database, ID extends keyof Database[T]> {
  constructor(
    protected readonly tableName: T,
    protected readonly idColumn: ID,
    protected readonly nameColumn?: keyof Database[T]
  ) {}

  async findAll(): Promise<Selectable<Database[T]>[]> {
    let query: any = db.selectFrom(this.tableName as any).selectAll();
    if (this.nameColumn) {
      query = query.orderBy(this.nameColumn as any);
    }
    return await query.execute() as any;
  }

  async findById(id: string): Promise<Selectable<Database[T]> | undefined> {
    const query: any = db.selectFrom(this.tableName as any);
    return await query
      .where(this.idColumn as any, '=', id)
      .selectAll()
      .executeTakeFirst() as any;
  }

  async create(data: Insertable<Database[T]>): Promise<Selectable<Database[T]>> {
    const query: any = db.insertInto(this.tableName as any);
    await query
      .values(data as any)
      .execute();
    return (await this.findById((data as any)[this.idColumn])) as any;
  }

  async update(id: string, data: Updateable<Database[T]>): Promise<Selectable<Database[T]>> {
    const query: any = db.updateTable(this.tableName as any);
    await query
      .set(data as any)
      .where(this.idColumn as any, '=', id)
      .execute();
    return (await this.findById(id)) as any;
  }

  async delete(id: string): Promise<void> {
    const query: any = db.deleteFrom(this.tableName as any);
    await query
      .where(this.idColumn as any, '=', id)
      .execute();
  }
}

// ============================================================================
// Specialized Repositories (For tables needing JOINs)
// ============================================================================

export class AuditTypeRepository extends GenericMasterRepository<'AUDITTYPE', 'audit_type_id'> {
  constructor() { super('AUDITTYPE', 'audit_type_id', 'audit_type_name'); }

  async findAllWithCategories() {
    return await db.selectFrom('AUDITTYPE as t')
      .leftJoin('AUDITCATEGORY as c', 't.audit_category_id', 'c.audit_category_id')
      .selectAll('t')
      .select('c.audit_category_name')
      .orderBy('t.audit_type_name')
      .execute();
  }

  async findByIdWithCategory(id: string) {
    return await db.selectFrom('AUDITTYPE as t')
      .leftJoin('AUDITCATEGORY as c', 't.audit_category_id', 'c.audit_category_id')
      .selectAll('t')
      .select('c.audit_category_name')
      .where('t.audit_type_id', '=', id)
      .executeTakeFirst();
  }
}

export class FiveM1ECategoryRepository extends GenericMasterRepository<'PARTCLASSCATEGORIES', 'Category_ID'> {
  constructor() { super('PARTCLASSCATEGORIES', 'Category_ID', 'Category_name'); }

  async findAllDetailed() {
    return await db.selectFrom('PARTCLASSCATEGORIES as pcc')
      .leftJoin('PARTCLASS as pc', 'pcc.Partclass_id', 'pc.partclass_id')
      .leftJoin('MFG_SITES as s', 'pc.site_id', 's.site_id')
      .selectAll('pcc')
      .select(['pc.partclass_name', 's.site_name'])
      .orderBy('pcc.Category_name')
      .execute();
  }

  async findByIdDetailed(id: string) {
    return await db.selectFrom('PARTCLASSCATEGORIES as pcc')
      .leftJoin('PARTCLASS as pc', 'pcc.Partclass_id', 'pc.partclass_id')
      .leftJoin('MFG_SITES as s', 'pc.site_id', 's.site_id')
      .selectAll('pcc')
      .select(['pc.partclass_name', 's.site_name'])
      .where('pcc.Category_ID', '=', id)
      .executeTakeFirst();
  }
}

export class RegistrationsRepository extends GenericMasterRepository<'REGISTRATIONS', 'registration_id'> {
  constructor() { super('REGISTRATIONS', 'registration_id'); }

  async findAllDetailed() {
    return await db.selectFrom('REGISTRATIONS as r')
      .leftJoin('USERS as u', 'r.user_id', 'u.user_id')
      .leftJoin('ROLES as ro', 'u.role_id', 'ro.role_id')
      .leftJoin('MFG_SITES as s', 'u.site_id', 's.site_id')
      .selectAll('r')
      .select(['u.full_name', 'u.email', 'ro.role_name', 's.site_name'])
      .orderBy('r.last_update', 'desc')
      .execute();
  }

  async findByIdDetailed(id: string) {
    return await db.selectFrom('REGISTRATIONS as r')
      .leftJoin('USERS as u', 'r.user_id', 'u.user_id')
      .leftJoin('ROLES as ro', 'u.role_id', 'ro.role_id')
      .leftJoin('MFG_SITES as s', 'u.site_id', 's.site_id')
      .selectAll('r')
      .select(['u.full_name', 'u.email', 'ro.role_name', 's.site_name'])
      .where('r.registration_id', '=', id)
      .executeTakeFirst();
  }
}

export class SupplierInchargeRepository extends GenericMasterRepository<'SUPPLIERSUSER', 'Id'> {
  constructor() { super('SUPPLIERSUSER', 'Id'); }
  
  // Notice: The legacy code read directly from a dbo.vSupplierIncharges VIEW. 
  // We can replicate the JOIN manually if the view isn't securely registered in types.
  async findAllDetailed() {
    return await db.selectFrom('SUPPLIERSUSER as su')
      .innerJoin('SUPPLIERS as sup', 'su.supplier_id', 'sup.supplier_id')
      .innerJoin('USERS as u', 'su.user_id', 'u.user_id')
      .leftJoin('MFG_SITES as s', 'u.site_id', 's.site_id')
      .selectAll('su')
       .select([
        'sup.supplier_name', 
        'u.full_name', 
        'u.email', 
        's.site_name', 's.site_id'
      ])
      .orderBy('sup.supplier_name')
      .orderBy('u.full_name')
      .execute();
  }

  async findByIdDetailed(id: string) {
    return await db.selectFrom('SUPPLIERSUSER as su')
      .innerJoin('SUPPLIERS as sup', 'su.supplier_id', 'sup.supplier_id')
      .innerJoin('USERS as u', 'su.user_id', 'u.user_id')
      .leftJoin('MFG_SITES as s', 'u.site_id', 's.site_id')
      .selectAll('su')
      .select([
        'sup.supplier_name', 
        'u.full_name', 
        'u.email', 
        's.site_name', 's.site_id'
      ])
      .where('su.Id', '=', id)
      .executeTakeFirst();
  }
}

// ============================================================================
// Repository Instances
// ============================================================================

export const sitesRepo = new GenericMasterRepository('MFG_SITES', 'site_id', 'site_name');
export const suppliersRepo = new GenericMasterRepository('SUPPLIERS', 'supplier_id', 'supplier_name');
export const rolesRepo = new GenericMasterRepository('ROLES', 'role_id', 'role_name');
export const modelsRepo = new GenericMasterRepository('MODELS', 'model_id', 'model_name');
export const productsRepo = new GenericMasterRepository('PRODUCTS', 'product_id', 'product_name');
export const mfgAreasRepo = new GenericMasterRepository('MFG_AREAS', 'mfg_area_id', 'mfg_area_name');
export const partsRepo = new GenericMasterRepository('PARTCLASS', 'partclass_id', 'partclass_name');
export const defectCategoriesRepo = new GenericMasterRepository('DEFECTCATEGORIES', 'defectcategory_id', 'defectcategory_name');
export const defectsRepo = new GenericMasterRepository('DEFECTS', 'defect_id', 'defect_name');
export const defectClassesRepo = new GenericMasterRepository('DEFECTCLASS', 'defectclass_id', 'defectclass_name');
export const dispositionsRepo = new GenericMasterRepository('DISPOSITIONS', 'disposition_id', 'disposition_name');
export const severityRepo = new GenericMasterRepository('SEVERITY', 'severity_id', 'severity_name');
export const aqlRepo = new GenericMasterRepository('AQL', 'aql_id', 'aql_name');
export const inspectionCategoriesRepo = new GenericMasterRepository('INSPECTIONCATEGORIES', 'inspectioncat_id', 'inspectioncat_name');
export const inspectionMethodsRepo = new GenericMasterRepository('INSPECTIONMETHODS', 'inspectionmethod_id', 'inspectionmethod_name');
export const inspectorsRepo = new GenericMasterRepository('INSPECTORS', 'inspector_id', 'inspector_name');
export const mnrTypesRepo = new GenericMasterRepository('MNRTYPE', 'mnrtype_id', 'mnrtype_name');

// Parts Catalog Expansion
export const partTypesRepo = new GenericMasterRepository('PARTTYPES', 'parttype_id', 'parttype_name');
export const partDataCatsRepo = new GenericMasterRepository('PARTDATACATEGORIES', 'partdatacategory_id', 'partdatacategory_name');
export const partDimCatsRepo = new GenericMasterRepository('PARTDIMENSIONCATEGORIES', 'partdimensioncategory_id', 'partdimensioncategory_name');
export const partNoiseCatsRepo = new GenericMasterRepository('PARTNOISECATEGORIES', 'partnoisecategory_id', 'partnoisecategory_name');
export const partsCatalogRepo = new GenericMasterRepository('PARTS', 'part_id', 'part_name');

// Config & Security
export const formsRepo = new GenericMasterRepository('FORMS', 'form_id', 'form_name');
export const roleAccessRepo = new GenericMasterRepository('ROLE_ACCESS', 'roleaccess_id');
export const supplierInfoRepo = new GenericMasterRepository('SUPPLIER_INFORMATION', 'supplier_information_id');

// Specialized Repositories
export const supplierInchargesRepo = new SupplierInchargeRepository();
export const auditCategoriesRepo = new GenericMasterRepository('AUDITCATEGORY', 'audit_category_id', 'audit_category_name');
export const auditTypesRepo = new AuditTypeRepository();
export const criteriaRepo = new GenericMasterRepository('CRITERIAS', 'criteria_id', 'criteria_name');
export const fiveM1ECatsRepo = new FiveM1ECategoryRepository();
export const registrationsRepo = new RegistrationsRepository();

// Missing Admin Tables
export const faqItemsRepo = new GenericMasterRepository('FAQ_ITEM', 'faq_item_id', 'sequence');
export const certificationsRepo = new GenericMasterRepository('CERTIFICATIONS', 'certification_id', 'certification_name');
export const groupsRepo = new GenericMasterRepository('GROUPS', 'group_id', 'group_name');
export const trainingProgramsRepo = new GenericMasterRepository('TRAINING_PROGRAMS', 'training_program_id', 'training_program_name');
export const messageInfoRepo = new GenericMasterRepository('MESSAGE_INFO', 'messageinfo_id', 'key_name');
