import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { StudentResultCard } from '@/components/student/StudentResultCard';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Results() {
  const { user } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  // Fetch student enrollment to get cohort info
  const { data: enrollment } = useQuery({
    queryKey: ['student-enrollment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('*, cohorts(name, current_semester, program_id)')
        .eq('student_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch final marks
  const { data: finalMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['student-final-marks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('final_marks')
        .select('*, subjects(name, code, semester, credits)')
        .eq('student_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch semester results
  const { data: semesterResults = [] } = useQuery({
    queryKey: ['student-semester-results', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('semester_results')
        .select('*')
        .eq('student_id', user.id)
        .order('semester', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter marks by semester
  const filteredMarks = selectedSemester === 'all'
    ? finalMarks
    : finalMarks.filter((m: any) => m.subjects?.semester === parseInt(selectedSemester));

  // Calculate stats
  const overallAverage = filteredMarks.length > 0
    ? Math.round(filteredMarks.reduce((acc: number, m: any) => acc + (Number(m.percentage) || 0), 0) / filteredMarks.length)
    : 0;

  const passedSubjects = filteredMarks.filter((m: any) => (Number(m.percentage) || 0) >= 40).length;
  const latestResult = semesterResults[0];

  // Get unique semesters from marks
  const semesters = [...new Set(finalMarks.map((m: any) => m.subjects?.semester).filter(Boolean))].sort();

  return (
    <AuthenticatedLayout allowedRoles={['student']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Results</h2>
            <p className="text-muted-foreground">View your examination results and marks</p>
          </div>
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesters.map((sem) => (
                <SelectItem key={sem} value={String(sem)}>
                  Semester {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedSemester === 'all' ? 'Overall' : `Semester ${selectedSemester}`} Average
                  </p>
                  <p className="text-2xl font-bold">{overallAverage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CGPA</p>
                  <p className="text-2xl font-bold">{latestResult?.cgpa?.toFixed(2) || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subjects</p>
                  <p className="text-2xl font-bold">{passedSubjects} / {filteredMarks.length} Pass</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Result Cards */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Examination Results</h3>
          {marksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMarks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No results available yet. Check back after your exams are evaluated.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarks.map((mark: any) => (
                <StudentResultCard
                  key={mark.id}
                  subject={mark.subjects?.name || 'Subject'}
                  examType={`Semester ${mark.subjects?.semester || '—'}`}
                  totalMarks={Number(mark.total_marks) || 0}
                  maxMarks={100}
                  rank={0}
                  totalStudents={60}
                  classAverage={70}
                  coScores={[]}
                  grade={mark.grade}
                  gradePoint={mark.grade_point}
                  internal1={mark.internal_1}
                  internal2={mark.internal_2}
                  external={mark.external_marks}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
