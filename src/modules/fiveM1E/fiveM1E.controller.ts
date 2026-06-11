import { Request, Response, NextFunction } from 'express';
import { fiveM1EService } from './fiveM1E.service.js';
import { successResponse } from '../../shared/utils/api-response.js';
import { resolveWorkflowListScope } from '../../shared/utils/workflow-access.js';

export class FiveM1EController {
  constructor() {
    this.createApplication = this.createApplication.bind(this);
    this.getAllApplications = this.getAllApplications.bind(this);
    this.getApplication = this.getApplication.bind(this);
    this.updateApplication = this.updateApplication.bind(this);
    this.deleteApplication = this.deleteApplication.bind(this);
    this.submitApplication = this.submitApplication.bind(this);
    this.checkApplication = this.checkApplication.bind(this);
    this.approveApplication = this.approveApplication.bind(this);
    this.rejectApplication = this.rejectApplication.bind(this);
    this.releaseApplication = this.releaseApplication.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
  }

  private getActor(req: Request) {
    return {
      userId: req.user?.userId,
      roleName: (req as any).user?.roleName || (req as any).user?.role_name || (req as any).user?.role || undefined,
    };
  }
  
  /**
   * Submit a new 5M1E Application
   */
  async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = this.getActor(req);
      const files = (req as any).files || [];
      
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[Backend] Receiving 5M1E Create form data from user ${actor.userId}`, { files: files.length, body: req.body });
      }

      const result = await fiveM1EService.createApplication(req.body, actor, files);
      
      res.status(201).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch all 5M1E Applications
   */
  async getAllApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const picId = req.query.picId as string | undefined;
      const siteId = req.query.siteId as string | undefined;
      const supplierId = req.query.supplierId as string | undefined;
      const records = await fiveM1EService.getAllApplications(
        status,
        this.getActor(req),
        resolveWorkflowListScope({ scope: req.query.scope, assignedToMe: req.query.assignedToMe }),
        { picId, siteId, supplierId },
      );
      
      res.status(200).json(successResponse(records));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch a specific Application by its Control Number
   */
  async getApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string; // ID acts as controlNo in our URL schema
      
      const record = await fiveM1EService.getApplication(id, this.getActor(req));
      
      res.status(200).json(successResponse(record));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing Application
   */
  async updateApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const files = (req as any).files || [];
      const actor = this.getActor(req);
      
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[Backend] Receiving 5M1E Update form data for ${id} by user ${actor.userId}`, { files: files.length, body: req.body });
      }

      const result = await fiveM1EService.updateApplication(id, req.body, files, actor);
      
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an Application and all child data
   */
  async deleteApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await fiveM1EService.deleteApplication(id, this.getActor(req));
      res.status(200).json(successResponse({ id }, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Submit
   */
  async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.submitApplication(id, userId);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Check (two-stage approval — checker marks as reviewed)
   */
  async checkApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.checkApplication(id, userId, req.body?.remarks);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Approve
   */
  async approveApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.approveApplication(id, userId, req.body?.remarks, req.body?.status);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Reject
   */
  async rejectApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.rejectApplication(id, userId, req.body?.remarks);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Release
   */
  async releaseApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.releaseApplication(id, userId);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = req.params;
      const { filePath, fileName, mimeType } = await fiveM1EService.downloadAttachment(
        attachmentId as string,
        this.getActor(req),
      );
      
      console.info(`[Backend] Sending attachment ${attachmentId} to frontend`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.download(filePath);
    } catch (error) {
      console.error('[Backend] Attachment sending failed:', error);
      next(error);
    }
  }
}

export const fiveM1EController = new FiveM1EController();
