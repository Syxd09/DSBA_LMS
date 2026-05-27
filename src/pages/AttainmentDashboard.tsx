import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAcademicContext } from '@/contexts/AcademicContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Calculator, Send, CheckCircle, Lock, AlertCircle, 
  Target, Users, TrendingUp, Building2, Loader2 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface COAttainment {
  id: string;
  coId: string;
  targetPercent: number;
  achievedPercent: number;
  studentCount: number;
  passCount: number;
  status: 'DRAFT' | 'CALCULATED' | 'UNDER_REVIEW' | 'APPROVED' | 'LOCKED';
  co: { coNumber: number; description: string; bloomLevel: string };
  subject?: { name: string; code: string };
}

export default function AttainmentDashboard() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { departmentId, cohortId, semester, academicYear, isContextComplete } = useAcademicContext();
  
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  // Fetch subjects for selected context
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-for-attainment', cohortId],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
    enabled: isContextComplete,
  });
  
  // Fetch attainment data
  const { data: attainments = [], isLoading } = useQuery({
    queryKey: ['co-attainment', selectedSubject, cohortId, semester, academicYear],
    queryFn: async () => {
      const params = new URLSearchParams({
        subjectId: selectedSubject,
        cohortId,
        semester: String(semester),
        academicYear
      });
      const { data } = await api.get(`/attainment/co?${params}`);
      return data as COAttainment[];
    },
    enabled: !!selectedSubject && isContextComplete,
  });
  
  // Calculate mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      return api.post('/attainment/calculate', {
        subjectId: selectedSubject,
        cohortId,
        semester,
        academicYear
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'CO attainment calculated' });
      queryClient.invalidateQueries({ queryKey: ['co-attainment'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Calculation failed', variant: 'destructive' });
    }
  });
  
  // Submit for review mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      return api.post('/attainment/submit-review', {
        subjectId: selectedSubject,
        cohortId,
        semester,
        academicYear
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Submitted for HOD review' });
      queryClient.invalidateQueries({ queryKey: ['co-attainment'] });
    }
  });
  
  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return api.post('/attainment/approve', {
        subjectId: selectedSubject,
        cohortId,
        semester,
        academicYear
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Attainment approved' });
      queryClient.invalidateQueries({ queryKey: ['co-attainment'] });
    }
  });
  
  // Lock mutation
  const lockMutation = useMutation({
    mutationFn: async () => {
      return api.post('/attainment/lock', {
        subjectId: selectedSubject,
        cohortId,
        semester,
        academicYear
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Attainment locked' });
      queryClient.invalidateQueries({ queryKey: ['co-attainment'] });
    }
  });
  
  // Get status color
  const getAttainmentColor = (achieved: number, target: number) => {
    const ratio = achieved / target;
    if (ratio >= 1) return 'bg-green-500';
    if (ratio >= 0.67) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'secondary',
      CALCULATED: 'outline',
      UNDER_REVIEW: 'default',
      APPROVED: 'default',
      LOCKED: 'secondary'
    };
    const icons: Record<string, React.ReactNode> = {
      CALCULATED: <TrendingUp className="w-3 h-3 mr-1" />,
      UNDER_REVIEW: <AlertCircle className="w-3 h-3 mr-1" />,
      APPROVED: <CheckCircle className="w-3 h-3 mr-1" />,
      LOCKED: <Lock className="w-3 h-3 mr-1" />
    };
    return (
      <Badge variant={colors[status] as any} className="capitalize">
        {icons[status]}
        {status.replace('_', ' ').toLowerCase()}
      </Badge>
    );
  };
  
  // Determine which actions are available
  const allCalculated = attainments.length > 0 && attainments.every(a => a.status !== 'DRAFT');
  const allUnderReview = attainments.every(a => a.status === 'UNDER_REVIEW');
  const allApproved = attainments.every(a => a.status === 'APPROVED');
  const canCalculate = ['admin', 'principal', 'hod', 'teacher'].includes(role || '');
  const canSubmit = canCalculate && allCalculated;
  const canApprove = ['admin', 'principal', 'hod'].includes(role || '') && allUnderReview;
  const canLock = ['admin', 'principal'].includes(role || '') && allApproved;

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">CO Attainment Dashboard</h2>
            <p className="text-muted-foreground">Calculate and approve course outcome attainment</p>
          </div>
        </div>

        {/* Context Check */}
        {!isContextComplete ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select Academic Context</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Use the context bar above to select Department, Cohort, and Semester
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Subject Selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Select Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1 max-w-md space-y-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subj: any) => (
                          <SelectItem key={subj.id} value={subj.id}>
                            {subj.code} - {subj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedSubject && (
                    <div className="flex gap-2">
                      {canCalculate && (
                        <Button 
                          onClick={() => calculateMutation.mutate()} 
                          disabled={calculateMutation.isPending}
                        >
                          {calculateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Calculator className="w-4 h-4 mr-2" />
                          )}
                          Calculate
                        </Button>
                      )}
                      {canSubmit && (
                        <Button 
                          variant="outline"
                          onClick={() => submitMutation.mutate()}
                          disabled={submitMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Submit for Review
                        </Button>
                      )}
                      {canApprove && (
                        <Button 
                          variant="default"
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      )}
                      {canLock && (
                        <Button 
                          variant="secondary"
                          onClick={() => lockMutation.mutate()}
                          disabled={lockMutation.isPending}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Lock
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attainment Cards */}
            {selectedSubject && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : attainments.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Target className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Attainment Data</h3>
                      <p className="text-muted-foreground mb-4">
                        Click "Calculate" to compute CO attainment from student marks
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {attainments.map((att) => (
                      <Card key={att.id} className="relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${getAttainmentColor(att.achievedPercent, att.targetPercent)}`} />
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">CO{att.co.coNumber}</CardTitle>
                              <CardDescription className="line-clamp-2 mt-1">
                                {att.co.description}
                              </CardDescription>
                            </div>
                            {getStatusBadge(att.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Attainment Gauge */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Attainment</span>
                                <span className="font-semibold">
                                  {att.achievedPercent.toFixed(1)}%
                                </span>
                              </div>
                              <Progress 
                                value={Math.min(att.achievedPercent, 100)} 
                                className="h-2"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Target: {att.targetPercent}%</span>
                                <span>{att.achievedPercent >= att.targetPercent ? '✓ Attained' : '⚠ Below target'}</span>
                              </div>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-4 pt-2 border-t">
                              <div className="flex items-center gap-1 text-sm">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{att.passCount}/{att.studentCount}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {att.co.bloomLevel}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
