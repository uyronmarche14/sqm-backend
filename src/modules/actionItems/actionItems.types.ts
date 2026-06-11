export interface ActionItemListQuery {
  page: number;
  pageSize: number;
  status?: string;
  sourceModule?: string;
  search?: string;
}

export interface ActionItemListRow {
  id: string;
  controlNo: string;
  title: string;
  supplier: string;
  supplierName: string;
  siteName: string;
  status: string;
  statusLabel: string;
  priority: string;
  ownerName: string;
  picName: string;
  sourceModule: string;
  sourceReference: string;
  sourceRecordId?: string;
  dueDate?: string;
  closedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  agingDays?: number;
  isOverdue: boolean;
  remarks?: string;
  availableActions: string[];
}

export interface ActionItemListResponse {
  rows: ActionItemListRow[];
  total: number;
  query: ActionItemListQuery;
}
