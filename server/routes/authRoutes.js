import { Router } from 'express';
import { currentUser, login, register } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../middlewares/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/current-user', requireAuth, currentUser);

export default router;
