import { StatsCard } from './StatsCard';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { StudentResultCard } from '@/components/student/StudentResultCard';
import { mockBloomPerformance, bloomDistributionData } from '@/lib/mock-data';
import { Award, TrendingUp, BookOpen, Target, Brain, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const radarData = [
  { subject: 'Remember', A: 85, fullMark: 100 },
  { subject: 'Understand', A: 78, fullMark: 100 },
  { subject: 'Apply', A: 72, fullMark: 100 },
  { subject: 'Analyze', A: 65, fullMark: 100 },
  { subject: 'Evaluate', A: 58, fullMark: 100 },
  { subject: 'Create', A: 52, fullMark: 100 },
];

export function StudentDashboard() {
  const { user, profile } = useAuth();

  const { data: enrollment } = useQuery({
    queryKey: ['student-enrollment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('student_enrollments').select(`
        *,
        cohorts(name, current_semester, programs(name, code))
      `).eq('student_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: finalMarks = [] } = useQuery({
    queryKey: ['student-final-marks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('final_marks').select(`
        *,
        subjects(name, code)
      `).eq('student_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: semesterResults = [] } = useQuery({
    queryKey: ['student-semester-results', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('semester_results').select('*').eq('student_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const overallAverage = finalMarks.length > 0 
    ? Math.round(finalMarks.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0) / finalMarks.length)
    : 0;

  const latestSemResult = semesterResults.sort((a, b) => b.semester - a.semester)[0];
  const sgpa = latestSemResult?.sgpa || 0;
  const cgpa = latestSemResult?.cgpa || 0;

  const cohortName = enrollment?.cohorts?.name || '';
  const programName = (enrollment?.cohorts as any)?.programs?.name || '';
  const semester = enrollment?.cohorts?.current_semester || 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Performance</h2>
        <p className="text-muted-foreground">
          {profile?.full_name || 'Student'} • {enrollment?.roll_number || 'N/A'} • {programName} Semester {semester}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Overall Average"
          value={`${overallAverage}%`}
          subtitle="Current semester"
          icon={Award}
          trend={{ value: 8, isPositive: true }}
          variant="primary"
        />
        <StatsCard
          title="SGPA"
          value={sgpa.toFixed(2)}
          subtitle="This semester"
          icon={TrendingUp}
        />
        <StatsCard
          title="CGPA"
          value={cgpa.toFixed(2)}
          subtitle="Cumulative"
          icon={Award}
        />
        <StatsCard
          title="Subjects Enrolled"
          value={finalMarks.length.toString()}
          subtitle="This semester"
          icon={BookOpen}
        />
      </div>

      {/* Result Cards */}
      {finalMarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {finalMarks.slice(0, 6).map((mark: any) => (
            <StudentResultCard
              key={mark.id}
              subject={mark.subjects?.name || 'Subject'}
              examType={mark.exam_id ? 'Internal' : 'Overall'}
              totalMarks={Number(mark.total_marks) || 0}
              maxMarks={100}
              rank={0}
              totalStudents={60}
              classAverage={70}
              coScores={[]}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No results available yet. Check back after your exams are evaluated.
          </CardContent>
        </Card>
      )}

      {/* Bloom Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Bloom's Taxonomy Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Radar name="Performance" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Cognitive Level Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockBloomPerformance.map((bloom) => (
              <div key={bloom.level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{bloom.level}</span>
                  <span className="font-medium">{bloom.percentage}%</span>
                </div>
                <Progress value={bloom.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {bloom.questionsAttempted} of {bloom.totalQuestions} questions
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Personalized Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-secondary/30 border border-border">
              <p className="font-medium text-sm mb-1">Focus on Higher-Order Thinking</p>
              <p className="text-sm text-muted-foreground">
                Practice more case-study based problems to improve your analytical skills.
              </p>
            </div>
            <div className="p-4 bg-secondary/30 border border-border">
              <p className="font-medium text-sm mb-1">Review Course Outcomes</p>
              <p className="text-sm text-muted-foreground">
                Check your CO attainment in each subject to identify areas for improvement.
              </p>
            </div>
            {overallAverage >= 70 && (
              <div className="p-4 bg-green-500/10 border border-green-500/20">
                <p className="font-medium text-sm mb-1 text-green-700">Great Progress!</p>
                <p className="text-sm text-muted-foreground">
                  You're performing well. Keep up the consistent effort!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
