import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TeacherStudentFeedback } from '@/types/feedback.types';
import { FeedbackStatusBadge } from '@/components/feedback/FeedbackStatusBadge';
import { StarRatingInput } from '@/components/feedback/StarRatingInput';
import { Lock, Eye, AlertTriangle } from 'lucide-react';

interface FeedbackLockCardProps {
  feedback: TeacherStudentFeedback;
  onLock: (feedbackId: string) => void;
  onViewDetails: (feedbackId: string) => void;
  isLocking?: boolean;
}

/**
 * Card for feedback awaiting final lock (APPROVED → LOCKED)
 * Shows confirmation dialog with NAAC evidence warning
 */
export function FeedbackLockCard({
  feedback,
  onLock,
  onViewDetails,
  isLocking = false
}: FeedbackLockCardProps) {
  const approvedDate = feedback.approvedAt
    ? new Date(feedback.approvedAt).toLocaleDateString()
    : 'N/A';

  const approvedBy = feedback.approvedBy || 'Unknown';

  // Truncate review text
  const truncatedReview = feedback.reviewText.length > 150
    ? feedback.reviewText.substring(0, 150) + '...'
    : feedback.reviewText;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{feedback.student?.fullName}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {feedback.subject?.code} - {feedback.subject?.name}
              </span>
              <Badge variant="secondary">Semester {feedback.semester}</Badge>
              {feedback.department && (
                <Badge variant="outline">{feedback.department.name}</Badge>
              )}
            </div>
          </div>
          <FeedbackStatusBadge status={feedback.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Teacher Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Teacher:</span>
            <span className="font-medium">{feedback.teacher?.fullName}</span>
          </div>

          {/* Star Rating */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Rating:</span>
            <StarRatingInput
              value={feedback.starRating}
              onChange={() => {}}
              disabled
              size="sm"
            />
          </div>

          {/* Review Preview */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Review:</p>
            <p className="text-sm">{truncatedReview}</p>
          </div>

          {/* Approval Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Approved:</span>
            <span>{approvedDate} by {approvedBy}</span>
          </div>

          {/* NAAC Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Locking this feedback will make it permanent NAAC evidence. This action cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => onViewDetails(feedback.id)}
              variant="outline"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isLocking}
                  variant="destructive"
                  className="flex-1"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isLocking ? 'Locking...' : 'Lock Permanently'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lock Feedback Permanently?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      <strong>This action is irreversible.</strong> Once locked, this feedback becomes
                      permanent NAAC accreditation evidence and can never be modified or deleted.
                    </p>
                    <p className="text-sm">
                      <strong>Student:</strong> {feedback.student?.fullName}
                      <br />
                      <strong>Subject:</strong> {feedback.subject?.name}
                      <br />
                      <strong>Teacher:</strong> {feedback.teacher?.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      By locking, you certify this feedback is accurate and complete for institutional audit purposes.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onLock(feedback.id)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Lock Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
