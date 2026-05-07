import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from './useAuth';

/**
 * Custom hook to fetch and filter available semesters based on user role and context.
 * 
 * @param cohortId - Optional cohort ID for smart filtering (enrollment-based)
 * @param programId - Optional program ID for program-duration-based filtering
 * @returns Sorted array of semester numbers
 */
export function useAvailableSemesters(cohortId?: string, programId?: string) {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  // Fetch teacher assignments to know which semesters they are actually assigned to
  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/assignments');
      return data || [];
    },
    enabled: !!user?.id && (role === 'teacher' || role === 'hod'),
  });

  // Fetch programs to check duration (for HOD/Admin)
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list-sem'],
    queryFn: async () => {
      const { data } = await api.get('/programs');
      return data || [];
    },
    enabled: role === 'admin' || role === 'principal' || role === 'hod',
  });

  // Fetch active semesters (from enrollments) for the specific cohort if provided
  const { data: activeSemestersData } = useQuery({
    queryKey: ['active-semesters', cohortId],
    queryFn: async () => {
      if (!cohortId) return { semesters: [] };
      const { data } = await api.get(`/enrollments/active-semesters?cohortId=${cohortId}`);
      return data;
    },
    enabled: !!cohortId,
  });

  return useMemo(() => {
    // 1. If we have active semesters from enrollments for a specific cohort, that's the most accurate
    if (activeSemestersData?.semesters?.length > 0) {
      return [...activeSemestersData.semesters].sort((a, b) => a - b);
    }

    // 2. If Teacher, strictly show ONLY assigned semesters
    if (role === 'teacher') {
      const sems = assignments.map((a: any) => a.semester);
      if (sems.length > 0) {
        return Array.from(new Set(sems)).sort((a: any, b: any) => Number(a) - Number(b));
      }
      return [1, 2, 3, 4, 5, 6, 7, 8]; // Fallback if no assignments yet
    }

    // 3. If Program is selected, limit by duration (Years * 2)
    if (programId) {
      const prog = programs.find((p: any) => p.id === programId);
      if (prog?.durationYears) {
        const total = prog.durationYears * 2;
        return Array.from({ length: total }, (_, i) => i + 1);
      }
    }

    // 4. Default fallback (or if Admin/Principal/HOD with no specific context)
    // We could also filter by the HOD's department programs here
    if (role === 'hod' && assignments.length > 0) {
        // HOD might be interested in semesters where their department has subjects
        const sems = assignments.map((a: any) => a.semester);
        if (sems.length > 0) {
          return Array.from(new Set(sems)).sort((a: any, b: any) => Number(a) - Number(b));
        }
    }

    return [1, 2, 3, 4, 5, 6, 7, 8];
  }, [role, assignments, programs, activeSemestersData, programId]);
}
