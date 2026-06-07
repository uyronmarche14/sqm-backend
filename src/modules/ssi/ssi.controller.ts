import type { NextFunction, Request, Response } from 'express';
import {
  createResponse,
  deleteResponse,
  successResponse,
  updateResponse,
} from '../../shared/utils/api-response.js';
import { ssiPlanService } from './plans/ssi-plan.service.js';
import { ssiRecordQueryService } from './records/ssi-record-query.service.js';
import { ssiRecordCommandService } from './records/ssi-record-command.service.js';
import { ssiWorkflowService } from './workflow/ssi-workflow.service.js';
import { ssiResponseService } from './responses/ssi-response.service.js';
import { ssiReportService } from './reports/ssi-report.service.js';
import { ssiLookupService } from './lookups/ssi-lookup.service.js';
import { ssiArtifactService } from './artifacts/ssi-artifact.service.js';
import { ssiAccessService } from './shared/ssi-access.service.js';
import type { SsiRecord } from './types/ssi.types.js';
import {
  SsiArtifactIdParamSchema,
  SsiArtifactPayloadSchema,
  SsiIdParamSchema,
  SsiPlanCancelInputSchema,
  SsiPlanInputSchema,
  SsiRecordInputSchema,
  SsiRecordListQuerySchema,
  SsiResponseReviewBodySchema,
  SsiResponseSaveBodySchema,
  SsiSearchQuerySchema,
  SsiWorkflowActionBodySchema,
} from './ssi.schema.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePayloadBody(body: unknown) {
  if (!isPlainObject(body)) {
    return {};
  }

  if (typeof body.payload === 'string') {
    try {
      const parsed = JSON.parse(body.payload);
      if (isPlainObject(parsed)) {
        return parsed;
      }
    } catch {
      return body;
    }
  }

  return body;
}

class SsiController {
  private async getActor(req: Request) {
    return ssiAccessService.resolveActorContext(req.user?.userId, req.user?.roleId);
  }

  async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const plans = await ssiPlanService.list(actor);
      return res.json(successResponse(plans));
    } catch (error) {
      return next(error);
    }
  }

  async getPlanById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const plan = await ssiPlanService.getById(id);
      return res.json(successResponse(plan));
    } catch (error) {
      return next(error);
    }
  }

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const payload = SsiPlanInputSchema.parse(normalizePayloadBody(req.body));
      const plan = await ssiPlanService.create(actor, payload);
      return res.status(201).json(createResponse(plan));
    } catch (error) {
      return next(error);
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiPlanInputSchema.partial().parse(normalizePayloadBody(req.body));
      const plan = await ssiPlanService.update(id, actor, payload);
      return res.json(updateResponse(plan));
    } catch (error) {
      return next(error);
    }
  }

  async cancelPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiPlanCancelInputSchema.parse(normalizePayloadBody(req.body));
      const plan = await ssiPlanService.cancel(id, actor, payload);
      return res.json(updateResponse(plan, 'Record updated successfully'));
    } catch (error) {
      return next(error);
    }
  }

  async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      await ssiPlanService.delete(id);
      return res.json(deleteResponse(id));
    } catch (error) {
      return next(error);
    }
  }

  async createRecordFromPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiRecordInputSchema.partial().parse(normalizePayloadBody(req.body));
      const record = await ssiPlanService.createRecordFromPlan(id, actor, payload as Partial<SsiRecord>);
      return res.status(201).json(createResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async listRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { query } = SsiRecordListQuerySchema.parse({ query: req.query });
      const records = await ssiRecordQueryService.list(actor, query);
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async getRecordById(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const record = await ssiRecordQueryService.getById(id, actor);
      return res.json(successResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async createRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const payload = SsiRecordInputSchema.parse(normalizePayloadBody(req.body));
      const record = await ssiRecordCommandService.create(actor, payload as Partial<SsiRecord>);
      return res.status(201).json(createResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async updateRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiRecordInputSchema.partial().parse(normalizePayloadBody(req.body));
      const record = await ssiRecordCommandService.update(id, actor, payload as Partial<SsiRecord>);
      return res.json(updateResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async deleteRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      await ssiRecordCommandService.delete(id, actor);
      return res.json(deleteResponse(id));
    } catch (error) {
      return next(error);
    }
  }

  private async runWorkflowAction(
    req: Request,
    res: Response,
    next: NextFunction,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue' | 'cancel' | 'resubmit',
  ) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiWorkflowActionBodySchema.parse(normalizePayloadBody(req.body));
      const record = await ssiWorkflowService.applyAction(id, actor, action, payload);
      return res.json(updateResponse(record, 'Record updated successfully'));
    } catch (error) {
      return next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    return this.runWorkflowAction(req, res, next, 'submit');
  }

  async check(req: Request, res: Response, next: NextFunction) {
    return this.runWorkflowAction(req, res, next, 'check');
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    return this.runWorkflowAction(req, res, next, 'approve');
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    return this.runWorkflowAction(req, res, next, 'reject');
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    return this.runWorkflowAction(req, res, next, 'issue');
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    return this.runWorkflowAction(req, res, next, 'cancel');
  }

  async resubmit(req: Request, res: Response, next: NextFunction) {
    return this.runWorkflowAction(req, res, next, 'resubmit');
  }

  async saveResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiResponseSaveBodySchema.parse(normalizePayloadBody(req.body));
      const responsePayload = await ssiResponseService.save(id, actor, payload.payload);
      return res.json(updateResponse(responsePayload, 'Record updated successfully'));
    } catch (error) {
      return next(error);
    }
  }

  async submitResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiResponseSaveBodySchema.parse(normalizePayloadBody(req.body));
      const responsePayload = await ssiResponseService.submit(id, actor, payload.payload);
      return res.json(updateResponse(responsePayload, 'Record updated successfully'));
    } catch (error) {
      return next(error);
    }
  }

  async reviewResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiResponseReviewBodySchema.parse(normalizePayloadBody(req.body));
      const responsePayload = await ssiResponseService.review(id, actor, payload);
      return res.json(updateResponse(responsePayload, 'Record updated successfully'));
    } catch (error) {
      return next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { query } = SsiSearchQuerySchema.parse({ query: req.query });
      const records = await ssiReportService.search(actor, query);
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async achievement(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { query } = SsiSearchQuerySchema.parse({ query: req.query });
      const responsePayload = await ssiReportService.achievement(actor, query);
      return res.json(successResponse(responsePayload));
    } catch (error) {
      return next(error);
    }
  }

  async reports(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { query } = SsiSearchQuerySchema.parse({ query: req.query });
      const responsePayload = await ssiReportService.reports(actor, query);
      return res.json(successResponse(responsePayload));
    } catch (error) {
      return next(error);
    }
  }

  async calendar(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await ssiReportService.calendar();
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async lookups(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await ssiLookupService.getLookups();
      return res.json(successResponse(payload));
    } catch (error) {
      return next(error);
    }
  }

  async generateArtifact(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = await this.getActor(req);
      const { id } = SsiArtifactIdParamSchema.parse({ params: req.params }).params;
      const payload = SsiArtifactPayloadSchema.parse(normalizePayloadBody(req.body));
      const record = await ssiArtifactService.generateCertificate(id, actor, payload);
      return res.json(updateResponse(record, 'Record updated successfully'));
    } catch (error) {
      return next(error);
    }
  }
}

export const ssiController = new SsiController();