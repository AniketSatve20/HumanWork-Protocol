import { Router } from 'express';
import { getAuthMessage, verifySignature } from '../controllers/auth.controller.js';

const router = Router();

router.get('/message', getAuthMessage);
router.post('/verify', verifySignature);

export default router;
