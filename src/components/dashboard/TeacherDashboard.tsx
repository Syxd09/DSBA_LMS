import { StatsCard } from './StatsCard';
import { mockSubjects, examPerformanceData } from '@/lib/mock-data';
import { Users, BookOpen, ClipboardList, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

export function TeacherDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Teacher Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, Prof. Amit Verma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Assigned Subjects"
          value="3"
          subtitle="This semester"
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Total Students"
          value="180"
          subtitle="Across all subjects"
          icon={Users}
        />
        <StatsCard
          title="Pending Evaluations"
          value="45"
          subtitle="Internal 2 pending"
          icon={ClipboardList}
          variant="warning"
        />
        <StatsCard
          title="Class Average"
          value="71%"
          subtitle="All subjects"
          icon={TrendingUp}
          trend={{ value: 6, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/marks-entry')}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Enter Marks
            </Button>
            <Button variant="outline">
              <BookOpen className="w-4 h-4 mr-2" />
              Create Exam Structure
            </Button>
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              View Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">My Subjects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockSubjects.slice(0, 3).map((subject) => {
            const int1Done = Math.random() > 0.3;
            const int2Done = Math.random() > 0.6;
            return (
              <div key={subject.id} className="p-4 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-foreground">{subject.name}</h4>
                    <p className="text-sm text-muted-foreground">{subject.code} • Semester {subject.semester}</p>
                  </div>
                  <Badge variant="outline">{subject.credits} Credits</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Internal 1</span>
                    <div className="flex items-center gap-2">
                      {int1Done ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-500">Published</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-yellow-500">Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Internal 2</span>
                    <div className="flex items-center gap-2">
                      {int2Done ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-500">Published</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-yellow-500">Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Internal 1 vs Internal 2 Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0',
                  }}
                />
                <Legend />
                <Bar dataKey="average" name="Class Average" fill="hsl(var(--chart-2))" />
                <Bar dataKey="highest" name="Highest" fill="hsl(var(--chart-3))" />
                <Bar dataKey="lowest" name="Lowest" fill="hsl(var(--chart-5))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
