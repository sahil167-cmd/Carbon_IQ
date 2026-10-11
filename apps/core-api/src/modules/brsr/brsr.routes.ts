import { Router } from 'express';
import { BRSRController } from './brsr.controller';
import { authenticate } from '../../core/middleware/authenticate.middleware';

const router = Router();
const controller = new BRSRController();

// BRSR Reports List & Creation
router.get('/reports', authenticate, controller.listReports);
router.post('/reports', authenticate, controller.createReport);

// Individual Report Details, Updates & Carbon Re-sync
router.get('/reports/:id', authenticate, controller.getReport);
router.put('/reports/:id', authenticate, controller.updateReport);
router.post('/reports/:id/sync-carbon', authenticate, controller.syncCarbon);

// Report Generation & PDF Download
router.post('/reports/:id/generate', authenticate, controller.generatePdf);
router.get('/reports/:id/download', authenticate, controller.generatePdf);

export default router;
export const brsrRouter = router;
