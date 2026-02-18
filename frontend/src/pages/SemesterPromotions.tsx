import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { promotionsApi, cohortsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowUpCircle, Loader2, RefreshCw, Users, CheckCircle, XCircle, Clock, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRole } from '@/components/auth/RoleContext';

interface SemesterPromotion {
  id: string;
  cohort_id: string;
  from_semester: number;
  to_semester: number;
  academic_year: string;
  approved_by: string;
  approved_at: string;
  approval_notes?: string;
  total_students: number;
  students_promoted: number;
  students_detained: number;
  students_on_hold: number;
  status: string;
  created_at: string;
  cohort?: { name: string; program?: { name: string } };
  approver?: { full_name: string };
}

interface EligibilityData {
  cohort_id: string;
  current_semester: number;
  eligible_count: number;
  detained_count: number;
  total_students: number;
  students: Array<{
    usn: string;
    name: string;
    backlog_count: number;
    is_eligible: boolean;
    detention_reason?: string;
  }>;
}

export default function SemesterPromotions() {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<SemesterPromotion | null>(null);
  const [cohortFilter, setCohortFilter] = useState('all');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');
  const [selectedCohortForPromotion, setSelectedCohortForPromotion] = useState('');

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  const { data: promotions = [], isLoading, refetch } = useQuery({
    queryKey: ['promotions', cohortFilter, academicYear],
    queryFn: () => promotionsApi.list({
      cohort_id: cohortFilter !== 'all' ? cohortFilter : undefined,
      academic_year: academicYear || undefined,
      limit: 50,
    }),
  });

  const { data: eligibility, isLoading: isLoadingEligibility } = useQuery({
    queryKey: ['promotion-eligibility', selectedCohortForPromotion],
    queryFn: () => promotionsApi.getEligibility(selectedCohortForPromotion),
    enabled: !!selectedCohortForPromotion,
  });

  const promoteMutation = useMutation({
    mutationFn: () => promotionsApi.execute(
      selectedCohortForPromotion,
      {
        confirm: true,
        approval_notes: approvalNotes || undefined,
      }
    ),
    onSuccess: () => {
      toast({ title: 'Semester promotion executed successfully' });
      setIsPromoteDialogOpen(false);
      setApprovalNotes('');
      setSelectedCohortForPromotion('');
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error executing promotion',
        description: error.response?.data?.detail || 'Failed to execute semester promotion',
        variant: 'destructive',
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: () => promotionsApi.rollback(selectedPromotion!.id, rollbackReason),
    onSuccess: () => {
      toast({ title: 'Promotion rolled back successfully' });
      setIsRollbackDialogOpen(false);
      setRollbackReason('');
      setSelectedPromotion(null);
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error rolling back promotion',
        description: error.response?.data?.detail || 'Failed to rollback promotion',
        variant: 'destructive',
      });
    },
  });

  const handlePromote = () => {
    if (!selectedCohortForPromotion) {
      toast({ title: 'Please select a cohort', variant: 'destructive' });
      return;
    }
    promoteMutation.mutate();
  };

  const handleRollback = () => {
    if (!rollbackReason.trim()) {
      toast({ title: 'Please provide a reason for rollback', variant: 'destructive' });
      return;
    }
    rollbackMutation.mutate();
  };

  const openRollbackDialog = (promotion: SemesterPromotion) => {
    setSelectedPromotion(promotion);
    setIsRollbackDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'rolled_back':
        return <Badge variant="secondary"><RotateCcw className="w-3 h-3 mr-1" />Rolled Back</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Semester Promotions</h2>
            <p className="text-muted-foreground">Manage cohort semester advancements and student promotions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  New Promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Execute Semester Promotion</DialogTitle>
                  <DialogDescription>
                    This will promote eligible students to the next semester. Detained students will remain in their current semester.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Cohort *</Label>
                      <Select
                        value={selectedCohortForPromotion}
                        onValueChange={setSelectedCohortForPromotion}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose cohort" />
                        </SelectTrigger>
                        <SelectContent>
                          {cohorts.map((cohort: any) => (
                            <SelectItem key={cohort.id} value={cohort.id}>
                              {cohort.name} (Sem {cohort.current_semester})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Input
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="e.g., 2025-26"
                      />
                    </div>
                  </div>

                  {/* Eligibility Preview */}
                  {selectedCohortForPromotion && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Eligibility Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingEligibility ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : eligibility ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-3 bg-green-50 rounded-lg dark:bg-green-950">
                                <div className="text-2xl font-bold text-green-600">{eligibility.eligible_count}</div>
                                <div className="text-xs text-muted-foreground">Eligible</div>
                              </div>
                              <div className="p-3 bg-red-50 rounded-lg dark:bg-red-950">
                                <div className="text-2xl font-bold text-red-600">{eligibility.detained_count}</div>
                                <div className="text-xs text-muted-foreground">Detained</div>
                              </div>
                              <div className="p-3 bg-blue-50 rounded-lg dark:bg-blue-950">
                                <div className="text-2xl font-bold text-blue-600">{eligibility.total_students}</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                              </div>
                            </div>
                            {eligibility.detained_count > 0 && (
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Detention Notice</AlertTitle>
                                <AlertDescription>
                                  {eligibility.detained_count} students will be detained due to excessive backlogs.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Select a cohort to view eligibility data
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <Label>Approval Notes (Optional)</Label>
                    <Textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add any notes about this promotion..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handlePromote} 
                    disabled={promoteMutation.isPending || !selectedCohortForPromotion}
                  >
                    {promoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Execute Promotion
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="space-y-2 w-64">
                <Label>Filter by Cohort</Label>
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cohorts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cohorts</SelectItem>
                    {cohorts.map((cohort: any) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-40">
                <Label>Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g., 2025-26"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promotions Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : promotions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ArrowUpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No promotions found</h3>
              <p className="text-muted-foreground mb-4">
                Execute a semester promotion to advance students to the next semester.
              </p>
              <Button onClick={() => setIsPromoteDialogOpen(true)}>
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                New Promotion
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Promotion History</CardTitle>
              <CardDescription>
                Showing {promotions.length} promotion records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Transition</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Promoted</TableHead>
                    <TableHead>Detained</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Date</TableHead>
                    {role === 'principal' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promotion: SemesterPromotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell>
                        <div className="font-medium">{promotion.cohort?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {promotion.cohort?.program?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Sem {promotion.from_semester} → {promotion.to_semester}
                        </Badge>
                      </TableCell>
                      <TableCell>{promotion.academic_year}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {promotion.total_students}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">{promotion.students_promoted}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium">{promotion.students_detained}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(promotion.status)}</TableCell>
                      <TableCell>
                        {promotion.approver?.full_name || 'System'}
                      </TableCell>
                      <TableCell>
                        {new Date(promotion.approved_at).toLocaleDateString()}
                      </TableCell>
                      {role === 'principal' && (
                        <TableCell>
                          {promotion.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRollbackDialog(promotion)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Rollback Dialog (Principal Only) */}
        <Dialog open={isRollbackDialogOpen} onOpenChange={setIsRollbackDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rollback Promotion</DialogTitle>
              <DialogDescription>
                This will undo the semester promotion. All students will return to their previous semester.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This action is for exceptional circumstances only. Please provide a detailed reason.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Reason for Rollback *</Label>
                <Textarea
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  placeholder="Explain why this promotion needs to be rolled back..."
                  rows={4}
                />
              </div>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleRollback}
                disabled={rollbackMutation.isPending || !rollbackReason.trim()}
              >
                {rollbackMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Rollback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
