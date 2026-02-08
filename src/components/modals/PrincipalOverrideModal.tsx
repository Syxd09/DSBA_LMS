/**
 * EduMetrics - Principal Override Modal
 * U-01: Clear modal with mandatory reason input and audit warning
 * 
 * Used for:
 * - Marks modification after lock
 * - Exam approval bypass
 * - Grade overrides
 * - Any action requiring principal authority
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, FileWarning, Lock } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface OverrideContext {
  entityType: 'marks' | 'exam' | 'grade' | 'promotion' | 'other';
  entityId: string;
  entityName: string;
  currentValue?: string | number;
  newValue?: string | number;
  additionalInfo?: Record<string, any>;
}

export interface PrincipalOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, context: OverrideContext) => Promise<void>;
  context: OverrideContext;
  title?: string;
  description?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PrincipalOverrideModal({
  isOpen,
  onClose,
  onConfirm,
  context,
  title = 'Principal Override Required',
  description = 'This action requires principal authority and will be permanently recorded in the audit log.'
}: PrincipalOverrideModalProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Minimum reason length for accountability
  const MIN_REASON_LENGTH = 20;
  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  const canSubmit = isReasonValid && acknowledged && !isSubmitting;

  const getEntityLabel = () => {
    switch (context.entityType) {
      case 'marks': return 'Student Marks';
      case 'exam': return 'Exam Status';
      case 'grade': return 'Grade';
      case 'promotion': return 'Semester Promotion';
      default: return 'Record';
    }
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      await onConfirm(reason.trim(), context);
      // Reset state on success
      setReason('');
      setAcknowledged(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Override failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setAcknowledged(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle className="text-amber-900">{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context Info */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Override Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 font-medium">{getEntityLabel()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">ID:</span>
                <span className="ml-2 font-mono text-xs">{context.entityId.slice(0, 8)}...</span>
              </div>
              {context.entityName && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Record:</span>
                  <span className="ml-2">{context.entityName}</span>
                </div>
              )}
              {context.currentValue !== undefined && (
                <div>
                  <span className="text-muted-foreground">Current:</span>
                  <span className="ml-2 font-medium">{context.currentValue}</span>
                </div>
              )}
              {context.newValue !== undefined && (
                <div>
                  <span className="text-muted-foreground">New:</span>
                  <span className="ml-2 font-medium text-amber-600">{context.newValue}</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Warning */}
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Audit Warning</AlertTitle>
            <AlertDescription className="text-sm">
              This action will be <strong>permanently recorded</strong> with:
              <ul className="list-disc ml-4 mt-1">
                <li>Your identity (Principal: {'{username}'})</li>
                <li>Exact timestamp</li>
                <li>Before/after values</li>
                <li>The reason you provide below</li>
              </ul>
              This record <strong>cannot be deleted</strong> and may be reviewed during audits.
            </AlertDescription>
          </Alert>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-2">
              <FileWarning className="w-4 h-4" />
              Justification Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Provide a clear and detailed justification for this override (minimum 20 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Be specific - this reason will be permanently recorded</span>
              <span className={reason.length < MIN_REASON_LENGTH ? 'text-red-500' : 'text-green-500'}>
                {reason.length}/{MIN_REASON_LENGTH} min
              </span>
            </div>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg bg-amber-50 border-amber-200">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              disabled={isSubmitting}
            />
            <div className="flex-1">
              <Label htmlFor="acknowledge" className="text-sm font-medium cursor-pointer">
                I acknowledge this action
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                I understand this override will be audited and I accept full responsibility 
                for this action and its consequences.
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Confirm Override
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// HOOK FOR EASY USAGE
// =============================================================================

export function usePrincipalOverride() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingContext, setPendingContext] = useState<OverrideContext | null>(null);
  const [pendingCallback, setPendingCallback] = useState<((reason: string) => Promise<void>) | null>(null);

  const requestOverride = (
    context: OverrideContext,
    callback: (reason: string) => Promise<void>
  ) => {
    setPendingContext(context);
    setPendingCallback(() => callback);
    setIsOpen(true);
  };

  const handleConfirm = async (reason: string) => {
    if (pendingCallback) {
      await pendingCallback(reason);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPendingContext(null);
    setPendingCallback(null);
  };

  return {
    isOpen,
    context: pendingContext,
    requestOverride,
    handleConfirm,
    handleClose
  };
}

export default PrincipalOverrideModal;
