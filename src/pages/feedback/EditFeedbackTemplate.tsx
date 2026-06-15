import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CategoryOption {
  id?: string;
  label: string;
  points: number;
  order: number;
}

interface Category {
  id?: string;
  name: string;
  description: string;
  question: string;
  displayOrder: number;
  options: CategoryOption[];
}

const t = {
  editFeedbackTemplate: "Edit Feedback Template",
  modifyDescription: "Modify template details, categories, and rating options",
  cancel: "Cancel",
  saveChanges: "Save Changes",
  saving: "Saving...",
  templateDetails: "Template Details",
  basicInformation: "Basic information about the feedback template",
  templateNameRequired: "Template Name *",
  descriptionOptional: "Description (Optional)",
  categories: "Categories",
  defineRatingCategories: "Define rating categories with questions (NO weights - only option points)",
  addCategory: "Add Category",
  categoryPrefix: "Category ",
  categoryNameRequired: "Category Name *",
  questionRequired: "Question *",
  questionTooltip: "This question will be shown to teachers when giving feedback",
  defaultOptions: "Default Options:",
  scaleTooltip: "Standard 5-point scale (customizable after creation)",
  errorLoading: "Error loading template details",
  backToTemplates: "Back to Templates",
};

export default function EditFeedbackTemplate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch template data
  const { data: template, isLoading, error } = useQuery({
    queryKey: ['feedback-template', id],
    queryFn: async () => {
      const { data } = await api.get(`/feedback-templates/${id}`);
      return data;
    },
    enabled: !!id,
  });

  // Populate data when loaded
  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      const formattedCategories = (template.categories || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name || '',
        description: cat.description || '',
        question: cat.question || '',
        displayOrder: cat.displayOrder,
        options: (cat.options || []).map((opt: any) => ({
          id: opt.id,
          label: opt.label || '',
          points: opt.points || 0,
          order: opt.order || 0,
        })).sort((a: any, b: any) => a.order - b.order),
      })).sort((a: any, b: any) => a.displayOrder - b.displayOrder);
      
      setCategories(formattedCategories);
    }
  }, [template]);

  const addCategory = () => {
    setCategories([
      ...categories,
      {
        name: '',
        description: '',
        question: '',
        displayOrder: categories.length,
        options: [
          { label: 'Excellent', points: 5, order: 0 },
          { label: 'Very Good', points: 4, order: 1 },
          { label: 'Good', points: 3, order: 2 },
          { label: 'Fair', points: 2, order: 3 },
          { label: 'Poor', points: 1, order: 4 },
        ],
      },
    ]);
  };

  const removeCategory = (index: number) => {
    setCategories(prev => {
      const remaining = prev.filter((_, i) => i !== index);
      return remaining.map((cat, i) => ({
        ...cat,
        displayOrder: i
      }));
    });
  };

  const updateCategory = (index: number, field: keyof Category, value: any) => {
    const allowedFields: Array<keyof Category> = ['name', 'description', 'question', 'displayOrder', 'options'];
    if (!allowedFields.includes(field)) return;

    setCategories(prev => prev.map((cat, idx) => {
      if (idx !== index) return cat;
      const updated = { ...cat };
      if (field === 'name') updated.name = value;
      else if (field === 'description') updated.description = value;
      else if (field === 'question') updated.question = value;
      else if (field === 'displayOrder') updated.displayOrder = value;
      else if (field === 'options') updated.options = value;
      return updated;
    }));
  };

  const addOption = (categoryIndex: number) => {
    setCategories(prev => prev.map((cat, idx) => {
      if (idx !== categoryIndex) return cat;
      return {
        ...cat,
        options: [
          ...cat.options,
          { label: '', points: 1, order: cat.options.length }
        ]
      };
    }));
  };

  const removeOption = (categoryIndex: number, optionIndex: number) => {
    setCategories(prev => prev.map((cat, idx) => {
      if (idx !== categoryIndex) return cat;
      return {
        ...cat,
        options: cat.options.filter((_, i) => i !== optionIndex)
      };
    }));
  };

  const updateOption = (
    categoryIndex: number,
    optionIndex: number,
    field: keyof CategoryOption,
    value: any
  ) => {
    const allowedFields: Array<keyof CategoryOption> = ['label', 'points', 'order', 'id'];
    if (!allowedFields.includes(field)) return;

    setCategories(prev => prev.map((cat, catIdx) => {
      if (catIdx !== categoryIndex) return cat;
      return {
        ...cat,
        options: cat.options.map((opt, optIdx) => {
          if (optIdx !== optionIndex) return opt;
          const updatedOpt = { ...opt };
          if (field === 'label') updatedOpt.label = value;
          else if (field === 'points') updatedOpt.points = value;
          else if (field === 'order') updatedOpt.order = value;
          else if (field === 'id') updatedOpt.id = value;
          return updatedOpt;
        })
      };
    }));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/feedback-templates/${id}`, {
        name,
        description,
        categories: categories.map((cat, idx) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          question: cat.question,
          displayOrder: idx,
          options: cat.options.map((opt: any, optIdx: number) => ({
            id: opt.id,
            label: opt.label,
            points: Number(opt.points),
            order: optIdx,
          })),
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-templates'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-template', id] });
      toast({
        title: 'Success',
        description: 'Feedback template updated successfully',
      });
      navigate('/feedback/templates');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update template',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }

    if (categories.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one category is required',
        variant: 'destructive',
      });
      return;
    }

    for (const cat of categories) {
      if (!cat.name.trim() || !cat.question.trim()) {
        toast({
          title: 'Validation Error',
          description: 'All categories must have a name and question',
          variant: 'destructive',
        });
        return;
      }
    }

    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="max-w-md mx-auto py-12 text-center">
          <p className="text-destructive mb-4">{t.errorLoading}</p>
          <Button onClick={() => navigate('/feedback/templates')}>{t.backToTemplates}</Button>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/feedback/templates')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t.editFeedbackTemplate}</h1>
              <p className="text-muted-foreground">
                {t.modifyDescription}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/feedback/templates')}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? t.saving : t.saveChanges}
            </Button>
          </div>
        </div>

        {/* Template Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t.templateDetails}</CardTitle>
            <CardDescription>{t.basicInformation}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.templateNameRequired}</Label>
              <Input
                id="name"
                placeholder="e.g., BCA Semester 1 Feedback"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t.descriptionOptional}</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this template's purpose"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">{t.categories}</h2>
              <p className="text-sm text-muted-foreground">
                {t.defineRatingCategories}
              </p>
            </div>
            <Button type="button" onClick={addCategory} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              {t.addCategory}
            </Button>
          </div>

          {categories.map((category, catIndex) => (
            <Card key={catIndex}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <CardTitle className="text-lg">
                      {t.categoryPrefix}{catIndex + 1}
                    </CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(catIndex)}
                    disabled={categories.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t.categoryNameRequired}</Label>
                    <Input
                      placeholder="e.g., Communication"
                      value={category.name}
                      onChange={(e) =>
                        updateCategory(catIndex, 'name', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.descriptionOptional}</Label>
                    <Input
                      placeholder="e.g., Student communication skills"
                      value={category.description}
                      onChange={(e) =>
                        updateCategory(catIndex, 'description', e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.questionRequired}</Label>
                  <Textarea
                    placeholder="e.g., How would you rate the student's communication skills?"
                    value={category.question}
                    onChange={(e) =>
                      updateCategory(catIndex, 'question', e.target.value)
                    }
                    rows={2}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.questionTooltip}
                  </p>
                </div>

                {/* Options list */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t.defaultOptions}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {category.options.map((opt, i) => (
                      <div key={i} className="text-xs text-center">
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-muted-foreground">{opt.points} pts</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t.scaleTooltip}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/feedback/templates')}
          >
            {t.cancel}
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? t.saving : t.saveChanges}
          </Button>
        </div>
      </form>
    </AuthenticatedLayout>
  );
}
