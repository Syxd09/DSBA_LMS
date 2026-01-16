import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Power, Eye } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface FeedbackTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  department?: { id: string; name: string };
  program?: { id: string; name: string };
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
  createdAt: string;
}

export default function ViewFeedbackTemplate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch template
  const { data: template, isLoading } = useQuery<FeedbackTemplate>({
    queryKey: ['feedback-template', id],
    queryFn: async () => {
      const { data } = await api.get(`/feedback/templates/${id}`);
      return data;
    },
    enabled: !!id,
  });

  // Toggle status mutation
  const toggleStatus = useMutation({
    mutationFn: async (isActive: boolean) => {
      await api.patch(`/feedback/templates/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-template', id] });
      queryClient.invalidateQueries({ queryKey: ['feedback-templates'] });
      toast({
        title: 'Success',
        description: 'Template status updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update template',
        variant: 'destructive',
      });
    },
  });

  if (!id) {
    navigate('/feedback/templates');
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
              onClick={() => navigate('/feedback/templates')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
          </div>
          {template && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/feedback/templates/${id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => toggleStatus.mutate(!template.isActive)}
                disabled={toggleStatus.isPending}
              >
                <Power className="mr-2 h-4 w-4" />
                {template.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !template ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground">Template not found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Template Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {template.isDefault && <Badge variant="outline">Default</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {template.department && (
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium">{template.department.name}</p>
                    </div>
                  )}
                  {template.program && (
                    <div>
                      <p className="text-sm text-muted-foreground">Program</p>
                      <p className="font-medium">{template.program.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="font-medium">{template.categories.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Categories</h2>
              {template.categories
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((category, index) => (
                  <Card key={category.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {index + 1}. {category.name}
                          </CardTitle>
                          {category.description && (
                            <CardDescription className="mt-1">
                              {category.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-medium mt-3 text-muted-foreground">
                        Question:
                      </p>
                      <p className="text-sm">{category.question}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium mb-3">Options:</p>
                      <div className="space-y-2">
                        {category.options
                          .sort((a, b) => b.points - a.points)
                          .map((option) => (
                            <div
                              key={option.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <span>{option.label}</span>
                              <Badge variant="secondary">
                                {option.points} {option.points === 1 ? 'point' : 'points'}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
