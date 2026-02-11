/**
 * EduMetrics API Client (Legacy Barrel File)
 * Re-exports from modular services for backward compatibility.
 * 
 * @deprecated Import directly from @/services/* instead.
 */

export * from './client';

export * from '@/services/authService';
export * from '@/services/userService';
export * from '@/services/academicService';
export * from '@/services/marksService';
export * from '@/services/analyticsService';
export * from '@/services/assessmentService';
export * from '@/services/notificationService';
export * from '@/services/adminService';
export * from '@/services/templatesService';
export * from '@/services/remedialService';
export * from '@/services/promotionService';
export * from '@/services/sectionService';
export * from '@/services/backlogService';
export * from '@/services/unitService';
export * from '@/services/externalExamService';

// Default export for backward compatibility
import { apiClient } from './client';
export default apiClient;
