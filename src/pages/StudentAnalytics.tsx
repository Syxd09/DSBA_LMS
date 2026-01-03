import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Target, Brain, BarChart3, Award, Loader2 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import api from '@/lib/api';

interface StudentAnalytics {
  studentId: string;
  studentName: string;
  rollNumber: string;
  cohortName: string;
  overallPerformance: {
    totalExams: number;
    averagePercentage: number;
    passRate: number;
    grade: string;
  };
  subjectPerformance: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    averageMarks: number;
    maxMarks: number;
    percentage: number;
    status: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'At Risk';
    examsCompleted: number;
  }>;
  coPerformance: Array<{
    coId: string;
    coNumber: number;
    description: string;
    achievedPercent: number;
    status: 'Strong' | 'Moderate' | 'Weak';
  }>;
  bloomPerformance: Array<{
    level: string;
    percentage: number;
    strength: 'Strong' | 'Moderate' | 'Weak';
  }>;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendations: string[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Excellent': return 'bg-green-500';
    case 'Good': return 'bg-blue-500';
    case 'Average': return 'bg-yellow-500';
    case 'Poor': return 'bg-orange-500';
    case 'At Risk': return 'bg-red-500';
    case 'Strong': return 'bg-green-500';
    case 'Moderate': return 'bg-yellow-500';
    case 'Weak': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getRiskBadgeVariant = (risk: string) => {
  switch (risk) {
    case 'none': return 'default';
    case 'low': return 'secondary';
    case 'medium': return 'outline';
    case 'high': return 'destructive';
    case 'critical': return 'destructive';
    default: return 'secondary';
  }
};

export default function StudentAnalytics() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Fetch students for selection
  const { data: students } = useQuery({
    queryKey: ['students-list'],
    queryFn: async () => {
      const { data } = await api.get('/users?role=STUDENT');
      return data || [];
    },
  });

  // Fetch student analytics
  const { data: analytics, isLoading, error } = useQuery<{ success: boolean; data: StudentAnalytics }>({
    queryKey: ['student-analytics', selectedStudentId],
    queryFn: async () => {
      const { data } = await api.get(`/attainment/students/${selectedStudentId}/analytics`);
      return data;
    },
    enabled: !!selectedStudentId,
  });

  const studentData = analytics?.data;

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher', 'student']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Performance Analytics</h2>
          <p className="text-muted-foreground">Comprehensive student performance tracking and analysis</p>
        </div>

        {/* Student Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Select Student</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full max-w-md px-3 py-2 border rounded-md"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">-- Select a student --</option>
              {students?.map((student: any) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} ({student.email})
                </option>
              ))}
            </select>
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
              Failed to load student analytics. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Analytics Content */}
        {studentData && !isLoading && (
          <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Student</p>
                      <p className="text-2xl font-bold">{studentData.studentName}</p>
                      <p className="text-sm text-muted-foreground">{studentData.rollNumber}</p>
                    </div>
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overall Grade</p>
                      <p className="text-2xl font-bold">{studentData.overallPerformance.grade}</p>
                      <p className="text-sm text-muted-foreground">
                        {studentData.overallPerformance.averagePercentage.toFixed(1)}%
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Exams Completed</p>
                      <p className="text-2xl font-bold">{studentData.overallPerformance.totalExams}</p>
                      <p className="text-sm text-muted-foreground">
                        {studentData.overallPerformance.passRate.toFixed(1)}% pass rate
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                      <Badge variant={getRiskBadgeVariant(studentData.riskLevel)} className="text-sm">
                        {studentData.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    {studentData.riskLevel === 'none' ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Factors & Recommendations */}
            {studentData.riskFactors.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {studentData.riskFactors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span className="text-sm">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {studentData.recommendations.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {studentData.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Detailed Analytics Tabs */}
            <Tabs defaultValue="subjects" className="space-y-4">
              <TabsList>
                <TabsTrigger value="subjects">Subject Performance</TabsTrigger>
                <TabsTrigger value="cos">Course Outcomes</TabsTrigger>
                <TabsTrigger value="bloom">Bloom's Taxonomy</TabsTrigger>
              </TabsList>

              <TabsContent value="subjects" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Subject-wise Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {studentData.subjectPerformance.map((subject) => (
                      <div key={subject.subjectId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{subject.subjectCode}</Badge>
                            <span className="font-medium">{subject.subjectName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {subject.averageMarks}/{subject.maxMarks}
                            </span>
                            <Badge className={getStatusColor(subject.status)}>
                              {subject.status}
                            </Badge>
                            <span className="font-semibold">{subject.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <Progress value={subject.percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {subject.examsCompleted} exam(s) completed
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cos" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">CO Performance Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={studentData.coPerformance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="coId" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="achievedPercent" name="Achievement %" fill="hsl(var(--primary))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">CO Radar View</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={studentData.coPerformance}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="coId" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <Radar name="Achievement" dataKey="achievedPercent" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Course Outcome Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {studentData.coPerformance.map((co) => (
                      <div key={co.coId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{co.coId}</Badge>
                            <span className="text-sm">{co.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(co.status)}>
                              {co.status}
                            </Badge>
                            <span className="font-medium">{co.achievedPercent.toFixed(1)}%</span>
                          </div>
                        </div>
                        <Progress value={co.achievedPercent} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bloom" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Bloom's Taxonomy Performance</CardTitle>
                    <CardDescription>Performance across cognitive levels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {studentData.bloomPerformance.map((bloom) => (
                      <div key={bloom.level} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{bloom.level}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(bloom.strength)}>
                              {bloom.strength}
                            </Badge>
                            <span className="font-semibold">{bloom.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <Progress value={bloom.percentage} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
