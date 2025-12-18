import { StatsCard } from './StatsCard';
// import { mockBloomPerformance } from '@/lib/mock-data'; // REMOVED MOCK
import { Award, TrendingUp, BookOpen, Target, Brain, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const radarData: any[] = []; // No mock data

export function StudentDashboard() {
  const { user, profile } = useAuth();

  const { data: enrollment } = useQuery({
    queryKey: ['student-enrollment', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await api.get('/enrollments');
      const myEnrollment = data.find((e: any) => e.studentId === user.id);
      return myEnrollment || null;
    },
    enabled: !!user?.id
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['student-subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data;
    }
  });

  const overallAverage = 0;
  const sgpa = 0;
  const cgpa = 0;

  const cohortName = enrollment?.cohort?.name || '';
  const programName = enrollment?.cohort?.program?.name || '';
  const semester = enrollment?.cohort?.currentSemester || 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Performance</h2>
        <p className="text-muted-foreground">
          {profile?.full_name || 'Student'} • {enrollment?.rollNumber || 'N/A'} • {programName} Semester {semester}
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
          value={subjects.length.toString()}
          subtitle="This semester"
          icon={BookOpen}
        />
      </div>

      {/* Result Cards */}
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Results will appear here once exams are evaluated.
        </CardContent>
      </Card>

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
            {/* Empty State for now */}
            <div className="text-center text-sm text-muted-foreground py-4">
              No cognitive tracking data available yet.
            </div>
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
