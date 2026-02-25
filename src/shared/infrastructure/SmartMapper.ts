// ============================================================================
// The "Smart Mapper" Engine (No ORM Bloat)
// ============================================================================

/**
 * A Schema defines the relationship between Frontend keys and Database columns.
 * Record<FrontendKey, DatabaseColumn>
 */
export type MapperSchema<DTO, DBRow> = {
  [K in keyof DTO]: keyof DBRow;
};

export class SmartMapper {
  /**
   * Translates a Database Row automatically to a Frontend DTO using the Schema.
   * Eliminates boilerplate like `site_id: row.SiteID`
   */
  static toDTO<DTO extends Record<string, any>, DBRow extends Record<string, any>>(
    row: DBRow | null | undefined,
    schema: MapperSchema<DTO, DBRow>
  ): DTO | null {
    if (!row) return null;

    const dto: any = {};
    for (const [dtoKey, dbKey] of Object.entries(schema)) {
      if (row[dbKey as keyof DBRow] !== undefined) {
        dto[dtoKey] = row[dbKey as keyof DBRow];
      }
    }
    return dto as DTO;
  }

  /**
   * Translates an array of Database Rows to an array of DTOs
   */
  static toDTOArray<DTO extends Record<string, any>, DBRow extends Record<string, any>>(
    rows: DBRow[],
    schema: MapperSchema<DTO, DBRow>
  ): DTO[] {
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => this.toDTO(row, schema) as DTO);
  }

  /**
   * Translates a DTO Input (e.g. for Update/Insert) into a valid Database object.
   * Strips out extra fields not defined in the schema.
   */
  static toDB<DTO extends Record<string, any>, DBRow extends Record<string, any>>(
    dto: Partial<DTO>,
    schema: MapperSchema<DTO, DBRow>
  ): Partial<DBRow> {
    const dbObj: any = {};
    
    for (const [dtoKey, dbKey] of Object.entries(schema)) {
      if (dto[dtoKey as keyof DTO] !== undefined) {
        dbObj[dbKey] = dto[dtoKey as keyof DTO];
      }
    }
    
    return dbObj;
  }
}
