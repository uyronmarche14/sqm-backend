import { BaseRepository } from '../../../shared/infrastructure/BaseRepository.js';
import { db } from '../../../shared/infrastructure/db.js';

export class AuthUserRepository extends BaseRepository<'USERS'> {
  constructor() {
    super('USERS');
  }

  async findByEmail(email: string) {
    return await this.getQuery()
      .leftJoin('ROLES', 'ROLES.role_id', 'USERS.role_id')
      .selectAll('USERS')
      .select('ROLES.role_name')
      .where('email', '=', email)
      .executeTakeFirst();
  }

  async findUserById(userId: string) {
    return await this.getQuery()
      .leftJoin('ROLES', 'ROLES.role_id', 'USERS.role_id')
      .selectAll('USERS')
      .select('ROLES.role_name')
      .where('USERS.user_id', '=', userId)
      .executeTakeFirst();
  }

  async updatePassword(userId: string, passwordHash: string) {
    await db.updateTable('USERS')
      .set({
        password: passwordHash,
        change_pw: 0,
        last_pasword_change: new Date(),
        last_update: new Date(),
      })
      .where('user_id', '=', userId)
      .execute();
  }

  async findRoleBasedAccessibleForms(userId: string): Promise<string[]> {
    const user = await this.findUserById(userId);

    if (!user?.role_id) {
      return [];
    }

    const records = await db
      .selectFrom('ROLE_ACCESS as ra')
      .innerJoin('FORMS as f', 'ra.form_id', 'f.form_id')
      .select('f.form_name as formName')
      .where('ra.role_id', '=', user.role_id)
      .where('ra.active_flag', '=', 1)
      .where((eb) =>
        eb.or([
          eb('ra.can_view', '=', 1),
          eb('ra.can_viewlist', '=', 1),
        ]),
      )
      .execute();

    return Array.from(
      new Set(
        records
          .map((record) => record.formName)
          .filter((formName): formName is string => Boolean(formName)),
      ),
    );
  }

  async findCurrentUserRoleAccessRecords(userId: string) {
    const user = await this.findUserById(userId);

    if (!user?.role_id) {
      return [];
    }

    return await db
      .selectFrom('ROLE_ACCESS as ra')
      .innerJoin('FORMS as f', 'ra.form_id', 'f.form_id')
      .select([
        'ra.roleaccess_id as id',
        'ra.role_id as roleId',
        'f.form_name as formId',
        'f.form_name as formName',
        'f.form_url as formUrl',
        'f.menu_group as menuGroup',
        'ra.active_flag as isActive',
        'ra.can_view as canView',
        'ra.can_viewlist as canViewList',
        'ra.can_add as canAdd',
        'ra.can_edit as canEdit',
        'ra.can_delete as canDelete',
        'ra.can_approve as canApprove',
        'ra.can_check as canCheck',
        'ra.can_response as canResponse',
        'ra.multiple_approval as multipleApproval',
        'ra.can_print as canPrint',
        'ra.can_export as canExport',
        'ra.can_attach as canAttach',
        'ra.per_site as perSite',
        'ra.per_supplier as perSupplier',
        'ra.registration_notify as registrationNotify',
        'ra.maintenance_notify as maintenanceNotify',
        'ra.transaction_notify as transactionNotify',
        'ra.pic as pic',
      ])
      .where('ra.role_id', '=', user.role_id)
      .where('ra.active_flag', '=', 1)
      .execute();
  }
}

export const authUserRepository = new AuthUserRepository();
