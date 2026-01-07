import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeacherStudentFeedback } from '@/types/feedback.types';
import { FeedbackStatusBadge } from '@/components/feedback/FeedbackStatusBadge';
import { StarRatingInput } from '@/components/feedback/StarRatingInput';
import { CheckCircle2, Eye } from 'lucide-react';

interface FeedbackApprovalCardProps {
  feedback: TeacherStudentFeedback;
  onApprove: (feedbackId: string) => void;
  onViewDetails: (feedbackId: string) => void;
  isApproving?: boolean;
}

/**
 * Card for single feedback pending approval
 * Follows existing card patterns
 */
export function FeedbackApprovalCard({
  feedback,
  onApprove,
  onViewDetails,
  isApproving = false
}: FeedbackApprovalCardProps) {
  const submittedDate = feedback.submittedAt
    ? new Date(feedback.submittedAt).toLocaleDateString()
    : 'N/A';

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
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {feedback.subject?.code} - {feedback.subject?.name}
              </span>
              <Badge variant="secondary">Semester {feedback.semester}</Badge>
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

          {/* Submitted Date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Submitted:</span>
            <span>{submittedDate}</span>
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
            <Button
              onClick={() => onApprove(feedback.id)}
              disabled={isApproving}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
