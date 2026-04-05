import { Router } from 'express';
import { getNonce, verifySignature, logout, registerAccount } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Step 1: Frontend requests a nonce for the wallet address
router.get('/nonce', getNonce);
router.post('/nonce', getNonce); // Also accept POST with address in body

// Step 2: Frontend signs the nonce message and sends signature + address
router.post('/verify', verifySignature);
router.post('/register', authenticateToken, registerAccount);
router.post('/logout', logout);

export default router;
