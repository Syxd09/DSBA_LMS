import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { BloomTaxonomyChart } from '@/components/dashboard/BloomTaxonomyChart';
import { mockBloomPerformance, bloomDistributionData } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, Lightbulb, TrendingUp } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const radarData = [
  { subject: 'Remember', A: 85, fullMark: 100 },
  { subject: 'Understand', A: 78, fullMark: 100 },
  { subject: 'Apply', A: 72, fullMark: 100 },
  { subject: 'Analyze', A: 65, fullMark: 100 },
  { subject: 'Evaluate', A: 58, fullMark: 100 },
  { subject: 'Create', A: 52, fullMark: 100 },
];

const progressData = [
  { exam: 'Int 1 - Sem 1', score: 62 },
  { exam: 'Int 2 - Sem 1', score: 68 },
  { exam: 'Int 1 - Sem 2', score: 71 },
  { exam: 'Int 2 - Sem 2', score: 74 },
  { exam: 'Int 1 - Sem 3', score: 72 },
];

export default function Performance() {
  return (
    <AuthenticatedLayout allowedRoles={['student']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Performance</h2>
          <p className="text-muted-foreground">Detailed analysis of your academic performance</p>
        </div>

        {/* Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="exam" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[50, 100]} />
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

        {/* CO Attainment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Course Outcome Attainment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { co: 'CO1', attainment: 78, desc: 'Apply fundamentals' },
                { co: 'CO2', attainment: 65, desc: 'Analyze problems' },
                { co: 'CO3', attainment: 72, desc: 'Design solutions' },
                { co: 'CO4', attainment: 81, desc: 'Implement algorithms' },
                { co: 'CO5', attainment: 68, desc: 'Evaluate performance' },
              ].map((item) => (
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
              <div className="p-4 bg-secondary/30 border border-border">
                <p className="font-medium text-sm mb-1">Focus on Higher-Order Thinking</p>
                <p className="text-sm text-muted-foreground">
                  Your performance in "Evaluate" and "Create" levels is below average. Practice more case-study based problems in Data Structures.
                </p>
              </div>
              <div className="p-4 bg-secondary/30 border border-border">
                <p className="font-medium text-sm mb-1">Strengthen CO2 in DBMS</p>
                <p className="text-sm text-muted-foreground">
                  CO2 (Query Optimization) needs attention. Review normalization concepts and practice complex SQL queries.
                </p>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/20">
                <p className="font-medium text-sm mb-1 text-green-700">Keep up with Operating Systems!</p>
                <p className="text-sm text-muted-foreground">
                  Excellent performance in OS. Your understanding of process management and memory concepts is strong.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
