import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  cohort_id: string;
  academic_year: string;
  created_at: string;
  teacher?: {
    full_name: string;
    email: string;
  };
  subject?: {
    name: string;
    code: string;
  };
  cohort?: {
    name: string;
  };
}

export function useTeacherAssignments(filters?: { cohort_id?: string; teacher_id?: string }) {
  return useQuery({
    queryKey: ['teacher-assignments', filters],
    queryFn: async () => {
      let query = supabase
        .from('teacher_assignments')
        .select(`
          *,
          subject:subjects(name, code),
          cohort:cohorts(name)
        `);
      
      if (filters?.cohort_id) {
        query = query.eq('cohort_id', filters.cohort_id);
      }
      if (filters?.teacher_id) {
        query = query.eq('teacher_id', filters.teacher_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch teacher profiles separately
      const teacherIds = [...new Set(data?.map(a => a.teacher_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', teacherIds);
      
      return data?.map(a => ({
        ...a,
        teacher: profiles?.find(p => p.user_id === a.teacher_id)
      })) || [];
    },
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      
      if (rolesError) throw rolesError;
      
      const teacherIds = roles?.map(r => r.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', teacherIds);
      
      if (profilesError) throw profilesError;
      
      return profiles || [];
    },
  });
}

export function useCreateTeacherAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      teacher_id: string;
      subject_id: string;
      cohort_id: string;
      academic_year: string;
    }) => {
      const { error } = await supabase
        .from('teacher_assignments')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast({ title: 'Teacher assigned successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to assign teacher', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTeacherAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teacher_assignments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast({ title: 'Assignment removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove assignment', description: error.message, variant: 'destructive' });
    },
  });
}
