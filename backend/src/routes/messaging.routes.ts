
import { Router } from 'express';
import { createGroup, getGroups, getMessages, sendMessage } from '../controllers/messaging.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/groups', createGroup);
router.get('/groups', getGroups);
router.get('/groups/:groupId/messages', getMessages);
router.post('/groups/:groupId/messages', sendMessage);

export default router;
