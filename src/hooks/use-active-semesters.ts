import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface ActiveSemestersResponse {
    success: boolean;
    semesters: number[];
    count: number;
}

/**
 * Custom hook to fetch only active semesters (semesters with enrolled students)
 * for a given cohort and optionally program
 * 
 * @param cohortId - The cohort ID to filter by
 * @param programId - Optional program ID for additional filtering
 * @returns Query result with active semesters array
 */
export function useActiveSemesters(cohortId?: string, programId?: string) {
    return useQuery<ActiveSemestersResponse>({
        queryKey: ['active-semesters', cohortId, programId],
        queryFn: async () => {
            if (!cohortId) {
                return { success: true, semesters: [], count: 0 };
            }

            const params = new URLSearchParams();
            params.append('cohortId', cohortId);
            if (programId) {
                params.append('programId', programId);
            }

            const response = await api.get(`/enrollments/active-semesters?${params.toString()}`);
            return response.data;
        },
        enabled: !!cohortId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
}
