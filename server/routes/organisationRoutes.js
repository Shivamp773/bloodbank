import { Router } from 'express';
import { listOrganisations } from '../controllers/organisationController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, listOrganisations);

export default router;
