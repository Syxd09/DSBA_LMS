import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, TrendingUp, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, subjectsApi, examsApi } from '@/lib/api';
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function Analytics() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list(),
  });

  const { data: coAttainment, isLoading: loadingCO } = useQuery({
    queryKey: ['co-attainment', selectedSubject],
    queryFn: () => analyticsApi.getCOAttainment(selectedSubject),
    enabled: !!selectedSubject,
  });

  const { data: bloomDistribution, isLoading: loadingBloom } = useQuery({
    queryKey: ['bloom-distribution', selectedExam],
    queryFn: () => analyticsApi.getBloomDistribution(selectedExam),
    enabled: !!selectedExam,
  });

  const { data: departmentStats, isLoading: loadingDept } = useQuery({
    queryKey: ['department-stats'],
    queryFn: () => analyticsApi.getDepartmentStats(),
  });

  const coData = coAttainment?.outcomes || coAttainment || [];
  const deptData = departmentStats || [];

  // Transform bloom distribution for radar chart
  const radarData = useMemo(() => {
    if (bloomDistribution && bloomDistribution.length > 0) {
      return bloomDistribution.map((b: any) => ({
        subject: b.level,
        A: b.count || b.percentage || 0,
        fullMark: 100,
      }));
    }
    return [];
  }, [bloomDistribution]);

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
            <p className="text-muted-foreground">CO attainment and performance analytics</p>
          </div>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CO Attainment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Course Outcome Attainment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCO ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : selectedSubject ? (
              coData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="co_number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `CO${v}`} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Bar dataKey="attainment" fill="hsl(var(--primary))" name="Attainment %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No CO data available for this subject</p>
              )
            ) : (
              <p className="text-center py-8 text-muted-foreground">Select a subject to view CO attainment</p>
            )}
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bloom Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Bloom's Taxonomy Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select exam for Bloom analysis" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.subject?.code || 'Exam'} - {e.exam_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {loadingBloom ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : radarData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Radar name="Distribution" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Select an exam to view Bloom distribution</p>
              )}
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Department Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDept ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : deptData.length > 0 ? (
                <div className="space-y-4">
                  {deptData.map((dept: any) => (
                    <div key={dept.id || dept.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{dept.name}</span>
                        <span className="font-medium">{dept.students} students</span>
                      </div>
                      <Progress value={Math.min((dept.students / 100) * 100, 100)} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No department data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
