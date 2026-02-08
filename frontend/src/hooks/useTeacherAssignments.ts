import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  cohort_id: string;
  academic_year: string;
  created_at: string;
  teacher?: { full_name: string; email: string };
  subject?: { name: string; code: string };
  cohort?: { name: string };
}

export function useTeacherAssignments(params?: { teacher_id?: string; subject_id?: string; cohort_id?: string }) {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['assignments', params],
    queryFn: () => assignmentsApi.list(params),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data: { teacher_id: string; subject_id: string; cohort_id: string; academic_year: string }) =>
      assignmentsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Teacher assigned successfully' });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error assigning teacher',
        description: error.response?.data?.detail || 'Failed to assign teacher',
        variant: 'destructive',
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => assignmentsApi.delete(assignmentId),
    onSuccess: () => {
      toast({ title: 'Assignment removed' });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing assignment',
        description: error.response?.data?.detail || 'Failed to remove assignment',
        variant: 'destructive',
      });
    },
  });

  return {
    assignments,
    isLoading,
    error,
    createAssignment: createAssignmentMutation.mutate,
    isCreating: createAssignmentMutation.isPending,
    deleteAssignment: deleteAssignmentMutation.mutate,
    isDeleting: deleteAssignmentMutation.isPending,
  };
}
