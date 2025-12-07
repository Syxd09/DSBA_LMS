import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { StudentResultCard } from '@/components/student/StudentResultCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, TrendingUp, FileText } from 'lucide-react';
import { useState } from 'react';

export default function Results() {
  const [selectedSemester, setSelectedSemester] = useState('3');

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
              <SelectItem value="1">Semester 1</SelectItem>
              <SelectItem value="2">Semester 2</SelectItem>
              <SelectItem value="3">Semester 3</SelectItem>
              <SelectItem value="4">Semester 4</SelectItem>
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
                  <p className="text-sm text-muted-foreground">Semester Average</p>
                  <p className="text-2xl font-bold">72.5%</p>
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
                  <p className="text-sm text-muted-foreground">Class Rank</p>
                  <p className="text-2xl font-bold">12 / 60</p>
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
                  <p className="text-2xl font-bold">5 / 5 Pass</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Result Cards */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Internal Examination Results</h3>
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
            <StudentResultCard
              subject="Computer Networks"
              examType="Internal 1"
              totalMarks={41}
              maxMarks={60}
              rank={12}
              totalStudents={60}
              classAverage={39.5}
              coScores={[
                { co: 'CO1', score: 9, max: 12 },
                { co: 'CO2', score: 8, max: 12 },
                { co: 'CO3', score: 8, max: 12 },
                { co: 'CO4', score: 8, max: 12 },
                { co: 'CO5', score: 8, max: 12 },
              ]}
            />
            <StudentResultCard
              subject="Software Engineering"
              examType="Internal 1"
              totalMarks={48}
              maxMarks={60}
              rank={6}
              totalStudents={60}
              classAverage={43.2}
              coScores={[
                { co: 'CO1', score: 10, max: 12 },
                { co: 'CO2', score: 9, max: 12 },
                { co: 'CO3', score: 10, max: 12 },
                { co: 'CO4', score: 10, max: 12 },
                { co: 'CO5', score: 9, max: 12 },
              ]}
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
