import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { examsApi } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Send, Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';

interface ApprovalWorkflowCardProps {
  examId: string;
  examName: string;
  currentStatus: 'draft' | 'submitted' | 'approved' | 'locked' | 'rejected';
  userRole: 'teacher' | 'hod' | 'principal';
  onStatusChange?: () => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'secondary' as const, icon: Clock },
  submitted: { label: 'Pending Approval', color: 'secondary' as const, icon: Send },
  approved: { label: 'Approved', color: 'default' as const, icon: CheckCircle },
  locked: { label: 'Locked', color: 'default' as const, icon: Lock },
  rejected: { label: 'Rejected', color: 'destructive' as const, icon: XCircle },
};

export function ApprovalWorkflowCard({
  examId,
  examName,
  currentStatus,
  userRole,
  onStatusChange,
}: ApprovalWorkflowCardProps) {
  const queryClient = useQueryClient();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => examsApi.submit(examId),
    onSuccess: () => {
      toast({ title: 'Submitted for approval' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-details', examId] });
      onStatusChange?.();
    },
    onError: (err: any) => {
      toast({ title: 'Submission failed', description: err.response?.data?.detail, variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => examsApi.approve(examId),
    onSuccess: () => {
      toast({ title: 'Exam approved' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      onStatusChange?.();
    },
    onError: (err: any) => {
      toast({ title: 'Approval failed', description: err.response?.data?.detail, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => examsApi.reject(examId, reason),
    onSuccess: () => {
      toast({ title: 'Exam rejected' });
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      onStatusChange?.();
    },
    onError: (err: any) => {
      toast({ title: 'Rejection failed', description: err.response?.data?.detail, variant: 'destructive' });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => examsApi.lock(examId),
    onSuccess: () => {
      toast({ title: 'Exam locked - marks are now immutable' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      onStatusChange?.();
    },
    onError: (err: any) => {
      toast({ title: 'Lock failed', description: err.response?.data?.detail, variant: 'destructive' });
    },
  });

  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const canSubmit = userRole === 'teacher' && currentStatus === 'draft';
  const canApprove = (userRole === 'hod' || userRole === 'principal') && currentStatus === 'submitted';
  const canReject = (userRole === 'hod' || userRole === 'principal') && currentStatus === 'submitted';
  const canLock = (userRole === 'hod' || userRole === 'principal') && currentStatus === 'approved';

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Approval Workflow</CardTitle>
            <Badge variant={statusConfig.color} className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{examName}</p>
          
          {/* Workflow Steps */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`h-2 w-2 rounded-full ${currentStatus !== 'draft' ? 'bg-green-500' : 'bg-muted'}`} />
            <div className={`flex-1 h-0.5 ${currentStatus !== 'draft' ? 'bg-green-500' : 'bg-muted'}`} />
            <div className={`h-2 w-2 rounded-full ${currentStatus === 'approved' || currentStatus === 'locked' ? 'bg-green-500' : 'bg-muted'}`} />
            <div className={`flex-1 h-0.5 ${currentStatus === 'locked' ? 'bg-green-500' : 'bg-muted'}`} />
            <div className={`h-2 w-2 rounded-full ${currentStatus === 'locked' ? 'bg-green-500' : 'bg-muted'}`} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-4">
            <span>Draft</span>
            <span>Approved</span>
            <span>Locked</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <Button 
                size="sm" 
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit for Approval
              </Button>
            )}
            
            {canApprove && (
              <Button 
                size="sm" 
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Approve
              </Button>
            )}
            
            {canReject && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => setIsRejectDialogOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            )}
            
            {canLock && (
              <Button 
                size="sm"
                onClick={() => lockMutation.mutate()}
                disabled={lockMutation.isPending}
              >
                {lockMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Lock Marks
              </Button>
            )}

            {currentStatus === 'locked' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" /> Marks are now immutable
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reject Exam
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. This will be visible to the faculty.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Reason for Rejection</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this exam is being rejected..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectionReason)}
              disabled={rejectMutation.isPending || rejectionReason.length < 10}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
