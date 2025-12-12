import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export interface StudentEnrollment {
  id: string;
  student_id: string;
  cohort_id: string;
  roll_number: string;
  status: string;
  created_at: string;
  student?: { full_name: string; email: string };
  cohort?: { name: string };
}

export function useStudentEnrollments(params?: { cohort_id?: string; student_id?: string }) {
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading, error } = useQuery({
    queryKey: ['enrollments', params],
    queryFn: () => enrollmentsApi.list(params),
  });

  const createEnrollmentMutation = useMutation({
    mutationFn: (data: { student_id: string; cohort_id: string; roll_number: string; status?: string }) =>
      enrollmentsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Student enrolled successfully' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error enrolling student',
        description: error.response?.data?.detail || 'Failed to enroll student',
        variant: 'destructive',
      });
    },
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) => enrollmentsApi.delete(enrollmentId),
    onSuccess: () => {
      toast({ title: 'Enrollment removed' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing enrollment',
        description: error.response?.data?.detail || 'Failed to remove enrollment',
        variant: 'destructive',
      });
    },
  });

  return {
    enrollments,
    isLoading,
    error,
    createEnrollment: createEnrollmentMutation.mutate,
    isCreating: createEnrollmentMutation.isPending,
    deleteEnrollment: deleteEnrollmentMutation.mutate,
    isDeleting: deleteEnrollmentMutation.isPending,
  };
}
