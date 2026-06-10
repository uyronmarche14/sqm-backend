import { sql } from 'kysely';
import { db } from '../../shared/infrastructure/db.js';

export interface SupplierInformationRow {
  supplier_information_id: string;
  supplier_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  supplier_information_desc: string | null;
  attachment_id: string | null;
  attachment_name: string | null;
  attachment_extension: string | null;
  active_flag: boolean | number | null;
  last_update: Date | string | null;
  updateby: string | null;
  supplier_name: string | null;
  site_id: string | null;
  site_name: string | null;
}

export class SupplierInformationRepository {
  private baseQuery() {
    return db
      .selectFrom('SUPPLIER_INFORMATION as si')
      .innerJoin('SUPPLIERS as sup', 'si.supplier_id', 'sup.supplier_id')
      .leftJoin('MFG_SITES as site', 'sup.site_id', 'site.site_id')
      .selectAll('si')
      .select([
        'sup.supplier_name',
        'sup.site_id',
        'site.site_name',
      ]);
  }

  async findAllActive(): Promise<SupplierInformationRow[]> {
    return await this.baseQuery()
      .where('si.active_flag', '=', 1)
      .orderBy('sup.supplier_name')
      .orderBy('si.last_name')
      .orderBy('si.first_name')
      .execute() as SupplierInformationRow[];
  }

  async findActiveBySupplier(supplierId: string): Promise<SupplierInformationRow[]> {
    return await this.baseQuery()
      .where('si.active_flag', '=', 1)
      .where('si.supplier_id', '=', supplierId)
      .orderBy('si.last_name')
      .orderBy('si.first_name')
      .execute() as SupplierInformationRow[];
  }

  async findById(id: string): Promise<SupplierInformationRow | undefined> {
    return await this.baseQuery()
      .where('si.supplier_information_id', '=', id)
      .executeTakeFirst() as SupplierInformationRow | undefined;
  }

  async findByAttachmentId(attachmentId: string): Promise<SupplierInformationRow | undefined> {
    return await this.baseQuery()
      .where('si.attachment_id', '=', attachmentId)
      .executeTakeFirst() as SupplierInformationRow | undefined;
  }

  async searchActive(keyword: string): Promise<SupplierInformationRow[]> {
    const normalized = `%${keyword.toLowerCase()}%`;

    return await this.baseQuery()
      .where('si.active_flag', '=', 1)
      .where((eb) =>
        eb.or([
          sql<boolean>`LOWER(${sql.ref('si.first_name')}) LIKE ${normalized}`,
          sql<boolean>`LOWER(${sql.ref('si.middle_name')}) LIKE ${normalized}`,
          sql<boolean>`LOWER(${sql.ref('si.last_name')}) LIKE ${normalized}`,
          sql<boolean>`LOWER(${sql.ref('sup.supplier_name')}) LIKE ${normalized}`,
          sql<boolean>`LOWER(${sql.ref('si.supplier_information_desc')}) LIKE ${normalized}`,
        ]),
      )
      .orderBy('sup.supplier_name')
      .orderBy('si.last_name')
      .orderBy('si.first_name')
      .execute() as SupplierInformationRow[];
  }

  async findSupplierIdsByUserId(userId: string): Promise<string[]> {
    const rows = await db
      .selectFrom('SUPPLIERSUSER')
      .select('supplier_id')
      .where('user_id', '=', userId)
      .where('active_flag', '=', 1)
      .execute();

    return rows.map((r) => r.supplier_id);
  }

  async findActorRoleName(userId: string): Promise<string | null> {
    const row = await db
      .selectFrom('USERS as u')
      .innerJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .select('r.role_name')
      .where('u.user_id', '=', userId)
      .executeTakeFirst();

    return row?.role_name ?? null;
  }
}

export const supplierInformationRepository = new SupplierInformationRepository();
