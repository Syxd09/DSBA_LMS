import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Loader2, BookOpen } from 'lucide-react';

interface BacklogRootCauseAnalysisProps {
  departmentId?: string;
  filters: {
    cohort_id?: string;
    semester?: number;
  };
}

export function BacklogRootCauseAnalysis({ departmentId, filters }: BacklogRootCauseAnalysisProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['backlog-analysis', departmentId, filters],
    queryFn: () => roleAnalyticsApi.getDepartmentHealth(filters),
    enabled: !!departmentId,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Backlog Root Cause Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const analyticsData = data?.data || {};
  const subjectStats = analyticsData.subject_stats || [];
  
  // Calculate backlog insights
  const backlogSubjects = subjectStats.filter((s: any) => s.backlog_count > 0);
  
  // Analyze root causes
  const rootCauseAnalysis = backlogSubjects.map((subject: any) => {
    const totalStudents = subject.student_count || 1;
    const backlogCount = subject.backlog_count || 0;
    const backlogRate = (backlogCount / totalStudents) * 100;
    
    // Determine primary cause
    let primaryCause = 'Unknown';
    let causeColor = 'secondary';
    
    if (subject.internal_fail_rate > subject.external_fail_rate) {
      primaryCause = 'Internal Assessment';
      causeColor = 'yellow';
    } else if (subject.external_fail_rate > 50) {
      primaryCause = 'External Exam';
      causeColor = 'red';
    } else if (backlogRate > 30) {
      primaryCause = 'Overall Difficulty';
      causeColor = 'orange';
    } else {
      primaryCause = 'Individual Cases';
      causeColor = 'blue';
    }
    
    return {
      subjectCode: subject.subject_code || 'N/A',
      subjectName: subject.subject_name || 'Unknown',
      backlogCount,
      backlogRate: Math.round(backlogRate),
      internalFailRate: Math.round(subject.internal_fail_rate || 0),
      externalFailRate: Math.round(subject.external_fail_rate || 0),
      primaryCause,
      causeColor,
      avgAttempts: subject.avg_attempts || 1,
    };
  }).sort((a: any, b: any) => b.backlogCount - a.backlogCount);

  // Summary statistics
  const totalBacklogs = rootCauseAnalysis.reduce((sum: number, s: any) => sum + s.backlogCount, 0);
  const internalCaused = rootCauseAnalysis.filter((s: any) => s.primaryCause === 'Internal Assessment').length;
  const externalCaused = rootCauseAnalysis.filter((s: any) => s.primaryCause === 'External Exam').length;

  const getCauseIcon = (cause: string) => {
    switch (cause) {
      case 'Internal Assessment': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'External Exam': return <XCircle className="w-3 h-3 text-red-500" />;
      case 'Overall Difficulty': return <AlertTriangle className="w-3 h-3 text-orange-500" />;
      default: return <CheckCircle className="w-3 h-3 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Backlog Root Cause Analysis
          </CardTitle>
          <Badge variant="outline">{totalBacklogs} Total Backlogs</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {rootCauseAnalysis.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">No backlogs detected. Excellent!</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                <p className="font-semibold text-yellow-600">{internalCaused}</p>
                <p className="text-xs text-muted-foreground">Internal Issues</p>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                <p className="font-semibold text-red-600">{externalCaused}</p>
                <p className="text-xs text-muted-foreground">External Issues</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                <p className="font-semibold text-blue-600">{rootCauseAnalysis.length - internalCaused - externalCaused}</p>
                <p className="text-xs text-muted-foreground">Other</p>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Backlogs</TableHead>
                    <TableHead className="text-center">Int. Fail</TableHead>
                    <TableHead className="text-center">Ext. Fail</TableHead>
                    <TableHead>Root Cause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rootCauseAnalysis.slice(0, 8).map((subject: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{subject.subjectCode}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-32">{subject.subjectName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={subject.backlogRate > 20 ? 'destructive' : 'secondary'}>
                          {subject.backlogCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Progress value={subject.internalFailRate} className="h-2 w-12" />
                          <span className="text-xs">{subject.internalFailRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Progress value={subject.externalFailRate} className="h-2 w-12" />
                          <span className="text-xs">{subject.externalFailRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getCauseIcon(subject.primaryCause)}
                          <span className="text-xs">{subject.primaryCause}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Recommendations */}
            {internalCaused > externalCaused && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  💡 Most backlogs are due to internal assessment failures. Consider reviewing assignment policies and internal exam difficulty.
                </p>
              </div>
            )}
            {externalCaused > internalCaused && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ External exam failures are the primary cause. Consider additional revision sessions and mock tests.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
