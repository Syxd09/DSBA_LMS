import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { remedialApi, RemedialBulkAssign } from '@/services/remedialService';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RemedialActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentIds: string[];
  offeringId: string;
}

export function RemedialActionModal({ isOpen, onClose, studentIds, offeringId }: RemedialActionModalProps) {
  const queryClient = useQueryClient();
  const [actionType, setActionType] = useState<string>('ASSIGNMENT');
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<RemedialBulkAssign>();

  const mutation = useMutation({
    mutationFn: (data: RemedialBulkAssign) => remedialApi.assignBulk(data),
    onSuccess: () => {
      toast({ title: 'Remedial actions assigned successfully' });
      // Invalidate both at-risk and remedial-actions queries
      queryClient.invalidateQueries({ queryKey: ['remedial-actions'] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to assign actions', 
        description: error.response?.data?.detail || 'Unknown error',
        variant: 'destructive' 
      });
    }
  });

  const onSubmit = (data: any) => {
    if (studentIds.length === 0) {
        toast({ title: "No students selected", variant: "destructive" });
        return;
    }
    mutation.mutate({
      ...data,
      student_ids: studentIds,
      offering_id: offeringId,
      action_type: actionType,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Remedial Action</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Assigning action to <span className="font-semibold">{studentIds.length}</span> students.
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSIGNMENT">Assignment</SelectItem>
                <SelectItem value="EXTRA_CLASS">Extra Class</SelectItem>
                <SelectItem value="COUNSELING">Counseling</SelectItem>
                <SelectItem value="RETEST">Retest</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              {...register('description', { required: 'Description is required' })} 
              placeholder="E.g., Complete Chapter 3 Worksheet"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input 
              type="date" 
              {...register('deadline', { required: 'Deadline is required' })} 
            />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
          </div>
          
           <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea {...register('remarks')} placeholder="Internal notes..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || studentIds.length === 0}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Action
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
