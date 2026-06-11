import { sql } from 'kysely';
import { db } from '../../shared/infrastructure/db.js';
import type { ActionItemListRow, ActionItemListQuery } from './actionItems.types.js';

function normalizeToRow(row: Record<string, unknown>): ActionItemListRow {
  const sourceModule = String(row.source_module || '');
  const sourceId = String(row.source_id || '');
  const controlNo = String(row.control_no || '');
  const title = String(row.title || row.description || '');
  const status = String(row.status || 'OPEN');
  const dueDate = row.due_date ? String(row.due_date) : null;
  const now = new Date();
  const due = dueDate ? new Date(dueDate) : null;
  const agingDays = due ? Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return {
    id: `${sourceModule}-${sourceId}`,
    controlNo,
    title: title || '',
    supplier: String(row.supplier_name || ''),
    supplierName: String(row.supplier_name || ''),
    siteName: String(row.site_name || ''),
    status,
    statusLabel: status,
    priority: 'Normal',
    ownerName: String(row.owner_name || ''),
    picName: String(row.pic_name || ''),
    sourceModule,
    sourceReference: controlNo,
    sourceRecordId: sourceId,
    dueDate: dueDate || undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    remarks: row.remarks ? String(row.remarks) : undefined,
    agingDays: agingDays > 0 ? agingDays : 0,
    isOverdue: due ? due < now : false,
    availableActions: ['view'],
  };
}

const UNION_SOURCES = `
  SELECT '5M1E' AS source_module, CAST(ai.ID AS NVARCHAR(36)) AS source_id, COALESCE(ai.ControlNo, a.ControlNo, '') AS control_no, COALESCE(a.Title, 'Action Item') AS title, ai.ActionItem AS description, COALESCE(s.Site_Name, '') AS site_name, COALESCE(sup.Supplier_Name, '') AS supplier_name, ai.PICName AS pic_name, '' AS owner_name, ai.FirstTargetDt AS due_date, COALESCE(ai.VerificationResult, 'OPEN') AS status, CONVERT(NVARCHAR(30), ai.CreateDate, 126) AS created_at, CONVERT(NVARCHAR(30), ai.ModifiedDate, 126) AS updated_at, ai.Remarks AS remarks
  FROM [TBL_5M1E_ActionItems] ai
  LEFT JOIN [TBL_5M1E_Application] a ON ai.ControlNo = a.ControlNo
  LEFT JOIN [MFG_SITES] s ON a.SiteID = s.site_id
  LEFT JOIN [SUPPLIERS] sup ON a.SupplierID = sup.supplier_id

  UNION ALL

  SELECT 'MNR' AS source_module, mnr_id AS source_id, control_no, 'MNR Nonconformance' AS title, remarks AS description, COALESCE(s2.Site_Name, '') AS site_name, COALESCE(sup2.Supplier_Name, '') AS supplier_name, u.Full_Name AS pic_name, '' AS owner_name, CONVERT(NVARCHAR(30), due_date, 126) AS due_date,
  CASE request_status WHEN 'DR' THEN 'DRAFT' WHEN 'SU' THEN 'SUBMITTED' WHEN 'CK' THEN 'AWAITING_CHECK' WHEN 'AP' THEN 'AWAITING_APPROVAL' WHEN 'IS' THEN 'ISSUED' WHEN 'RJ' THEN 'REJECTED' WHEN 'CA' THEN 'CANCELLED' WHEN 'CL' THEN 'CLOSED' ELSE 'OPEN' END AS status,
  CONVERT(NVARCHAR(30), date_created, 126) AS created_at, CONVERT(NVARCHAR(30), last_update, 126) AS updated_at, '' AS remarks
  FROM [MNR_LOTS] ml
  LEFT JOIN [MFG_SITES] s2 ON ml.site_id = s2.site_id
  LEFT JOIN [SUPPLIERS] sup2 ON ml.supplier_id = sup2.supplier_id
  LEFT JOIN [USERS] u ON ml.attention_id = u.user_id
  WHERE ml.request_status NOT IN ('CL', 'CA')

  UNION ALL

  SELECT 'SQM_PLAN' AS source_module, sqmp_id AS source_id, control_no, 'SQMP Plan' AS title, remarks AS description, COALESCE(s3.Site_Name, '') AS site_name, COALESCE(sup3.Supplier_Name, '') AS supplier_name, u2.Full_Name AS pic_name, '' AS owner_name, CONVERT(NVARCHAR(30), due_date, 126) AS due_date, request_status AS status,
  CONVERT(NVARCHAR(30), registration_date, 126) AS created_at, CONVERT(NVARCHAR(30), last_update, 126) AS updated_at, '' AS remarks
  FROM [SQMP] sq
  LEFT JOIN [MFG_SITES] s3 ON sq.site_id = s3.site_id
  LEFT JOIN [SUPPLIERS] sup3 ON sq.supplier_id = sup3.supplier_id
  LEFT JOIN [USERS] u2 ON sq.attention_id = u2.user_id
  WHERE sq.request_status NOT IN ('CL', 'CA')
`;

function escapeSQL(val: string): string {
  return val.replace(/'/g, "''");
}

export const actionItemsRepository = {
  async findAllDetailed(params: ActionItemListQuery): Promise<ActionItemListRow[]> {
    const conditions: string[] = [];
    if (params.sourceModule) conditions.push(`source_module = '${escapeSQL(params.sourceModule)}'`);
    if (params.status) conditions.push(`status = '${escapeSQL(params.status)}'`);
    if (params.search) {
      const like = `'%${escapeSQL(params.search)}%'`;
      conditions.push(`(title LIKE ${like} OR description LIKE ${like} OR control_no LIKE ${like})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const rawSql = `
      SELECT * FROM (${UNION_SOURCES}) AS unified
      ${where}
      ORDER BY created_at DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${params.pageSize} ROWS ONLY
    `;

    const result = await sql<Record<string, unknown>>`${sql.raw(rawSql)}`.execute(db);
    return result.rows.map(normalizeToRow);
  },

  async countTotal(params: ActionItemListQuery): Promise<number> {
    const conditions: string[] = [];
    if (params.sourceModule) conditions.push(`source_module = '${escapeSQL(params.sourceModule)}'`);
    if (params.status) conditions.push(`status = '${escapeSQL(params.status)}'`);
    if (params.search) {
      const like = `'%${escapeSQL(params.search)}%'`;
      conditions.push(`(title LIKE ${like} OR description LIKE ${like} OR control_no LIKE ${like})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rawSql = `
      SELECT COUNT(*) AS total FROM (${UNION_SOURCES}) AS unified ${where}
    `;

    const result = await sql<{ total: number }>`${sql.raw(rawSql)}`.execute(db);
    return result.rows[0]?.total ?? 0;
  },

  async findById(compoundId: string): Promise<ActionItemListRow | null> {
    const [module, ...rest] = compoundId.split('-');
    const localId = rest.join('-');
    if (!module || !localId) return null;

    const rows = await this.findAllDetailed({ page: 1, pageSize: 100 });
    return rows.find((r) => r.id === compoundId || r.sourceRecordId === localId) || null;
  },
};
