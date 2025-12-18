import { Router } from 'express';
import { seedDemoData, clearAllData } from '../controllers/system.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

// Seed demo data - accessible without auth for initial setup
router.post('/seed-demo-data', seedDemoData);

// Clear all data - admin only (requires auth)
router.post('/clear-data', authenticateToken, requireRole(['ADMIN']), clearAllData);

export default router;
