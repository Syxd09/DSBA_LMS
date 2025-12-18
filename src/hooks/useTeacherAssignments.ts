import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  cohortId: string;
  departmentId?: string;
  semester: number;
  academicYear: string;
  section: string;
  teacher?: {
    fullName: string;
    email: string;
  };
  subject?: {
    name: string;
    code: string;
  };
}

export function useTeacherAssignments(filters?: {
  teacher_id?: string;
  subject_id?: string;
  academic_year?: string;
}) {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['teacher-assignments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.teacher_id) params.append('teacherId', filters.teacher_id);
      if (filters?.subject_id) params.append('subjectId', filters.subject_id);
      if (filters?.academic_year) params.append('academicYear', filters.academic_year);

      const { data } = await api.get(`/assignments?${params.toString()}`);
      return data;
    },
  });

  const assignTeacher = useMutation({
    mutationFn: async (assignment: Omit<TeacherAssignment, 'id' | 'teacher' | 'subject'>) => {
      const { data } = await api.post('/assignments', assignment);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast({ title: 'Teacher assigned successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to assign teacher', description: error.message || 'Error', variant: 'destructive' });
    }
  });

  const removeAssignment = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast({ title: 'Assignment removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to remove assignment', description: error.message || 'Error', variant: 'destructive' });
    }
  });

  return {
    assignments,
    isLoading,
    assignTeacher,
    removeAssignment,
  };
}

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data } = await api.get('/users/teachers');
      return data;
    },
  });
}
