import { StatsCard } from './StatsCard';
import { AtRiskStudentsList } from './AtRiskStudentsList';
import { QuestionDifficultyChart } from './QuestionDifficultyChart';
import { SubjectHealthCard } from './SubjectHealthCard';
import { QPQICard } from './QPQICard';
import { BookOpen, Users, Clock, TrendingUp, Plus, FileText, Activity, Download, Upload, BarChart2, Settings, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, roleAnalyticsApi, templatesApi } from '@/lib/api';
import { AcademicConfig } from '@/config/academicConfig';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TeacherDashboard() {
  const navigate = useNavigate();
  const [detailedSubjectId, setDetailedSubjectId] = useState<string>('');
  
  // Primary dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => dashboardApi.getTeacherDashboard(),
  });

  const subjects = dashboardData?.subjects || [];

  // Update selected subject when data loads
  useEffect(() => {
    if (subjects.length > 0 && !detailedSubjectId) {
      setDetailedSubjectId(subjects[0].offering_id || '');
    }
  }, [subjects, detailedSubjectId]);

  const handleDownloadReport = async (offeringId: string, subjectName: string) => {
    if (!offeringId) return;
    try {
      // For pilot verification, we might want JSON first if PDF fails, but PDF is preferred
      const blob = await templatesApi.getCOAttainmentReport(offeringId, 'pdf');
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CO_Attainment_${subjectName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download report:", error);
      alert("Failed to generate report. Please try again.");
    }
  };

  const assignedSubjects = dashboardData?.assigned_subjects || 0;
  const totalStudents = dashboardData?.total_students || 0;
  const pendingEvaluations = dashboardData?.pending_evaluations || 0;
  const classAverage = dashboardData?.class_average || 0;

  // Performance comparison data from real subject data
  const comparisonData = subjects.map((s: any) => ({
    name: s.code || s.name?.substring(0, 10),
    average: s.average || 0,
    target: AcademicConfig.CLASS_AVERAGE_TARGET,
  }));

  const selectedSubjectName = subjects.find((s: any) => s.offering_id === detailedSubjectId)?.name || 'Subject';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Teacher Dashboard</h2>
          <p className="text-muted-foreground">Manage your subjects and evaluations</p>
        </div>
        <Button onClick={() => navigate('/exams')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Assigned Subjects"
          value={assignedSubjects.toString()}
          subtitle="Current semester"
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Total Students"
          value={totalStudents.toString()}
          subtitle="Across all subjects"
          icon={Users}
        />
        <StatsCard
          title="Pending Evaluations"
          value={pendingEvaluations.toString()}
          subtitle="Exams to grade"
          icon={Clock}
          variant={pendingEvaluations > 0 ? 'warning' : 'default'}
        />
        <StatsCard
          title="Class Average"
          value={`${classAverage}%`}
          subtitle="Overall performance"
          icon={TrendingUp}
          variant={classAverage >= AcademicConfig.CLASS_AVERAGE_TARGET ? "success" : "default"}
        />
      </div>

      {/* Quick Actions & Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/exams')}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Exam
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/marks-entry')}>
              <FileText className="w-4 h-4 mr-2" />
              Enter Marks
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/analytics')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/course-outcomes')}>
              <BarChart2 className="w-4 h-4 mr-2" />
              Manage COs
            </Button>
          </CardContent>
        </Card>

        {/* Subject List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">My Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length > 0 ? (
              <div className="space-y-3">
                {subjects.map((subject: any) => (
                  <div key={subject.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.code} • {subject.exams_count || 0} exams</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={subject.exams_count > 0 ? 'default' : 'outline'}>
                        {subject.exams_count > 0 ? 'Active' : 'No Exams'}
                      </Badge>
                      {subject.offering_id && (
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadReport(subject.offering_id, subject.name)} title="Download Report">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => navigate('/marks-entry')}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No subjects assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Students */}
      <AtRiskStudentsList subjects={subjects} />

      {/* Detailed Analytics Section */}
      {subjects.length > 0 && (
         <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Detailed Subject Analytics
                </h3>
                <div className="w-64">
                   <Select value={detailedSubjectId} onValueChange={setDetailedSubjectId}>
                      <SelectTrigger>
                         <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                         {subjects.filter((s: any) => s.offering_id).map((s: any) => (
                             <SelectItem key={s.offering_id} value={s.offering_id}>{s.name} ({s.code})</SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                </div>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Subject Health */}
                 <div className="lg:col-span-1">
                     {detailedSubjectId && (
                        <div className="space-y-6">
                            <SubjectHealthCard offeringId={detailedSubjectId} subjectName={selectedSubjectName} />
                            <QPQICard offeringId={detailedSubjectId} subjectName={selectedSubjectName} />
                        </div>
                     )}
                 </div>
                 
                 {/* Question Analysis */}
                 <div className="lg:col-span-2">
                     {detailedSubjectId && (
                         <QuestionDifficultyChart offeringId={detailedSubjectId} />
                     )}
                 </div>
             </div>
         </div>
      )}

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Overall Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {comparisonData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="average" fill="hsl(var(--primary))" name="Class Average" />
                  <Bar dataKey="target" fill="hsl(var(--muted))" name="Target" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Performance chart will appear after exams are graded.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
