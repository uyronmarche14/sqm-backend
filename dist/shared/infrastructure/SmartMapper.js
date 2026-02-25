// ============================================================================
// The "Smart Mapper" Engine (No ORM Bloat)
// ============================================================================
export class SmartMapper {
    /**
     * Translates a Database Row automatically to a Frontend DTO using the Schema.
     * Eliminates boilerplate like `site_id: row.SiteID`
     */
    static toDTO(row, schema) {
        if (!row)
            return null;
        const dto = {};
        for (const [dtoKey, dbKey] of Object.entries(schema)) {
            if (row[dbKey] !== undefined) {
                dto[dtoKey] = row[dbKey];
            }
        }
        return dto;
    }
    /**
     * Translates an array of Database Rows to an array of DTOs
     */
    static toDTOArray(rows, schema) {
        if (!rows || rows.length === 0)
            return [];
        return rows.map((row) => this.toDTO(row, schema));
    }
    /**
     * Translates a DTO Input (e.g. for Update/Insert) into a valid Database object.
     * Strips out extra fields not defined in the schema.
     */
    static toDB(dto, schema) {
        const dbObj = {};
        for (const [dtoKey, dbKey] of Object.entries(schema)) {
            if (dto[dtoKey] !== undefined) {
                dbObj[dbKey] = dto[dtoKey];
            }
        }
        return dbObj;
    }
}
