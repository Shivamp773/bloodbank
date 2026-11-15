import { Router } from 'express';
import { deleteUser, listUsers, overview } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/overview', overview);
router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);

export default router;
