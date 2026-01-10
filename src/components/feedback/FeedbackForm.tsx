import { useState, useEffect } from 'react';
import { useFeedback } from '@/contexts/FeedbackContext';
import { useNavigate } from 'react-router-dom';
import {
  FeedbackTemplate,
  FeedbackTemplateCategory,
  TeacherStudentFeedback,
  FeedbackInput,
  CategoryRatingInput
} from '@/types/feedback.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StarRatingInput } from './StarRatingInput';
import { CategoryRatings } from './CategoryRatings';
import { FeedbackStatusBadge } from './FeedbackStatusBadge';
import { Loader2, Save, Send, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FeedbackFormProps {
  mode: 'create' | 'edit' | 'view';
  feedback?: TeacherStudentFeedback;
  studentId?: string;
  subjectId?: string;
  semester?: number;
  cohortId?: string;
}

/**
 * Feedback form with strict workflow and immutability rules
 * - Template selection ONLY at creation (LOCKED after creation)
 * - Editable ONLY in DRAFT status
 * - All fields required before submit
 * - Optimistic UI for draft save, waits for backend on submit
 */
export function FeedbackForm({
  mode,
  feedback,
  studentId,
  subjectId,
  semester,
  cohortId
}: FeedbackFormProps) {
  const navigate = useNavigate();
  const { templates, fetchTemplates, createFeedback, updateFeedback, submitFeedback, isSubmitting, error, clearError } = useFeedback();
  
  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(feedback?.templateId || '');
  const [starRating, setStarRating] = useState<number>(feedback?.starRating || 0);
  const [reviewText, setReviewText] = useState<string>(feedback?.reviewText || '');
  const [categoryRatings, setCategoryRatings] = useState<Map<string, number>>(new Map());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Initialize category ratings from existing feedback
  useEffect(() => {
    if (feedback?.categoryRatings) {
      const ratingsMap = new Map<string, number>();
      feedback.categoryRatings.forEach(cr => {
        ratingsMap.set(cr.categoryId, cr.rating);
      });
      setCategoryRatings(ratingsMap);
    }
  }, [feedback]);

  const selectedTemplate = (templates.find(t => t.id === selectedTemplateId) || feedback?.template) as FeedbackTemplate | undefined;
  
  // Derived categories list for robust display and validation
  const categories = selectedTemplate?.categories || 
    (feedback?.categoryRatings?.map(cr => cr.category).filter(Boolean).map(c => ({
      ...c,
      templateId: feedback?.templateId || '',
      createdAt: feedback?.createdAt || ''
    })) as FeedbackTemplateCategory[]) || [];

  const isReadOnly = mode === 'view' || (feedback && feedback.status !== 'DRAFT');
  const isDraft = feedback?.status === 'DRAFT';

  // Validate form 
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!selectedTemplateId && mode === 'create') {
      errors.push('Please select a feedback template');
    }

    if (starRating < 1 || starRating > 5) {
      errors.push('Overall star rating is required (1-5 stars)');
    }

    if (!reviewText || reviewText.trim().length < 10) {
      errors.push('Review text must be at least 10 characters');
    }

    if (categories.length > 0) {
      categories.forEach(category => {
        const rating = categoryRatings.get(category.id);
        if (!rating || rating < 1 || rating > 5) {
          errors.push(`Rating required for category: ${category.name}`);
        }
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle draft save (optimistic UI)
  const handleSaveDraft = async () => {
    if (!selectedTemplate) return;

    clearError();
    
    try {
      const categoryRatingsArray: CategoryRatingInput[] = categories.map(category => ({
        categoryId: category.id,
        rating: categoryRatings.get(category.id) || 0
      }));

      if (mode === 'create') {
        // Create new feedback
        if (!studentId || !subjectId || !semester || !cohortId) {
          toast({
            title: 'Error',
            description: 'Missing required information',
            variant: 'destructive'
          });
          return;
        }

        const feedbackData: FeedbackInput = {
          studentId,
          subjectId,
          semester,
          cohortId,
          templateId: selectedTemplateId, // LOCKED after this
          starRating,
          reviewText,
          categoryRatings: categoryRatingsArray
        };

        const created = await createFeedback(feedbackData);
        toast({
          title: 'Success',
          description: 'Feedback draft created successfully'
        });
        navigate(`/feedback/teacher/edit/${created.id}`);
      } else if (mode === 'edit' && feedback) {
        // Update existing draft
        await updateFeedback(feedback.id, {
          studentId: feedback.studentId,
          subjectId: feedback.subjectId,
          semester: feedback.semester,
          cohortId: feedback.cohortId,
          templateId: feedback.templateId, // Cannot change
          starRating,
          reviewText,
          categoryRatings: categoryRatingsArray
        });
        
        toast({
          title: 'Success',
          description: 'Draft saved successfully'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save draft',
        variant: 'destructive'
      });
    }
  };

  // Handle submit (waits for backend)
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!feedback || mode !== 'edit') {
      toast({
        title: 'Error',
        description: 'Can only submit existing draft feedback',
        variant: 'destructive'
      });
      return;
    }

    clearError();

    try {
      // Save draft first
      await handleSaveDraft();
      
      // Then submit (waits for backend confirmation)
      await submitFeedback(feedback.id);
      
      toast({
        title: 'Success',
        description: 'Feedback submitted for approval'
      });
      navigate('/feedback/teacher/assigned');
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'Could not submit feedback',
        variant: 'destructive'
      });
    }
  };

  const handleCategoryRatingChange = (categoryId: string, rating: number) => {
    setCategoryRatings(prev => new Map(prev).set(categoryId, rating));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {mode === 'create' && 'Create Feedback'}
            {mode === 'edit' && 'Edit Feedback'}
            {mode === 'view' && 'View Feedback'}
          </h2>
          {feedback && (
            <div className="flex items-center gap-2 mt-2">
              <FeedbackStatusBadge status={feedback.status} />
              {feedback.submittedAt && (
                <span className="text-sm text-muted-foreground">
                  Submitted: {new Date(feedback.submittedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate('/feedback/teacher/assigned')}>
          Back to List
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Template Selection (CREATE mode only) */}
      {mode === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Template</CardTitle>
            <CardDescription>
              Template cannot be changed after creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a feedback template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Template Locked Message (EDIT/VIEW mode) */}
      {(mode === 'edit' || mode === 'view') && selectedTemplate && (
        <Alert>
          <AlertDescription>
            Using template: <strong>{selectedTemplate.name}</strong> (Cannot be changed)
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Rating */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Star Rating</Label>
            <StarRatingInput
              value={starRating}
              onChange={setStarRating}
              disabled={isReadOnly}
              size="lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Ratings */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Ratings</CardTitle>
            <CardDescription>Rate student performance in each category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryRatings
              categories={categories}
              ratings={categoryRatings}
              onChange={handleCategoryRatingChange}
              disabled={isReadOnly}
            />
          </CardContent>
        </Card>
      )}

      {/* Review Text */}
      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
          <CardDescription>Detailed feedback for the student (minimum 10 characters)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            disabled={isReadOnly}
            placeholder="Provide detailed feedback..."
            rows={6}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting || !selectedTemplateId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
          {mode === 'edit' && isDraft && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
