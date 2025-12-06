import { StatsCard } from './StatsCard';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { StudentResultCard } from '@/components/student/StudentResultCard';
import { mockBloomPerformance, bloomDistributionData } from '@/lib/mock-data';
import { Award, TrendingUp, BookOpen, Target, Brain, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const radarData = [
  { subject: 'Remember', A: 85, fullMark: 100 },
  { subject: 'Understand', A: 78, fullMark: 100 },
  { subject: 'Apply', A: 72, fullMark: 100 },
  { subject: 'Analyze', A: 65, fullMark: 100 },
  { subject: 'Evaluate', A: 58, fullMark: 100 },
  { subject: 'Create', A: 52, fullMark: 100 },
];

export function StudentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Performance</h2>
        <p className="text-muted-foreground">Rahul Mehta • CS2021001 • BCA Semester 3</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Overall Average"
          value="72%"
          subtitle="Current semester"
          icon={Award}
          trend={{ value: 8, isPositive: true }}
          variant="primary"
        />
        <StatsCard
          title="Class Rank"
          value="12"
          subtitle="of 60 students"
          icon={TrendingUp}
        />
        <StatsCard
          title="Subjects Enrolled"
          value="5"
          subtitle="This semester"
          icon={BookOpen}
        />
        <StatsCard
          title="CO Attainment"
          value="76%"
          subtitle="Average across COs"
          icon={Target}
          variant="success"
        />
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StudentResultCard
          subject="Data Structures"
          examType="Internal 1"
          totalMarks={45}
          maxMarks={60}
          rank={8}
          totalStudents={60}
          classAverage={42.5}
          coScores={[
            { co: 'CO1', score: 9, max: 12 },
            { co: 'CO2', score: 10, max: 12 },
            { co: 'CO3', score: 8, max: 12 },
            { co: 'CO4', score: 10, max: 12 },
            { co: 'CO5', score: 8, max: 12 },
          ]}
        />
        <StudentResultCard
          subject="Database Management"
          examType="Internal 1"
          totalMarks={38}
          maxMarks={60}
          rank={15}
          totalStudents={60}
          classAverage={40.2}
          coScores={[
            { co: 'CO1', score: 8, max: 12 },
            { co: 'CO2', score: 7, max: 12 },
            { co: 'CO3', score: 8, max: 12 },
            { co: 'CO4', score: 8, max: 12 },
            { co: 'CO5', score: 7, max: 12 },
          ]}
        />
        <StudentResultCard
          subject="Operating Systems"
          examType="Internal 1"
          totalMarks={52}
          maxMarks={60}
          rank={3}
          totalStudents={60}
          classAverage={44.8}
          coScores={[
            { co: 'CO1', score: 11, max: 12 },
            { co: 'CO2', score: 10, max: 12 },
            { co: 'CO3', score: 11, max: 12 },
            { co: 'CO4', score: 10, max: 12 },
            { co: 'CO5', score: 10, max: 12 },
          ]}
        />
      </div>

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
  );
}
