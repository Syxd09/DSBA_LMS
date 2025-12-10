import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StudentEnrollment {
  id: string;
  student_id: string;
  cohort_id: string;
  roll_number: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export function useStudentEnrollments(cohortId: string | null) {
  return useQuery({
    queryKey: ['student-enrollments', cohortId],
    queryFn: async () => {
      if (!cohortId) return [];
      
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          profile:profiles!student_enrollments_student_id_fkey(full_name, email)
        `)
        .eq('cohort_id', cohortId)
        .order('roll_number');
      
      if (error) {
        // Fallback query without join if foreign key doesn't exist
        const { data: enrollments, error: enrollError } = await supabase
          .from('student_enrollments')
          .select('*')
          .eq('cohort_id', cohortId)
          .order('roll_number');
        
        if (enrollError) throw enrollError;
        
        // Fetch profiles separately
        const studentIds = enrollments?.map(e => e.student_id) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);
        
        return enrollments?.map(e => ({
          ...e,
          profile: profiles?.find(p => p.user_id === e.student_id)
        })) || [];
      }
      
      return data || [];
    },
    enabled: !!cohortId,
  });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { student_id: string; cohort_id: string; roll_number: string }) => {
      const { error } = await supabase
        .from('student_enrollments')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments', variables.cohort_id] });
      toast({ title: 'Student enrolled successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to enroll student', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkEnrollStudents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { cohort_id: string; students: Array<{ email: string; full_name: string; roll_number: string }> }) => {
      const results = { success: 0, errors: [] as string[] };
      
      for (const student of data.students) {
        try {
          // Check if user exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', student.email)
            .maybeSingle();
          
          if (profile) {
            // Enroll existing user
            const { error } = await supabase
              .from('student_enrollments')
              .insert({
                student_id: profile.user_id,
                cohort_id: data.cohort_id,
                roll_number: student.roll_number,
              });
            
            if (error) {
              results.errors.push(`${student.email}: ${error.message}`);
            } else {
              results.success++;
            }
          } else {
            results.errors.push(`${student.email}: User not found in system`);
          }
        } catch (err) {
          results.errors.push(`${student.email}: ${err}`);
        }
      }
      
      return results;
    },
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments', variables.cohort_id] });
      toast({ 
        title: 'Bulk enrollment complete', 
        description: `${results.success} enrolled, ${results.errors.length} errors` 
      });
    },
  });
}
