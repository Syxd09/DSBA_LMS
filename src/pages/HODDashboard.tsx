
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function HODDashboard() {
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [comments, setComments] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: async () => {
      const { data } = await api.get('/approvals/pending');
      return data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/approvals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast({ title: 'Request Approved', className: 'bg-green-500 text-white' });
    },
    onError: () => {
        toast({ title: 'Error approving request', variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      await api.post(`/approvals/${id}/reject`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      setRejectDialog(null);
      setComments('');
      toast({ title: 'Request Rejected' });
    },
     onError: () => {
        toast({ title: 'Error rejecting request', variant: 'destructive' });
    }
  });

  const handleApprove = (id: string) => {
      approveMutation.mutate(id);
  };

  const handleReject = () => {
      if (rejectDialog) {
          rejectMutation.mutate({ id: rejectDialog, comments });
      }
  };

  return (
    <AuthenticatedLayout allowedRoles={['hod', 'principal']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">HOD Dashboard</h2>
          <p className="text-muted-foreground">Manage pending approvals and department activities.</p>
        </div>

        <div className="grid gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Pending Approvals</CardTitle>
                    <CardDescription>Review requests from teachers</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-4">Loading...</div>
                    ) : requests?.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No pending approvals</div>
                    ) : (
                        <div className="space-y-4">
                            {requests?.map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="pt-1">
                                            {req.workflowType === 'MARKS_APPROVAL' ? (
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-gray-100 rounded-full">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold px-0">{req.workflowType.replace('_', ' ')}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Requester: {req.requester?.fullName} ({req.requester?.email})
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {format(new Date(req.createdAt), 'PPP p')}
                                            </p>
                                            {req.comments && (
                                                <div className="mt-2 text-sm bg-muted p-2 rounded text-muted-foreground">
                                                    "{req.comments}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                            onClick={() => handleApprove(req.id)}
                                            disabled={approveMutation.isPending}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={() => setRejectDialog(req.id)}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reject Request</DialogTitle>
                    <DialogDescription>Provide a reason for rejecting this approval request.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Reason for rejection</label>
                    <Textarea 
                        value={comments} 
                        onChange={(e) => setComments(e.target.value)} 
                        placeholder="Please provide feedback..."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>Reject Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </AuthenticatedLayout>
  );
}
