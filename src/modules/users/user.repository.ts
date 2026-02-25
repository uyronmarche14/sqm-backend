import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { Insertable, Updateable } from 'kysely';
import { Database } from '../../shared/infrastructure/db.types.js';

export class UserRepository extends BaseRepository<'USERS'> {
  constructor() {
    super('USERS');
  }

  async findAll() {
    return await this.getQuery().selectAll().orderBy('full_name').execute();
  }

  async findById(id: string) {
    return await super.findById('user_id', id);
  }

  async findByEmail(email: string) {
    return await this.getQuery().selectAll().where('email', '=', email).executeTakeFirst() || null;
  }

  async create(user: Insertable<Database['USERS']>) {
    return await db.insertInto('USERS').values(user).returningAll().executeTakeFirstOrThrow();
  }

  async createWithSupplier(
    user: Insertable<Database['USERS']>, 
    supplier: Insertable<Database['SUPPLIERS']>,
    supplierUser: Insertable<Database['SUPPLIERSUSER']>
  ) {
    return await db.transaction().execute(async (trx) => {
      const createdUser = await trx.insertInto('USERS').values(user).returningAll().executeTakeFirstOrThrow();
      
      await trx.insertInto('SUPPLIERS').values(supplier).execute();
      await trx.insertInto('SUPPLIERSUSER').values(supplierUser).execute();

      return createdUser;
    });
  }

  async update(id: string, updateData: Updateable<Database['USERS']>) {
    return await db.updateTable('USERS')
      .set(updateData)
      .where('user_id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async changePassword(id: string, passwordHash: string) {
    return await db.updateTable('USERS')
      .set({
        password: passwordHash,
        last_pasword_change: new Date(),
        last_update: new Date(),
      })
      .where('user_id', '=', id)
      .executeTakeFirstOrThrow();
  }

  async findRoleById(roleId: string) {
    return await db.selectFrom('ROLES').select('role_name').where('role_id', '=', roleId).executeTakeFirst() || null;
  }

  async checkSiteExists(siteId: string) {
    const site = await db.selectFrom('MFG_SITES').select('site_id').where('site_id', '=', siteId).executeTakeFirst();
    return !!site;
  }
}

export const userRepository = new UserRepository();
