import { Router } from 'express';
import {
  approveRequest,
  cancelRequest,
  createRequest,
  listRequests,
  rejectRequest,
  requestStats,
} from '../controllers/requestController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole('hospital', 'organisation'), listRequests);
router.get('/stats', requireRole('hospital', 'organisation'), requestStats);
router.post('/', requireRole('hospital'), createRequest);
router.patch('/:id/approve', requireRole('organisation'), approveRequest);
router.patch('/:id/reject', requireRole('organisation'), rejectRequest);
router.patch('/:id/cancel', requireRole('hospital'), cancelRequest);

export default router;
