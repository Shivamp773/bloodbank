import { Router } from 'express';
import {
  availability,
  createInventory,
  listDonors,
  listHospitals,
  listInventory,
  myHistory,
  myOrganisations,
  recentInventory,
} from '../controllers/inventoryController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(requireAuth);

// Organisation
router.post('/', requireRole('organisation'), createInventory);
router.get('/', requireRole('organisation'), listInventory);
router.get('/recent', requireRole('organisation'), recentInventory);
router.get('/donors', requireRole('organisation'), listDonors);
router.get('/hospitals', requireRole('organisation'), listHospitals);

// Donor and hospital
router.get('/organisations', requireRole('donor', 'hospital'), myOrganisations);
router.get('/history', requireRole('donor', 'hospital'), myHistory);

// Which organisations hold a blood group (used when a hospital creates a request)
router.get('/availability', requireRole('hospital', 'organisation'), availability);

export default router;
