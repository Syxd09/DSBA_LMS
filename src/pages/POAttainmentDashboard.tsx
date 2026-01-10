import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target, TrendingUp, CheckCircle2, AlertTriangle, Loader2,
  BarChart3, LineChart, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart as RechartsLineChart, Line, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import api from '@/lib/api';
import { useActiveSemesters } from '@/hooks/use-active-semesters';

interface POAttainment {
  id: string;
  programId: string;
  cohortId: string;
  poId: string;
  semester: number;
  academicYear: string;
  achievedPercent: number;
  weightedSum: number;
  totalWeight: number;
  coCount: number;
  targetPercent: number;
  status: string;
  po: {
    poNumber: number;
    description: string;
    targetPercent: number;
  };
  program: {
    name: string;
    code: string;
  };
  cohort: {
    name: string;
    year: number;
  };
}

const getAttainmentColor = (achieved: number, target: number) => {
  const diff = achieved - target;
  if (diff >= 10) return 'bg-green-500';
  if (diff >= 0) return 'bg-blue-500';
  if (diff >= -10) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    CALCULATED: 'bg-blue-500',
    APPROVED: 'bg-green-500',
    LOCKED: 'bg-gray-500',
    UNDER_REVIEW: 'bg-yellow-500'
  };
  return variants[status] || 'bg-gray-500';
};

export default function POAttainmentDashboard() {
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data } = await api.get('/programs');
      return data || [];
    },
  });

  // Fetch cohorts
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      return data || [];
    },
  });

  // Fetch active semesters - routes confirmed mounted
  const { data: activeSemestersData } = useActiveSemesters(selectedCohort);
  const activeSemesters = activeSemestersData?.semesters || [];

  // Fetch PO Attainment data
  const { data: poData, isLoading, error } = useQuery<{ success: boolean; data: POAttainment[] }>({
    queryKey: ['po-attainment', selectedProgram, selectedCohort, selectedSemester, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('programId', selectedProgram);
      if (selectedCohort) params.append('cohortId', selectedCohort);
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedYear) params.append('academicYear', selectedYear);

      const { data } = await api.get(`/po-attainment?${params.toString()}`);
      return data;
    },
    enabled: !!selectedProgram,
  });

  // Fetch PO trends
  const { data: trendsData } = useQuery({
    queryKey: ['po-trends', selectedProgram],
    queryFn: async () => {
      if (!selectedProgram) return null;
      const { data } = await api.get(`/po-attainment/trends/${selectedProgram}`);
      return data?.data || [];
    },
    enabled: !!selectedProgram,
  });

  const poAttainments = poData?.data || [];

  // Calculate summary statistics
  const totalPOs = poAttainments.length;
  const attainedPOs = poAttainments.filter(po => po.achievedPercent >= po.targetPercent).length;
  const averageAttainment = totalPOs > 0
    ? poAttainments.reduce((sum, po) => sum + po.achievedPercent, 0) / totalPOs
    : 0;

  // Prepare data for charts
  const barChartData = poAttainments.map(po => ({
    po: `PO${po.po.poNumber}`,
    achieved: po.achievedPercent,
    target: po.targetPercent,
    coCount: po.coCount
  }));

  const radarData = poAttainments.map(po => ({
    po: `PO${po.po.poNumber}`,
    value: po.achievedPercent
  }));

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Program Outcome Attainment</h2>
          <p className="text-muted-foreground">Comprehensive PO analysis and tracking</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Select Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map((program: any) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name} ({program.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cohort (Optional)</label>
                <Select value={selectedCohort || undefined} onValueChange={setSelectedCohort}>
                  <SelectTrigger>
                    <SelectValue placeholder="All cohorts" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts?.map((cohort: any) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Semester (Smart Filter)</label>
                <Select value={selectedSemester || undefined} onValueChange={setSelectedSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCohort ? "Select semester" : "All semesters"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedCohort && activeSemesters.length > 0 
                      ? activeSemesters 
                      : [1, 2, 3, 4, 5, 6, 7, 8]
                    ).map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCohort && activeSemesters.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No students enrolled yet</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Academic Year (Optional)</label>
                <Select value={selectedYear || undefined} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load PO attainment data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {selectedProgram && !isLoading && !error && (
          <>
            {poAttainments.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No PO attainment data found for the selected criteria. Please calculate PO attainment first.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total POs</p>
                          <p className="text-2xl font-bold">{totalPOs}</p>
                        </div>
                        <Target className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Attained POs</p>
                          <p className="text-2xl font-bold">{attainedPOs}</p>
                          <p className="text-sm text-muted-foreground">
                            {totalPOs > 0 ? ((attainedPOs / totalPOs) * 100).toFixed(1) : 0}% success rate
                          </p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Average Attainment</p>
                          <p className="text-2xl font-bold">{averageAttainment.toFixed(1)}%</p>
                        </div>
                       <Award className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for different views */}
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Detailed List</TabsTrigger>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base font-semibold">PO Attainment Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="po" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                  }}
                                />
                                <Legend />
                                <Bar dataKey="achieved" name="Achieved %" fill="hsl(var(--primary))" />
                                <Bar dataKey="target" name="Target %" fill="hsl(var(--muted))" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base font-semibold">PO Radar View</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={radarData}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis
                                  dataKey="po"
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                />
                                <PolarRadiusAxis
                                  angle={30}
                                  domain={[0, 100]}
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                />
                                <Radar
                                  name="Attainment %"
                                  dataKey="value"
                                  stroke="hsl(var(--primary))"
                                  fill="hsl(var(--primary))"
                                  fillOpacity={0.3}
                                />
                                <Legend />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">PO Attainment Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {poAttainments.map((po) => (
                          <div key={po.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">PO{po.po.poNumber}</Badge>
                                <span className="text-sm">{po.po.description}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusBadge(po.status)}>
                                  {po.status}
                                </Badge>
                                <span className="font-semibold">{po.achievedPercent.toFixed(1)}%</span>
                                {po.achievedPercent >= po.targetPercent ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={po.achievedPercent}
                                className={`h-2 ${getAttainmentColor(po.achievedPercent, po.targetPercent)}`}
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Target: {po.targetPercent}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Calculated from {po.coCount} Course Outcome(s)
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="trends" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Historical Trends</CardTitle>
                        <CardDescription>PO attainment progression over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {trendsData && trendsData.length > 0 ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsLineChart data={trendsData[0]?.data || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                  dataKey="academicYear"
                                  stroke="hsl(var(--muted-foreground))"
                                  fontSize={12}
                                />
                                <YAxis
                                  stroke="hsl(var(--muted-foreground))"
                                  fontSize={12}
                                  domain={[0, 100]}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                  }}
                                />
                                <Legend />
                                <Line
                                  type="monotone"
                                  dataKey="achievedPercent"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth={2}
                                  name="Attainment %"
                                />
                              </RechartsLineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No historical trend data available
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}

        {!selectedProgram && !isLoading && (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              Please select a program to view PO attainment data
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
