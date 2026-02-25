import { db } from './db.js';
export class BaseRepository {
    tableName;
    constructor(tableName) {
        this.tableName = tableName;
    }
    /**
     * Returns a basic Select Query Builder for the table
     */
    getQuery() {
        return db.selectFrom(this.tableName);
    }
    /**
     * Find a record by its exact Primary Key (Assuming the column is 'ID' or similar)
     * Note: This is an example generic method. In practice, Kysely expects explicit column names,
     * so specific repositories often handle exact ID mapping.
     */
    async findById(columnName, id) {
        return (await this.getQuery()
            .selectAll()
            // @ts-ignore - Kysely generic typings can be strict here, but we know it's a valid column
            .where(columnName, '=', id)
            .executeTakeFirst()) || null;
    }
    /**
     * Delete a record by a primary key column
     */
    async deleteById(columnName, id) {
        return await db
            .deleteFrom(this.tableName)
            // @ts-ignore
            .where(columnName, '=', id)
            .executeTakeFirst();
    }
}
