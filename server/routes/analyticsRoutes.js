import { Router } from 'express';
import { bloodGroups, overview, updateSettings } from '../controllers/analyticsController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(requireAuth, requireRole('organisation'));

router.get('/blood-groups', bloodGroups);
router.get('/overview', overview);
router.patch('/settings', updateSettings);

export default router;
