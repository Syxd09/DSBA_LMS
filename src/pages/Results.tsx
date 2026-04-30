import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { StudentResultCard } from '@/components/student/StudentResultCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function Results() {
  const { user } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  const { data, isLoading: marksLoading } = useQuery({
    queryKey: ['student-results', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/results');
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: gradingRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['grading-rules'],
    queryFn: async () => {
      const { data } = await api.get('/grading/rules');
      return data;
    }
  });

  const finalMarks = data?.finalMarks || [];
  const semesterResults = data?.semesterResults || [];

  // Filter marks by semester
  const filteredMarks = selectedSemester === 'all'
    ? finalMarks
    : finalMarks.filter((m: any) => m.subject?.semester === parseInt(selectedSemester));

  // Calculate stats
  const overallAverage = filteredMarks.length > 0
    ? Math.round(filteredMarks.reduce((acc: number, m: any) => acc + (Number(m.percentage) || 0), 0) / filteredMarks.length)
    : 0;

  const passedSubjects = filteredMarks.filter((m: any) => (Number(m.percentage) || 0) >= 40).length;
  const latestResult = semesterResults[0];

  // Get unique semesters from marks
  const semesters = [...new Set(finalMarks.map((m: any) => m.subject?.semester).filter(Boolean))].sort();

  // Prepare trend data for chart
  const trendData = semesterResults
    .map((r: any) => ({
      semester: `Sem ${r.semester}`,
      sgpa: r.sgpa,
    }))
    .sort((a: any, b: any) => a.semester.localeCompare(b.semester));

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
                <SelectItem key={String(sem)} value={String(sem)}>
                  Semester {sem as number}
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
                  <p className="text-sm text-muted-foreground">
                    {selectedSemester === 'all' ? 'Current CGPA' : `Semester ${selectedSemester} SGPA`}
                  </p>
                  <p className="text-2xl font-bold">
                    {selectedSemester === 'all' 
                      ? (latestResult?.cgpa?.toFixed(2) || '—')
                      : (semesterResults.find((r: any) => r.semester === parseInt(selectedSemester))?.sgpa?.toFixed(2) || '—')
                    }
                  </p>
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

        {/* Trend Analysis */}
        {trendData.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Performance Trend (SGPA)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sgpa" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Result Cards and Grading Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-lg font-semibold">Examination Results</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMarks.map((mark: any) => (
                  <StudentResultCard
                    key={mark.id}
                    subject={mark.subject?.name || 'Subject'}
                    examType={`Semester ${mark.subject?.semester || '—'}`}
                    totalMarks={Number(mark.totalMarks) || 0}
                    maxMarks={100}
                    rank={0}
                    totalStudents={60}
                    classAverage={70}
                    coScores={[]}
                    grade={mark.grade}
                    gradePoint={mark.gradePoint}
                    internal1={mark.internal1}
                    internal2={mark.internal2}
                    external={mark.externalMarks}
                    feedback={mark.feedback}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Award className="w-4 h-4" /> Grading Scale
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y text-sm">
                  {gradingRules?.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border ${
                          rule.grade === 'F' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                          ['O', 'S', 'A+'].includes(rule.grade) ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {rule.grade}
                        </div>
                        <div>
                          <p className="font-semibold">{rule.gradePoint.toFixed(1)} GP</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Range</p>
                        <p className="font-medium text-xs">{rule.minPercentage}% - {rule.maxPercentage}%</p>
                      </div>
                    </div>
                  ))}
                  {rulesLoading && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading scale...
                    </div>
                  )}
                  {!rulesLoading && (!gradingRules || gradingRules.length === 0) && (
                    <div className="p-8 text-center text-xs text-muted-foreground italic">
                      Institutional grading rules not configured.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
