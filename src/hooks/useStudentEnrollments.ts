import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export interface StudentEnrollment {
  id: string;
  studentId: string;
  cohortId: string;
  rollNumber: string;
  status: string;
  createdAt: string;
  profile?: {
    fullName: string;
    email: string;
    mobileNumber?: string;
  };
  student?: {
    fullName: string;
    email: string;
    mobileNumber?: string;
  };
}

export function useStudentEnrollments(cohortId: string | null) {
  return useQuery({
    queryKey: ['student-enrollments', cohortId],
    queryFn: async () => {
      if (!cohortId) return [];
      const { data } = await api.get(`/enrollments?cohortId=${cohortId}`);
      return data;
    },
    enabled: !!cohortId,
  });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { studentId: string; cohortId: string; rollNumber: string }) => {
      await api.post('/enrollments', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments', variables.cohortId] });
      toast({ title: 'Student enrolled successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to enroll student', description: error.message || 'Error', variant: 'destructive' });
    },
  });
}

export function useBulkEnrollStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { cohortId: string; students: Array<{ email: string; fullName: string; rollNumber: string }> }) => {
      const { data: results } = await api.post('/enrollments/bulk', data);
      return results;
    },
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments', variables.cohortId] });
      toast({
        title: 'Bulk enrollment complete',
        description: `${results.success} enrolled, ${results.errors.length} errors`
      });
    },
  });
}
