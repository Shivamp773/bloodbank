import { Router } from 'express';
import {
  appointmentStats,
  cancelAppointment,
  completeAppointment,
  createAppointment,
  eligibility,
  listAppointments,
  markNoShow,
} from '../controllers/appointmentController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(requireAuth);

router.get('/eligibility', requireRole('donor'), eligibility);
router.get('/', requireRole('donor', 'organisation'), listAppointments);
router.get('/stats', requireRole('donor', 'organisation'), appointmentStats);
router.post('/', requireRole('donor'), createAppointment);
router.patch('/:id/complete', requireRole('organisation'), completeAppointment);
router.patch('/:id/no-show', requireRole('organisation'), markNoShow);
router.patch('/:id/cancel', requireRole('donor', 'organisation'), cancelAppointment);

export default router;
