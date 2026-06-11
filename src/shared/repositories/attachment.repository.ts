export interface AttachmentRecordConfig {
  tableName: string;
  ownerColumn: string;
  idColumn: string;
  fileNameColumn: string;
  extensionColumn?: string | null;
  remarksColumn?: string | null;
  pathColumn?: string | null;
  categoryColumn?: string | null;
  lastUpdateColumn?: string | null;
  updatedByColumn?: string | null;
}

export interface AttachmentRecord {
  id: string;
  ownerId: string;
  fileName: string;
  fileExtension?: string | null;
  remarks?: string | null;
  storagePath?: string | null;
  category?: string | null;
  raw: Record<string, unknown>;
}

export class AttachmentRepository {
  async listByOwner(trx: any, config: AttachmentRecordConfig, ownerId: string): Promise<AttachmentRecord[]> {
    const rows = await trx
      .selectFrom(config.tableName as any)
      .selectAll()
      .where(config.ownerColumn as any, '=', ownerId)
      .execute();

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row[config.idColumn] || ''),
      ownerId: String(row[config.ownerColumn] || ownerId),
      fileName: String(row[config.fileNameColumn] || ''),
      fileExtension: config.extensionColumn ? (row[config.extensionColumn] as string | null | undefined) ?? null : null,
      remarks: config.remarksColumn ? (row[config.remarksColumn] as string | null | undefined) ?? null : null,
      storagePath: config.pathColumn ? (row[config.pathColumn] as string | null | undefined) ?? null : null,
      category: config.categoryColumn ? (row[config.categoryColumn] as string | null | undefined) ?? null : null,
      raw: row,
    }));
  }

  async insert(trx: any, config: AttachmentRecordConfig, values: Record<string, unknown>) {
    await trx.insertInto(config.tableName as any).values(values as any).execute();
  }

  async updateById(
    trx: any,
    config: AttachmentRecordConfig,
    attachmentId: string,
    values: Record<string, unknown>,
  ) {
    await trx
      .updateTable(config.tableName as any)
      .set(values as any)
      .where(config.idColumn as any, '=', attachmentId)
      .execute();
  }

  async deleteByIds(trx: any, config: AttachmentRecordConfig, attachmentIds: string[]) {
    if (!attachmentIds.length) return;

    await trx
      .deleteFrom(config.tableName as any)
      .where(config.idColumn as any, 'in', attachmentIds)
      .execute();
  }
}

export const attachmentRepository = new AttachmentRepository();

