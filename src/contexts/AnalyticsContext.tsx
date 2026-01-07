import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  DepartmentAnalytics,
  CollegeAnalytics,
  AnalyticsFilters
} from '../types/feedback.types';
import {
  feedbackAnalyticsApi,
  apiCall
} from '../api/feedbackApi';

interface AnalyticsContextValue {
  // Data
  departmentAnalytics: DepartmentAnalytics | null;
  collegeAnalytics: CollegeAnalytics | null;
  
  // Filters
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  
  // Loading states
  isLoading: boolean;
  isRecalculating: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchDepartmentAnalytics: (departmentId: string, filters?: AnalyticsFilters) => Promise<void>;
  fetchCollegeAnalytics: (filters?: AnalyticsFilters) => Promise<void>;
  recalculateAnalytics: (options?: {
    studentId?: string;
    subjectId?: string;
    semester?: number;
    departmentId?: string;
    forceAll?: boolean;
  }) => Promise<void>;
  clearError: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [departmentAnalytics, setDepartmentAnalytics] = useState<DepartmentAnalytics | null>(null);
  const [collegeAnalytics, setCollegeAnalytics] = useState<CollegeAnalytics | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Fetch department-level analytics (HOD scope)
   * Backend enforces department RBAC
   */
  const fetchDepartmentAnalytics = useCallback(async (
    departmentId: string,
    filterOverrides?: AnalyticsFilters
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const activeFilters = filterOverrides || filters;
      const data = await apiCall(
        feedbackAnalyticsApi.getDepartmentAnalytics(departmentId, activeFilters)
      );
      
      setDepartmentAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch department analytics');
      console.error('fetchDepartmentAnalytics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Fetch college-wide analytics (Principal scope)
   * Backend enforces role RBAC
   */
  const fetchCollegeAnalytics = useCallback(async (
    filterOverrides?: AnalyticsFilters
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const activeFilters = filterOverrides || filters;
      const data = await apiCall(
        feedbackAnalyticsApi.getCollegeAnalytics(activeFilters)
      );
      
      setCollegeAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch college analytics');
      console.error('fetchCollegeAnalytics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Manual recalculation (Admin only)
   * Backend enforces RBAC
   */
  const recalculateAnalytics = useCallback(async (options?: {
    studentId?: string;
    subjectId?: string;
    semester?: number;
    departmentId?: string;
    forceAll?: boolean;
  }) => {
    try {
      setIsRecalculating(true);
      setError(null);
      
      await apiCall(
        feedbackAnalyticsApi.recalculate(options || {})
      );
      
      // Refresh analytics after recalculation
      if (departmentAnalytics && options?.departmentId) {
        await fetchDepartmentAnalytics(options.departmentId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to recalculate analytics');
      console.error('recalculateAnalytics error:', err);
    } finally {
      setIsRecalculating(false);
    }
  }, [departmentAnalytics, fetchDepartmentAnalytics]);

  return (
    <AnalyticsContext.Provider
      value={{
        departmentAnalytics,
        collegeAnalytics,
        filters,
        setFilters,
        isLoading,
        isRecalculating,
        error,
        fetchDepartmentAnalytics,
        fetchCollegeAnalytics,
        recalculateAnalytics,
        clearError,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}
