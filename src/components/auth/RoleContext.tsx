/**
 * Role Context Provider
 * Provides role-based access control utilities throughout the app.
 * Phase 6.5: UI & Dashboards (Frontend)
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, AppRole } from '@/hooks/useAuth';

// Permission definitions matching backend RBAC
type Permission = 
  // Dashboard permissions
  | 'dashboard:student'
  | 'dashboard:teacher'
  | 'dashboard:hod'
  | 'dashboard:principal'
  // Analytics permissions
  | 'analytics:read'
  | 'co_attainment:read'
  | 'po_attainment:read'
  | 'student_marks:read'
  // Administrative permissions
  | 'marks:enter'
  | 'marks:approve'
  | 'course_outcomes:manage'
  | 'users:manage'
  | 'audit:read';

// Role-permission mapping (mirrors backend policies.py)
const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  principal: [
    'dashboard:principal',
    'dashboard:hod',
    'dashboard:teacher',
    'dashboard:student',
    'analytics:read',
    'co_attainment:read',
    'po_attainment:read',
    'student_marks:read',
    'marks:enter',
    'marks:approve',
    'course_outcomes:manage',
    'users:manage',
    'audit:read',
  ],
  hod: [
    'dashboard:hod',
    'dashboard:teacher',
    'dashboard:student',
    'analytics:read',
    'co_attainment:read',
    'po_attainment:read',
    'student_marks:read',
    'marks:approve',
    'course_outcomes:manage',
    'audit:read',
  ],
  teacher: [
    'dashboard:teacher',
    'dashboard:student',
    'analytics:read',
    'co_attainment:read',
    'student_marks:read',
    'marks:enter',
  ],
  student: [
    'dashboard:student',
    'student_marks:read',
  ],
};

interface RoleContextValue {
  role: AppRole | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessRoute: (requiredRoles: AppRole[]) => boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  canAccessRoute: () => false,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  const canAccessRoute = (requiredRoles: AppRole[]): boolean => {
    if (!role) return false;
    if (requiredRoles.length === 0) return true;
    return requiredRoles.includes(role);
  };

  return (
    <RoleContext.Provider value={{
      role,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessRoute,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export type { Permission, AppRole };
