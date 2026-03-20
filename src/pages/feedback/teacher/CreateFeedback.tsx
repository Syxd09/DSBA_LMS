import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, Send, Save, Loader2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'react-router-dom';

interface FeedbackTemplate {
  id: string;
  name: string;
  description: string;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    question: string;
    displayOrder: number;
    options: Array<{
      id: string;
      label: string;
      points: number;
      order: number;
    }>;
  }>;
}

interface Student {
  id: string;
  fullName: string;
  email: string;
}

export default function CreateTeacherFeedback() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { state } = useLocation();
  const studentNameFromState = state?.studentName || '';
  const cohortIdFromState = state?.cohortId || '';
  const semesterFromState = state?.semester || '';
  const assignedSubjectsFromState = state?.assignedSubjects || [];

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [starRating, setStarRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});

  // Fetch student details if not in state (fallback for page refresh)
  const { data: student, isLoading: studentLoading } = useQuery<Student>({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${studentId}`);
      return data.user || data;
    },
    enabled: !!studentId,
  });

  // Fetch enrollment context if missing from state
  const { data: enrollment } = useQuery({
    queryKey: ['student-enrollment-context', studentId],
    queryFn: async () => {
      const { data } = await api.get(`/enrollments?studentId=${studentId}&status=active`);
      // Return the most recent enrollment
      return Array.isArray(data) ? data[0] : null;
    },
    enabled: !!studentId && (!cohortIdFromState || !semesterFromState),
  });

  // Derived context
  const cohortId = cohortIdFromState || enrollment?.cohortId || '';
  const semester = Number(semesterFromState || enrollment?.semester || 0);
  const assignedSubjects = assignedSubjectsFromState.length > 0 
    ? assignedSubjectsFromState 
    : (enrollment?.cohort?.assignedSubjects || []); // Basic fallback

  // Fetch active templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<FeedbackTemplate[]>({
    queryKey: ['feedback-templates-active'],
    queryFn: async () => {
      const { data } = await api.get('/feedback-templates?isActive=true');
      return data.templates || [];
    },
  });

  // Get selected template details
  const template = templates.find((t) => t.id === selectedTemplate);

  // Create feedback mutation
  const createFeedback = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!selectedTemplate) {
        throw new Error('Please select a template');
      }

      const payload = {
        studentId,
        subjectId: selectedSubject,
        semester: semester,
        cohortId: cohortId,
        templateId: selectedTemplate,
        starRating: starRating || null,
        reviewText: reviewText || null,
        categoryRatings: Object.entries(categoryRatings).map(([categoryId, rating]) => ({
          categoryId,
          rating,
        })),
        status: isDraft ? 'DRAFT' : 'SUBMITTED',
      };

      await api.post('/teacher-feedback', payload);
    },
    onSuccess: (_, isDraft) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-feedback'] });
      toast({
        title: 'Success',
        description: isDraft
          ? 'Feedback saved as draft'
          : 'Feedback submitted successfully',
      });
      navigate('/feedback/teacher/assigned');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save feedback',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (isDraft: boolean = false) => {
    // Validation
    if (!selectedSubject) {
      toast({
        title: 'Validation Error',
        description: 'Please select a subject',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a feedback template',
        variant: 'destructive',
      });
      return;
    }

    if (!cohortId || !semester) {
      toast({
        title: 'Context Error',
        description: 'Student enrollment information is missing. Please go back and try again.',
        variant: 'destructive',
      });
      return;
    }

    if (!isDraft && template) {
      // Check if all categories are rated
      const missingCategories = template.categories.filter(
        (cat) => !categoryRatings[cat.id]
      );

      if (missingCategories.length > 0) {
        toast({
          title: 'Validation Error',
          description: `Please rate all categories before submitting`,
          variant: 'destructive',
        });
        return;
      }
    }

    createFeedback.mutate(isDraft);
  };

  if (!studentId) {
    navigate('/feedback/teacher/assigned');
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/feedback/teacher/assigned')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Give Feedback</h1>
              {student && (
                <p className="text-muted-foreground">For: {student.fullName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Student & Subject Info */}
        <Card>
          <CardHeader>
            <CardTitle>Context Information</CardTitle>
            <CardDescription>
              Details of the student and subject you are providing feedback for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Student</Label>
                <div className="font-medium text-lg">{studentNameFromState || student?.fullName || 'Loading...'}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Semester</Label>
                <div className="font-medium text-lg">{semester ? `Semester ${semester}` : 'N/A'}</div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="subject-select" className="text-base font-semibold">Select Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger id="subject-select" className="h-12 text-base">
                  <SelectValue placeholder="Which subject are you teaching this student?" />
                </SelectTrigger>
                <SelectContent>
                  {assignedSubjects.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                  {assignedSubjects.length === 0 && (
                     <SelectItem value="none" disabled>No subjects found for this context</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Template Selection */}
        {templatesLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No active feedback templates available
                </p>
                <p className="text-sm text-muted-foreground">
                  Please contact your administrator
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
                <CardDescription>
                  Choose a feedback template to use for this student
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplate === tmpl.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{tmpl.name}</h3>
                          {tmpl.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {tmpl.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {tmpl.categories.length} Categories
                            </Badge>
                          </div>
                        </div>
                        {selectedTemplate === tmpl.id && (
                          <div className="ml-2 flex-shrink-0">
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feedback Form */}
            {template && (
              <>
                {/* Overall Rating */}
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Rating (Optional)</CardTitle>
                    <CardDescription>
                      Give an overall star rating for the student
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setStarRating(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= (hoveredStar || starRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      {starRating > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground self-center">
                          {starRating} / 5 stars
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Category Ratings */}
                {template.categories
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((category) => (
                    <Card key={category.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            {category.description && (
                              <CardDescription className="mt-1">
                                {category.description}
                              </CardDescription>
                            )}
                          </div>
                          {categoryRatings[category.id] && (
                            <Badge>
                              {category.options.find((opt) => opt.points === categoryRatings[category.id])?.label || 
                               `${categoryRatings[category.id]} points`}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-4">{category.question}</p>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup
                          value={categoryRatings[category.id]?.toString() || ""}
                          onValueChange={(value) =>
                            setCategoryRatings({
                              ...categoryRatings,
                              [category.id]: parseInt(value),
                            })
                          }
                        >
                          <div className="space-y-3">
                            {category.options
                              .sort((a, b) => b.points - a.points)
                              .map((option) => (
                                <div
                                  key={option.id}
                                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                                >
                                  <RadioGroupItem
                                    value={option.points.toString()}
                                    id={option.id}
                                  />
                                  <Label
                                    htmlFor={option.id}
                                    className="flex-1 cursor-pointer flex items-center justify-between"
                                  >
                                    <span>{option.label}</span>
                                    <Badge variant="secondary" className="ml-2">
                                      {option.points} {option.points === 1 ? 'point' : 'points'}
                                    </Badge>
                                  </Label>
                                </div>
                              ))}
                          </div>
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  ))}

                {/* Overall Comment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Comments (Optional)</CardTitle>
                    <CardDescription>
                      Provide any additional feedback or observations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Write your detailed feedback here..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={5}
                    />
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/feedback/teacher/assigned')}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit(true)}
                    disabled={createFeedback.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleSubmit(false)}
                    disabled={createFeedback.isPending}
                  >
                    {createFeedback.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Submit Feedback
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
