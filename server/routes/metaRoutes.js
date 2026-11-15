import { Router } from 'express';
import { getMeta, health } from '../controllers/metaController.js';

const router = Router();

router.get('/', getMeta);
router.get('/health', health);

export default router;
