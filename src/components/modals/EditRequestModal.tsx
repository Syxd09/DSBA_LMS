import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Edit, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'exam' | 'marks' | 'student' | 'offering';
  entityId: string;
  entityName: string;
  currentValue?: string;
  onSuccess?: () => void;
}

type EditReason = 'data_entry_error' | 'student_request' | 'faculty_request' | 'system_error' | 'other';

const REASON_OPTIONS: { value: EditReason; label: string }[] = [
  { value: 'data_entry_error', label: 'Data Entry Error' },
  { value: 'student_request', label: 'Student Request (with documentation)' },
  { value: 'faculty_request', label: 'Faculty Request (with justification)' },
  { value: 'system_error', label: 'System/Technical Error' },
  { value: 'other', label: 'Other (specify in details)' },
];

export function EditRequestModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  currentValue,
  onSuccess,
}: EditRequestModalProps) {
  const queryClient = useQueryClient();
  const [reasonType, setReasonType] = useState<EditReason | ''>('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [newValue, setNewValue] = useState('');

  const submitRequest = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/audit/edit-request', {
        entity_type: entityType,
        entity_id: entityId,
        reason_type: reasonType,
        reason_details: reasonDetails,
        current_value: currentValue,
        requested_value: newValue,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Edit request submitted', description: 'Your request has been sent for approval.' });
      queryClient.invalidateQueries({ queryKey: ['edit-requests'] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      toast({ 
        title: 'Failed to submit request', 
        description: err.response?.data?.detail || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setReasonType('');
    setReasonDetails('');
    setNewValue('');
    onClose();
  };

  const handleSubmit = () => {
    if (!reasonType) {
      toast({ title: 'Reason required', description: 'Please select a reason type.', variant: 'destructive' });
      return;
    }
    if (reasonDetails.length < 20) {
      toast({ title: 'Details required', description: 'Please provide at least 20 characters of detail.', variant: 'destructive' });
      return;
    }
    submitRequest.mutate();
  };

  const getEntityIcon = () => {
    switch (entityType) {
      case 'exam': return <FileText className="w-4 h-4" />;
      case 'marks': return <Edit className="w-4 h-4" />;
      default: return <Edit className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEntityIcon()}
            Request Edit: {entityName}
          </DialogTitle>
          <DialogDescription>
            Submit an edit request with justification. Requests require HOD/Principal approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Value Display */}
          {currentValue && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Current Value</Label>
              <p className="font-medium">{currentValue}</p>
            </div>
          )}

          {/* Entity Info */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{entityType.toUpperCase()}</Badge>
            <span className="text-sm text-muted-foreground">ID: {entityId.slice(0, 8)}...</span>
          </div>

          {/* Reason Type */}
          <div className="space-y-2">
            <Label htmlFor="reason-type">Reason Type <span className="text-destructive">*</span></Label>
            <Select value={reasonType} onValueChange={(v: EditReason) => setReasonType(v)}>
              <SelectTrigger id="reason-type">
                <SelectValue placeholder="Select reason for edit..." />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Value (if applicable) */}
          <div className="space-y-2">
            <Label htmlFor="new-value">Requested New Value</Label>
            <Textarea
              id="new-value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter the corrected/new value..."
              rows={2}
            />
          </div>

          {/* Reason Details */}
          <div className="space-y-2">
            <Label htmlFor="reason-details">
              Detailed Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason-details"
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="Provide detailed justification for this edit request. Include any supporting evidence or documentation references..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {reasonDetails.length}/20 characters minimum
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Important Notice</p>
              <p className="text-xs mt-1">
                All edit requests are logged in the audit trail. False or frivolous requests may result in disciplinary action.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitRequest.isPending || !reasonType || reasonDetails.length < 20}
          >
            {submitRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
