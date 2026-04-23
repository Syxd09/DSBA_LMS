import { Router } from 'express';
import { login, register, getProfile, logout } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { LoginSchema, RegisterSchema } from '../utils/validation';

import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', validate(LoginSchema), login);
router.post('/register', validate(RegisterSchema), register);
router.get('/me', authenticateToken, getProfile);
router.post('/logout', authenticateToken, logout);

export default router;
