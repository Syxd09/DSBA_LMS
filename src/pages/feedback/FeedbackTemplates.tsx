import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, Power, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    question: string;
    displayOrder: number;
  }>;
  createdAt: string;
}

export default function FeedbackTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<FeedbackTemplate[]>({
    queryKey: ['feedback-templates'],
    queryFn: async () => {
      const { data } = await api.get('/feedback/templates');
      return data.templates || [];
    },
  });

  // Toggle template status
  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/feedback/templates/${id}/status`, { isActive });
    },
    onSuccess: () => {
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

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feedback Templates</h1>
            <p className="text-muted-foreground">
              Manage category-based feedback templates for qualitative assessment
            </p>
          </div>
          <Button onClick={() => navigate('/feedback/templates/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No feedback templates found</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first template to start collecting qualitative feedback
                </p>
                <Button onClick={() => navigate('/feedback/templates/create')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {template.isDefault && (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Scope */}
                    {(template.department || template.program) && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Scope:</p>
                        <div className="flex gap-2 mt-1">
                          {template.department && (
                            <Badge variant="outline">{template.department.name}</Badge>
                          )}
                          {template.program && (
                            <Badge variant="outline">{template.program.name}</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Categories */}
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        {template.categories.length} {template.categories.length === 1 ? 'Category' : 'Categories'}
                      </p>
                      {template.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {template.categories.slice(0, 3).map((cat) => (
                            <Badge key={cat.id} variant="secondary" className="text-xs">
                              {cat.name}
                            </Badge>
                          ))}
                          {template.categories.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.categories.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/feedback/templates/${template.id}`)}
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/feedback/templates/${template.id}/edit`)}
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleStatus.mutate({
                            id: template.id,
                            isActive: !template.isActive,
                          })
                        }
                        disabled={toggleStatus.isPending}
                      >
                        <Power className="mr-2 h-3 w-3" />
                        {template.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
