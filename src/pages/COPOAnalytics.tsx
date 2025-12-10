import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useCOAttainment, useBloomDistribution, useSubjectPerformance, useDepartmentStats } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Brain, BarChart3, Building2, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function COPOAnalytics() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*, program:programs(name)')
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  
  const { data: exams } = useQuery({
    queryKey: ['published-exams', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return [];
      const { data, error } = await supabase
        .from('exams')
        .select('id, exam_type')
        .eq('subject_id', selectedSubject)
        .eq('status', 'published');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSubject,
  });
  
  const { data: coAttainment, isLoading: coLoading } = useCOAttainment(selectedSubject || null);
  const { data: bloomData, isLoading: bloomLoading } = useBloomDistribution(exams?.[0]?.id || null);
  const { data: subjectPerformance, isLoading: perfLoading } = useSubjectPerformance(selectedCohort || null);
  const { data: deptStats, isLoading: deptLoading } = useDepartmentStats();
  
  const radarData = coAttainment?.map(co => ({
    subject: co.co,
    attainment: co.attainment,
    target: co.target
  })) || [];

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">CO-PO Analytics</h2>
          <p className="text-muted-foreground">Course Outcome and Program Outcome attainment analysis</p>
        </div>

        <Tabs defaultValue="co-attainment" className="space-y-6">
          <TabsList>
            <TabsTrigger value="co-attainment">
              <Target className="w-4 h-4 mr-2" />
              CO Attainment
            </TabsTrigger>
            <TabsTrigger value="bloom">
              <Brain className="w-4 h-4 mr-2" />
              Bloom's Taxonomy
            </TabsTrigger>
            <TabsTrigger value="performance">
              <BarChart3 className="w-4 h-4 mr-2" />
              Subject Performance
            </TabsTrigger>
            <TabsTrigger value="department">
              <Building2 className="w-4 h-4 mr-2" />
              Department Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="co-attainment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Select Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedSubject && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">CO Attainment Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {coLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={coAttainment}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="co" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="attainment" name="Attainment %" fill="hsl(var(--primary))" />
                            <Bar dataKey="target" name="Target %" fill="hsl(var(--muted))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">CO Radar View</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {coLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <Radar name="Attainment" dataKey="attainment" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                            <Radar name="Target" dataKey="target" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" fillOpacity={0.1} />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">CO Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {coAttainment?.map((co) => (
                      <div key={co.co} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={co.attainment >= co.target ? 'default' : 'destructive'}>
                              {co.co}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{co.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {co.attainment >= co.target ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            )}
                            <span className="font-medium">{co.attainment}%</span>
                            <span className="text-muted-foreground">/ {co.target}%</span>
                          </div>
                        </div>
                        <Progress value={co.attainment} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bloom" className="space-y-6">
            {selectedSubject && exams?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Bloom's Taxonomy Distribution</CardTitle>
                  <CardDescription>Question distribution across cognitive levels</CardDescription>
                </CardHeader>
                <CardContent>
                  {bloomLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={bloomData}
                              dataKey="count"
                              nameKey="level"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {bloomData?.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {bloomData?.map((item, index) => (
                          <div key={item.level} className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="flex-1">{item.level}</span>
                            <Badge variant="secondary">{item.count} questions</Badge>
                            <span className="text-muted-foreground">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a subject with published exams to view Bloom's taxonomy distribution
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Select Cohort</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts?.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.program?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedCohort && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Subject-wise Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {perfLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : !subjectPerformance?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No published exam data available for this cohort
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectPerformance}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="subject_code" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="average" name="Average" fill="hsl(var(--chart-2))" />
                          <Bar dataKey="highest" name="Highest" fill="hsl(var(--chart-3))" />
                          <Bar dataKey="pass_rate" name="Pass Rate %" fill="hsl(var(--chart-5))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="department" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptLoading ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                deptStats?.map((dept) => (
                  <Card key={dept.id}>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {dept.name}
                        <Badge variant="outline" className="ml-auto">{dept.code}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Students</span>
                        <span className="font-medium">{dept.students}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Teachers</span>
                        <span className="font-medium">{dept.teachers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Programs</span>
                        <span className="font-medium">{dept.programs}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
