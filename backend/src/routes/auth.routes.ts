// src/routes/auth.routes.ts
import { Router } from 'express';
import { getAuthMessage, verifySignature } from '../controllers/auth.controller';

const router = Router();

// Endpoint to get the static message to sign
// Frontend calls this first
router.get('/message', getAuthMessage);

// Endpoint to verify signature and get JWT
// Frontend calls this second with the signed message
router.post('/verify', verifySignature);

export default router;