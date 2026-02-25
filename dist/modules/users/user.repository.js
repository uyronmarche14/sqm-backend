import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
export class UserRepository extends BaseRepository {
    constructor() {
        super('USERS');
    }
    async findAll() {
        return await this.getQuery().selectAll().orderBy('full_name').execute();
    }
    async findById(id) {
        return await super.findById('user_id', id);
    }
    async findByEmail(email) {
        return await this.getQuery().selectAll().where('email', '=', email).executeTakeFirst() || null;
    }
    async create(user) {
        return await db.insertInto('USERS').values(user).returningAll().executeTakeFirstOrThrow();
    }
    async createWithSupplier(user, supplier, supplierUser) {
        return await db.transaction().execute(async (trx) => {
            const createdUser = await trx.insertInto('USERS').values(user).returningAll().executeTakeFirstOrThrow();
            await trx.insertInto('SUPPLIERS').values(supplier).execute();
            await trx.insertInto('SUPPLIERSUSER').values(supplierUser).execute();
            return createdUser;
        });
    }
    async update(id, updateData) {
        return await db.updateTable('USERS')
            .set(updateData)
            .where('user_id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();
    }
    async changePassword(id, passwordHash) {
        return await db.updateTable('USERS')
            .set({
            password: passwordHash,
            last_pasword_change: new Date(),
            last_update: new Date(),
        })
            .where('user_id', '=', id)
            .executeTakeFirstOrThrow();
    }
    async findRoleById(roleId) {
        return await db.selectFrom('ROLES').select('role_name').where('role_id', '=', roleId).executeTakeFirst() || null;
    }
    async checkSiteExists(siteId) {
        const site = await db.selectFrom('MFG_SITES').select('site_id').where('site_id', '=', siteId).executeTakeFirst();
        return !!site;
    }
}
export const userRepository = new UserRepository();
