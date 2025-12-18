import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { LoginSchema, RegisterSchema } from '../utils/validation';

const router = Router();

router.post('/login', validate(LoginSchema), login);
router.post('/register', validate(RegisterSchema), register);

export default router;
