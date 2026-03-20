import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquareQuote, Star, User, GraduationCap, BookOpen, Download } from 'lucide-react';
import api from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface FeedbackResult {
  id: string;
  student: { id: string; fullName: string; email: string };
  teacher: { id: string; fullName: string };
  subject: { name: string; code: string };
  semester: number;
  starRating: number | null;
  reviewText: string | null;
  createdAt: string;
  categoryRatings: Array<{
    id: string;
    rating: number;
    category: { name: string; displayOrder: number };
  }>;
}

export default function TemplateResults() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch template info
  const { data: template } = useQuery({
    queryKey: ['feedback-template', templateId],
    queryFn: async () => {
      const { data } = await api.get(`/feedback-templates/${templateId}`);
      return data;
    },
  });

  // Fetch all feedback for this template
  const { data: feedbackResponse, isLoading } = useQuery({
    queryKey: ['template-feedback', templateId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher-feedback/template/${templateId}`);
      return data;
    },
  });

  const feedbacks: FeedbackResult[] = feedbackResponse?.feedbacks || [];

  const handleDownload = async () => {
    try {
      const response = await api.get(`/teacher-feedback/template/${templateId}/export`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feedback_report_${template?.name?.replace(/\s+/g, '_') || 'template'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: 'Success',
        description: 'Feedback report downloaded successfully',
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod']}>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/feedback/templates')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Template Results</h1>
              <p className="text-muted-foreground">
                {template?.name || 'Loading template...'} - Student-wise feedback analysis
              </p>
            </div>
          </div>
          <Button 
            onClick={handleDownload} 
            disabled={feedbacks.length === 0}
            className="md:w-auto w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report (CSV)
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <MessageSquareQuote className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h2 className="text-xl font-semibold">No feedback data yet</h2>
              <p className="text-muted-foreground mt-2">
                No students have received feedback using this template yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {/* Template Summary Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{feedbacks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unique Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{new Set(feedbacks.map(f => f.student.id)).size}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Overall Rating</CardTitle>
                </CardHeader>
                <CardContent className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {(feedbacks.reduce((acc, f) => acc + (f.starRating || 0), 0) / feedbacks.filter(f => f.starRating).length || 0).toFixed(1)}
                  </p>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </CardContent>
              </Card>
            </div>

            {/* Individual Student Feedback List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Student-wise Details</h2>
              {feedbacks.map((feedback) => (
                <Card key={feedback.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{feedback.student.fullName}</CardTitle>
                          <CardDescription>{feedback.student.email}</CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {feedback.subject.name} ({feedback.subject.code})
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          Sem {feedback.semester}
                        </Badge>
                        <Badge variant="secondary">By {feedback.teacher.fullName}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Category Ratings */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {feedback.categoryRatings
                        .sort((a, b) => a.category.displayOrder - b.category.displayOrder)
                        .map((rating) => (
                          <div key={rating.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium truncate mr-2">{rating.category.name}</span>
                              <span className="font-bold">{rating.rating}/5</span>
                            </div>
                            <Progress value={rating.rating * 20} className="h-1.5" />
                          </div>
                      ))}
                    </div>

                    {/* Review Text */}
                    {feedback.reviewText && (
                      <div className="mt-4 p-3 bg-accent/30 rounded-lg text-sm italic relative">
                         <MessageSquareQuote className="h-4 w-4 absolute -top-2 -left-2 text-primary opacity-50" />
                        "{feedback.reviewText}"
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
                       <span>Submitted on {new Date(feedback.createdAt).toLocaleDateString()}</span>
                       {feedback.starRating && (
                         <div className="flex gap-0.5">
                           {[1, 2, 3, 4, 5].map(s => (
                             <Star key={s} className={`h-3 w-3 ${s <= feedback.starRating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                           ))}
                         </div>
                       )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
