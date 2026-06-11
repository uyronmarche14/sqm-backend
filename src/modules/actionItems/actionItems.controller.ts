import type { NextFunction, Request, Response } from 'express';
import { actionItemsService } from './actionItems.service.js';

function str(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined;
}

export const actionItemsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await actionItemsService.list({
        page: Number(str(req.query.page)) || 1,
        pageSize: Number(str(req.query.pageSize)) || 50,
        status: str(req.query.status),
        sourceModule: str(req.query.sourceModule),
        search: str(req.query.search),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = str(req.params.id) || '';
      const item = await actionItemsService.getById(id);
      if (!item) {
        res.status(404).json({ success: false, error: { message: 'Action item not found' } });
        return;
      }
      res.json({ data: item });
    } catch (error) {
      next(error);
    }
  },

  async exportList(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await actionItemsService.list({
        page: Number(str(req.query.page)) || 1,
        pageSize: 10000,
        status: str(req.query.status),
        sourceModule: str(req.query.sourceModule),
        search: str(req.query.search),
      });
      res.json({ rows: items.rows, total: items.total, exportedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  },
};
