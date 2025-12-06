import { StatsCard } from './StatsCard';
import { COAttainmentChart } from './COAttainmentChart';
import { BloomTaxonomyChart } from './BloomTaxonomyChart';
import { mockCOAttainment, bloomDistributionData, mockSubjects, mockStudentMarks } from '@/lib/mock-data';
import { Users, BookOpen, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function HODDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Department Dashboard</h2>
        <p className="text-muted-foreground">Computer Science Department Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Department Students"
          value="240"
          subtitle="Active enrollment"
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Faculty Members"
          value="18"
          subtitle="Teaching this semester"
          icon={Users}
        />
        <StatsCard
          title="Pass Rate"
          value="87%"
          subtitle="Current semester"
          icon={TrendingUp}
          trend={{ value: 3.2, isPositive: true }}
          variant="success"
        />
        <StatsCard
          title="At-Risk Students"
          value="18"
          subtitle="Need intervention"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <COAttainmentChart data={mockCOAttainment} />
        <BloomTaxonomyChart data={bloomDistributionData} />
      </div>

      {/* Subject Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Subject Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Pass Rate</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSubjects.slice(0, 5).map((subject, index) => {
                const passRate = 70 + Math.random() * 25;
                const avgScore = 55 + Math.random() * 25;
                return (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell className="font-mono text-sm">{subject.code}</TableCell>
                    <TableCell>Prof. {['Verma', 'Sharma', 'Patel', 'Kumar', 'Singh'][index]}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={passRate} className="w-16 h-2" />
                        <span className="text-sm">{passRate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{avgScore.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant={passRate >= 80 ? 'default' : passRate >= 70 ? 'secondary' : 'destructive'}>
                        {passRate >= 80 ? 'Excellent' : passRate >= 70 ? 'Good' : 'Review'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            At-Risk Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockStudentMarks.filter(s => s.totalMarks < 40).length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-green-500/5 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">No students at immediate risk based on current internal scores</span>
              </div>
            ) : null}
            {[
              { name: 'Vikash Kumar', roll: 'CS2021015', score: 32, subjects: ['Data Structures', 'DBMS'] },
              { name: 'Priya Yadav', roll: 'CS2021028', score: 35, subjects: ['Operating Systems'] },
              { name: 'Rahul Nair', roll: 'CS2021042', score: 38, subjects: ['Computer Networks', 'DBMS'] },
            ].map((student) => (
              <div key={student.roll} className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="font-medium text-sm">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.roll}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-destructive">{student.score}%</p>
                  <p className="text-xs text-muted-foreground">
                    Weak in: {student.subjects.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
