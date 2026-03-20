import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CategoryOption {
  label: string;
  points: number;
  order: number;
}

interface Category {
  name: string;
  description: string;
  question: string;
  displayOrder: number;
  options: CategoryOption[];
}

export default function CreateFeedbackTemplate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([
    {
      name: 'Communication',
      description: 'Student communication skills',
      question: 'How would you rate the student\'s communication skills?',
      displayOrder: 0,
      options: [
        { label: 'Excellent', points: 5, order: 0 },
        { label: 'Very Good', points: 4, order: 1 },
        { label: 'Good', points: 3, order: 2 },
        { label: 'Fair', points: 2, order: 3 },
        { label: 'Poor', points: 1, order: 4 },
      ],
    },
  ]);

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
    const remaining = categories.filter((_, i) => i !== index);
    // Re-index displayOrder to maintain consistency and avoid unique constraint violations in DB
    const reindexed = remaining.map((cat, i) => ({
      ...cat,
      displayOrder: i
    }));
    setCategories(reindexed);
  };

  const updateCategory = (index: number, field: keyof Category, value: any) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const addOption = (categoryIndex: number) => {
    const updated = [...categories];
    const category = updated[categoryIndex];
    category.options.push({
      label: '',
      points: 1,
      order: category.options.length,
    });
    setCategories(updated);
  };

  const removeOption = (categoryIndex: number, optionIndex: number) => {
    const updated = [...categories];
    updated[categoryIndex].options = updated[categoryIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setCategories(updated);
  };

  const updateOption = (
    categoryIndex: number,
    optionIndex: number,
    field: keyof CategoryOption,
    value: any
  ) => {
    const updated = [...categories];
    updated[categoryIndex].options[optionIndex] = {
      ...updated[categoryIndex].options[optionIndex],
      [field]: value,
    };
    setCategories(updated);
  };

  const createTemplate = useMutation({
    mutationFn: async () => {
      await api.post('/feedback-templates', {
        name,
        description,
        categories: categories.map((cat) => ({
          name: cat.name,
          description: cat.description,
          question: cat.question,
          displayOrder: cat.displayOrder,
          options: cat.options.map((opt) => ({
            label: opt.label,
            points: opt.points,
            order: opt.order,
          })),
        })),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Feedback template created successfully',
      });
      navigate('/feedback/templates');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create template',
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

    createTemplate.mutate();
  };

  return (
    <AuthenticatedLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Feedback Template</h1>
            <p className="text-muted-foreground">
              Build a category-based template with questions and rating options
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/feedback/templates')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createTemplate.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>

        {/* Template Details */}
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>Basic information about the feedback template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., BCA Semester 1 Feedback"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
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
              <h2 className="text-2xl font-semibold">Categories</h2>
              <p className="text-sm text-muted-foreground">
                Define rating categories with questions (NO weights - only option points)
              </p>
            </div>
            <Button type="button" onClick={addCategory} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          {categories.map((category, catIndex) => (
            <Card key={catIndex}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <CardTitle className="text-lg">
                      Category {catIndex + 1}
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
                    <Label>Category Name *</Label>
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
                    <Label>Description (Optional)</Label>
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
                  <Label>Question *</Label>
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
                    This question will be shown to teachers when giving feedback
                  </p>
                </div>

                {/* Note about options */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Default Options:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {category.options.map((opt, i) => (
                      <div key={i} className="text-xs text-center">
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-muted-foreground">{opt.points} pts</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Standard 5-point scale (customizable after creation)
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
            Cancel
          </Button>
          <Button type="submit" disabled={createTemplate.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createTemplate.isPending ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </form>
    </AuthenticatedLayout>
  );
}
