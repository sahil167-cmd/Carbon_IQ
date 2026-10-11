import { Request, Response, NextFunction } from 'express';
import { CopilotService } from './copilot.service';
import { CopilotRepository } from './copilot.repository';
import { IngestionService } from './ingestion/ingestion.service';
import { ForecastService } from '../forecast/forecast.service';
import { ForecastRepository } from '../forecast/forecast.repository';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { NotificationService } from '../../services/notification.service';
import { getPrismaClient } from '../../core/repository/tenant-scoped.repository';
import { copilotQuerySchema, createSessionSchema } from './copilot.validator';
import { UnauthorizedError } from '../../core/errors/app.error';

export class CopilotController {
  private getServices(req: Request) {
    const prisma = getPrismaClient();
    const orgId = req.user?.organizationId;
    if (!orgId) throw new UnauthorizedError('Organization context missing');

    const repo = new CopilotRepository(prisma, orgId);
    const ingestionService = new IngestionService(repo);
    const forecastRepo = new ForecastRepository(prisma);
    const flagService = new FeatureFlagService(prisma);
    const notifService = new NotificationService(prisma);
    const forecastService = new ForecastService(forecastRepo, flagService, notifService);

    const copilotService = new CopilotService(repo, ingestionService, forecastService, flagService);

    return { repo, copilotService, ingestionService };
  }

  query = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = copilotQuerySchema.parse(req.body);
      const { copilotService } = this.getServices(req);

      const result = await copilotService.executeQuery({
        organizationId: req.user!.organizationId!,
        userId: req.user!.id,
        sessionId: parsed.sessionId || undefined,
        message: parsed.message,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { repo } = this.getServices(req);
      const sessions = await repo.listSessions(req.user!.organizationId!, req.user!.id);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (err) {
      next(err);
    }
  };

  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createSessionSchema.parse(req.body);
      const { repo } = this.getServices(req);
      const session = await repo.createSession(req.user!.organizationId!, req.user!.id, parsed.title);

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  };

  getSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { repo } = this.getServices(req);
      const session = await repo.getSessionById(req.params.id, req.user!.id);

      if (!session) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Chat session not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { repo } = this.getServices(req);
      await repo.deleteSession(req.params.id, req.user!.organizationId!);

      res.status(200).json({
        success: true,
        data: { message: 'Session deleted' },
      });
    } catch (err) {
      next(err);
    }
  };

  getStarters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { copilotService } = this.getServices(req);
      const starters = await copilotService.getStarters(req.user!.organizationId!);

      res.status(200).json({
        success: true,
        data: starters,
      });
    } catch (err) {
      next(err);
    }
  };

}
