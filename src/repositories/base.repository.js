import { sql } from '../config/db.js';

export class BaseRepository {
    /**
     * @param {Object} schema - The Schema definition { tableName, primaryKey, columns }
     */
    constructor(schema) {
        this.schema = schema;
        this.tableName = schema.tableName;
        this.primaryKey = schema.primaryKey || 'id';
    }

    /**
     * Validate and Map data against schema
     * @param {Object} data 
     */
    prepare(data) {
        const out = {};
        Object.keys(this.schema.columns).forEach(colName => {
            const colDef = this.schema.columns[colName];
            if (data[colName] !== undefined) {
                // If type is explicitly defined as Number/Int and val is generic, try conversion? 
                // Mostly we trust service layer, but base repo can ensure 'undefined' doesn't leak
                out[colName] = data[colName];
            }
        });
        return out;
    }

    /**
     * Dynamic Insert
     * @param {sql.Transaction} transaction 
     * @param {Object} data - Raw or prepared data
     */
    async insert(transaction, data) {
        const req = new sql.Request(transaction);
        const keys = [];
        const params = [];
        
        Object.keys(this.schema.columns).forEach(col => {
            if (data[col] !== undefined) {
                const def = this.schema.columns[col];
                req.input(col, def.type, data[col]);
                keys.push(col);
                params.push(`@${col}`);
            }
        });

        if (keys.length === 0) throw new Error(`No valid columns for insert into ${this.tableName}`);

        const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${params.join(', ')})`;
        await req.query(query);
    }

    /**
     * Dynamic Bulk Insert
     * @param {sql.Transaction} transaction 
     * @param {Array} items 
     */
    async insertBulk(transaction, items) {
        for (const item of items) {
            await this.insert(transaction, item);
        }
    }

    /**
     * Dynamic Update
     * @param {sql.Transaction} transaction 
     * @param {string} id 
     * @param {Object} data 
     */
    async update(transaction, id, data) {
        const req = new sql.Request(transaction);
        req.input('pk_id', id);

        const sets = [];
        Object.keys(this.schema.columns).forEach(col => {
            if (data[col] !== undefined && col !== this.primaryKey) {
                const def = this.schema.columns[col];
                req.input(col, def.type, data[col]);
                sets.push(`${col} = @${col}`);
            }
        });

        if (sets.length === 0) return; // Nothing to update

        const query = `UPDATE ${this.tableName} SET ${sets.join(', ')} WHERE ${this.primaryKey} = @pk_id`;
        await req.query(query);
    }

    /**
     * Generic Delete by Parent ID
     * @param {sql.Transaction} transaction 
     * @param {string} parentId 
     * @param {string} parentColName
     */
    async deleteByParent(transaction, parentId, parentColName) {
        const req = new sql.Request(transaction);
        req.input('pid', parentId);
        await req.query(`DELETE FROM ${this.tableName} WHERE ${parentColName} = @pid`);
    }
}
