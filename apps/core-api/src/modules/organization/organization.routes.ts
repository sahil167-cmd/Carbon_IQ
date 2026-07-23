import { Router } from 'express';

export const organizationRouter = Router();
export const industryRouter = Router();

organizationRouter.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

industryRouter.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

export default organizationRouter;
