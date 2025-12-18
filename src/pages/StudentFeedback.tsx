
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider'; // Primitive or custom
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare } from 'lucide-react';

export default function StudentFeedback() {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  
  // Form State
  const [rating, setRating] = useState(10);
  const [comment, setComment] = useState('');
  const [improvements, setImprovements] = useState<string[]>([]);

  // Fetch exams for feedback ? 
  // Actually we need to fetch 'Exams' that the student has taken/completed.
  // The 'filteredEnrollments' gives cohorts.
  // We need a list of exams the student participated in.
  // We can fetch '/api/exams' (as student) -> returns exams for my cohort?
  // Let's assume GET /api/exams returns available exams.
  
  const { data: exams, isLoading } = useQuery({
    queryKey: ['student-feedback-exams'],
    queryFn: async () => {
      const { data } = await api.get('/exams'); 
      // Filter for PUBLISHED exams only? Or ones marks are released for?
      // Usually feedback is after exam.
      return data.filter((e: any) => e.status === 'PUBLISHED');
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/feedback', data);
    },
    onSuccess: () => {
      toast({ title: 'Feedback Submitted', className: 'bg-green-500 text-white' });
      setFeedbackOpen(false);
      setRating(10);
      setComment('');
      setImprovements([]);
    },
    onError: (err: any) => {
        toast({ title: 'Error', description: err.response?.data?.message || 'Failed to submit', variant: 'destructive' });
    }
  });

  const handleOpenFeedback = (examId: string) => {
      setSelectedExamId(examId);
      setFeedbackOpen(true);
  };

  const handleSubmit = () => {
      if (!selectedExamId) return;
      submitMutation.mutate({
          examId: selectedExamId,
          rating,
          improvements, 
          comment
      });
  };

  const toggleImprovement = (tag: string) => {
      if (improvements.includes(tag)) {
          setImprovements(improvements.filter(t => t !== tag));
      } else {
          setImprovements([...improvements, tag]);
      }
  };

  const predefinedTags = [
      'Questions were unclear',
      'Time was insufficient',
      'Evaluation was strict',
      'Syllabus not covered',
      'Too difficult'
  ];

  return (
    <AuthenticatedLayout allowedRoles={['student']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Exam Feedback</h2>
          <p className="text-muted-foreground">Share your thoughts on completed exams to help us improve.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
                <div>Loading exams...</div>
            ) : exams?.map((exam: any) => (
                <Card key={exam.id}>
                    <CardHeader>
                        <CardTitle className="text-lg">{exam.name}</CardTitle>
                        <CardDescription>{exam.subject?.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-4">
                            <Badge variant="outline">{exam.type}</Badge>
                            <span className="text-sm text-muted-foreground">{new Date(exam.date).toLocaleDateString()}</span>
                        </div>
                        <Button className="w-full" onClick={() => handleOpenFeedback(exam.id)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Give Feedback
                        </Button>
                    </CardContent>
                </Card>
            ))}
            {exams?.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No exams available for feedback.</p>}
        </div>

        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Submit Feedback</DialogTitle>
                    <DialogDescription>Rate your experience for this exam.</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Rating (1-10)</Label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                value={rating} 
                                onChange={(e) => setRating(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xl font-bold w-8 text-center">{rating}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                            <span>Poor</span>
                            <span>Excellent</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Areas for Improvement</Label>
                        <div className="flex flex-wrap gap-2">
                            {predefinedTags.map(tag => (
                                <Badge 
                                    key={tag} 
                                    variant={improvements.includes(tag) ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => toggleImprovement(tag)}
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Comments (Optional)</Label>
                        <Textarea 
                            placeholder="Detailed feedback..." 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitMutation.isPending}>Submit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
