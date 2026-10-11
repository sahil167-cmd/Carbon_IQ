import { Router } from 'express';
import { CopilotController } from './copilot.controller';
import { authenticate } from '../../core/middleware/authenticate.middleware';

const router = Router();
const controller = new CopilotController();

// Query & Chat
router.post('/query', authenticate, controller.query);
router.post('/chat', authenticate, controller.query);

// Starter Questions
router.get('/starters', authenticate, controller.getStarters);

// Sessions
router.get('/sessions', authenticate, controller.listSessions);
router.post('/sessions', authenticate, controller.createSession);
router.get('/sessions/:id', authenticate, controller.getSession);
router.delete('/sessions/:id', authenticate, controller.deleteSession);

export default router;
export const copilotRouter = router;
