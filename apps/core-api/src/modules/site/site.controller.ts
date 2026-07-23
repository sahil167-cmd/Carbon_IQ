import { Request, Response } from 'express';
import { SiteService } from './site.service';
import { successResponse } from '../../utils/response.util';
import { CreateSiteInput, UpdateSiteInput, ListSitesQuery } from './site.validator';
import { SiteStatus } from '@prisma/client';

export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  // ── Create Site ─────────────────────────────────────────────────────────────
  createSite = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const input = req.body as CreateSiteInput;

    const site = await this.siteService.createSite(userId, input);

    res.status(201).json(
      successResponse(site, { requestId: req.requestId }),
    );
  };

  // ── List & Get Sites ────────────────────────────────────────────────────────
  listSites = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.query as ListSitesQuery;
    const sites = await this.siteService.listSites(status as SiteStatus);

    res.json(
      successResponse(sites, { requestId: req.requestId }),
    );
  };

  getSite = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const site = await this.siteService.getSiteById(id);

    res.json(
      successResponse(site, { requestId: req.requestId }),
    );
  };

  // ── Update Site ─────────────────────────────────────────────────────────────
  updateSite = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const input = req.body as UpdateSiteInput;

    const updated = await this.siteService.updateSite(userId, id, input);

    res.json(
      successResponse(updated, { requestId: req.requestId }),
    );
  };

  // ── Deactivate Site (Soft Delete) ──────────────────────────────────────────
  deactivateSite = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const deactivated = await this.siteService.deactivateSite(userId, id);

    res.json(
      successResponse(deactivated, { requestId: req.requestId }),
    );
  };

  // ── Delete Site (Hard Delete) ──────────────────────────────────────────────
  deleteSite = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    await this.siteService.deleteSite(userId, id);

    res.json(
      successResponse({ message: 'Site permanently deleted' }, { requestId: req.requestId }),
    );
  };

  // ── Site Dashboard ──────────────────────────────────────────────────────────
  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const metrics = await this.siteService.getSiteDashboard(id);

    res.json(
      successResponse(metrics, { requestId: req.requestId }),
    );
  };
}
