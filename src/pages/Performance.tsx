import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export default function Performance() {
  const { user } = useAuth();

  const { data, isLoading: marksLoading } = useQuery({
    queryKey: ['student-results', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/results');
      return data;
    },
    enabled: !!user?.id,
  });

  const finalMarks = data?.finalMarks || [];
  const semesterResults = data?.semesterResults || [];

  // Calculate Bloom's performance (mock based on marks for now)
  const bloomPerformance = [
    { level: 'Remember', percentage: 85, questionsAttempted: 15, totalQuestions: 18 },
    { level: 'Understand', percentage: 78, questionsAttempted: 12, totalQuestions: 15 },
    { level: 'Apply', percentage: 72, questionsAttempted: 10, totalQuestions: 14 },
    { level: 'Analyze', percentage: 65, questionsAttempted: 8, totalQuestions: 12 },
    { level: 'Evaluate', percentage: 58, questionsAttempted: 6, totalQuestions: 10 },
    { level: 'Create', percentage: 52, questionsAttempted: 4, totalQuestions: 8 },
  ];

  const radarData = bloomPerformance.map(b => ({
    subject: b.level,
    A: b.percentage,
    fullMark: 100,
  }));

  // Calculate progress data from semester results or final marks
  const progressData = semesterResults.length > 0
    ? semesterResults.map((r: any) => ({
        exam: `Sem ${r.semester}`,
        score: Number(r.sgpa) * 10 || 0,
      }))
    : finalMarks.slice(0, 5).map((m: any, idx: number) => ({
        exam: m.subject?.code || `Exam ${idx + 1}`,
        score: Number(m.percentage) || 0,
      }));

  // Calculate CO attainment from final marks coAttainment field
  const coAttainment = finalMarks
    .filter((m: any) => m.coAttainment && Object.keys(m.coAttainment).length > 0)
    .slice(0, 1)
    .flatMap((m: any) => {
      const att = m.coAttainment as Record<string, number>;
      return Object.entries(att).slice(0, 5).map(([co, value]) => ({
        co,
        attainment: value,
        desc: `Course Outcome ${co.replace('CO', '')}`,
      }));
    });

  // Default CO data if none available
  const displayCoAttainment = coAttainment.length > 0 ? coAttainment : [
    { co: 'CO1', attainment: 78, desc: 'Apply fundamentals' },
    { co: 'CO2', attainment: 65, desc: 'Analyze problems' },
    { co: 'CO3', attainment: 72, desc: 'Design solutions' },
    { co: 'CO4', attainment: 81, desc: 'Implement algorithms' },
    { co: 'CO5', attainment: 68, desc: 'Evaluate performance' },
  ];

  // Calculate weak areas
  const weakAreas = bloomPerformance.filter(b => b.percentage < 65);
  const strongAreas = bloomPerformance.filter(b => b.percentage >= 75);

  return (
    <AuthenticatedLayout allowedRoles={['student']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Performance</h2>
          <p className="text-muted-foreground">Detailed analysis of your academic performance</p>
        </div>

        {marksLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progressData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="exam" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available yet. Complete some exams to see your trend.
                  </div>
                )}
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
                  {bloomPerformance.map((bloom) => (
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

            {/* CO Attainment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Course Outcome Attainment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {displayCoAttainment.map((item) => (
                    <div key={item.co} className="p-4 border border-border text-center">
                      <p className="text-2xl font-bold text-foreground">{item.attainment}%</p>
                      <p className="font-medium text-primary">{item.co}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                      <Progress value={item.attainment} className="h-1 mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                  {weakAreas.length > 0 && (
                    <div className="p-4 bg-secondary/30 border border-border">
                      <p className="font-medium text-sm mb-1">Focus on Higher-Order Thinking</p>
                      <p className="text-sm text-muted-foreground">
                        Your performance in {weakAreas.map(w => `"${w.level}"`).join(' and ')} levels is below average. Practice more case-study based problems.
                      </p>
                    </div>
                  )}
                  {finalMarks.length > 0 && (
                    <div className="p-4 bg-secondary/30 border border-border">
                      <p className="font-medium text-sm mb-1">Review Your Results</p>
                      <p className="text-sm text-muted-foreground">
                        You have results in {finalMarks.length} subject(s). Review weak areas in each subject to improve overall performance.
                      </p>
                    </div>
                  )}
                  {strongAreas.length > 0 && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20">
                      <p className="font-medium text-sm mb-1 text-green-700">Strong Areas!</p>
                      <p className="text-sm text-muted-foreground">
                        Excellent performance in {strongAreas.map(s => `"${s.level}"`).join(' and ')} levels. Keep up the good work!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
