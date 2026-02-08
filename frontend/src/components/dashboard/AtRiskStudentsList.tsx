import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Users, ChevronDown, ChevronUp, Loader2, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { ExportButton } from '@/components/ui/export-button';

interface AtRiskStudentsListProps {
  subjects: Array<{
    id: string;
    name: string;
    code: string;
    offering_id?: string;
  }>;
}

export function AtRiskStudentsList({ subjects }: AtRiskStudentsListProps) {
  const [selectedOffering, setSelectedOffering] = useState<string>('');
  const [expanded, setExpanded] = useState(true);
  const [threshold, setThreshold] = useState(50);

  // Get at-risk students for selected offering
  const { data: atRiskData, isLoading } = useQuery({
    queryKey: ['at-risk-students', selectedOffering, threshold],
    queryFn: () => roleAnalyticsApi.getAtRiskStudents(selectedOffering, threshold),
    enabled: !!selectedOffering,
  });

  const atRiskStudents = atRiskData?.data?.at_risk_students || [];
  const totalStudents = atRiskData?.data?.total_students || 0;
  const atRiskCount = atRiskData?.data?.at_risk_count || 0;
  const atRiskPercentage = atRiskData?.data?.at_risk_percentage || 0;

  // Filter subjects that have offering_id
  const availableSubjects = subjects.filter(s => s.offering_id);

  const getStatusBadge = (status: string, percentage: number) => {
    if (status === 'NO_DATA') {
      return <Badge variant="outline">No Data</Badge>;
    }
    if (percentage < 35) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (percentage < 45) {
      return <Badge className="bg-orange-500">Warning</Badge>;
    }
    return <Badge className="bg-yellow-500">At Risk</Badge>;
  };

  return (
    <Card className={atRiskCount > 0 ? "border-destructive/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${atRiskCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            At-Risk Students
            {atRiskCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {atRiskCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {selectedOffering && atRiskStudents.length > 0 && (
              <ExportButton
                endpoint={`/export/teacher/at-risk-students/${selectedOffering}`}
                params={{ threshold }}
                filename={`at_risk_students_${atRiskData?.data?.subject_code || 'report'}`}
                size="sm"
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-4">
          {/* Subject Selector */}
          <div className="flex gap-2">
            <Select value={selectedOffering} onValueChange={setSelectedOffering}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.offering_id!}>
                    {subject.code} - {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={threshold.toString()} onValueChange={(v) => setThreshold(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Threshold" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="40">Below 40%</SelectItem>
                <SelectItem value="50">Below 50%</SelectItem>
                <SelectItem value="60">Below 60%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {!selectedOffering ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a subject to view at-risk students</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : atRiskStudents.length === 0 ? (
            <div className="text-center py-6 text-green-600">
              <p className="font-medium">✓ No at-risk students</p>
              <p className="text-sm text-muted-foreground mt-1">
                All {totalStudents} students are performing above {threshold}%
              </p>
            </div>
          ) : (
            <>
              {/* Summary Bar */}
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    {atRiskCount} of {totalStudents} students at risk
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {atRiskPercentage}%
                  </span>
                </div>
                <Progress value={atRiskPercentage} className="h-2 bg-secondary" />
              </div>

              {/* Student List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {atRiskStudents.slice(0, 10).map((student: any) => (
                  <div
                    key={student.usn}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{student.name}</span>
                        {getStatusBadge(student.status, student.percentage)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {student.usn} • {student.reason}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">
                        {student.percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.marks_obtained}/{student.max_marks}
                      </p>
                    </div>
                    {student.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => window.open(`mailto:${student.email}?subject=Academic Support - ${atRiskData?.data?.subject_code}`, '_blank')}
                        title="Send email"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {atRiskStudents.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    +{atRiskStudents.length - 10} more students
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
