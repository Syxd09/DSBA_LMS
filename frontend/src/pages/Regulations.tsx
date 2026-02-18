import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { regulationsApi, Regulation, RegulationCreate } from '@/services/regulationsService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, BookOpen, Scale, ArrowRight, Settings as SettingsIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Regulations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Default form Data
  const [formData, setFormData] = useState<Partial<RegulationCreate>>({
    name: '',
    code: '',
    year: new Date().getFullYear(),
    bloom_version: 'revised',
    internal_weightage: 40,
    external_weightage: 60,
  });

  const { data: regulations = [], isLoading } = useQuery({
    queryKey: ['regulations'],
    queryFn: () => regulationsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: RegulationCreate) => regulationsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Regulation created successfully' });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['regulations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating regulation',
        description: error.response?.data?.detail || 'Failed to create regulation',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.code || !formData.year) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if ((formData.internal_weightage || 0) + (formData.external_weightage || 0) !== 100) {
      toast({ title: 'Weightages must sum to 100', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      ...formData,
      // college_id handled by backend default
    } as RegulationCreate);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Academic Regulations</h2>
            <p className="text-muted-foreground">Manage academic rules, grading policies, and curriculum structures</p>
          </div>
          
          {(user?.role === 'principal') && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Regulation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Regulation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label>Name *</Label>
                       <Input 
                         placeholder="e.g. R25" 
                         value={formData.name}
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <Label>Short Code *</Label>
                       <Input 
                         placeholder="e.g. R25" 
                         value={formData.code}
                         onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                       />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Academic Year *</Label>
                    <Select 
                      value={formData.year?.toString()} 
                      onValueChange={(v) => setFormData({...formData, year: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label>Internal %</Label>
                       <Input 
                         type="number"
                         value={formData.internal_weightage}
                         onChange={(e) => setFormData({
                           ...formData, 
                           internal_weightage: parseInt(e.target.value),
                           external_weightage: 100 - parseInt(e.target.value)
                         })}
                       />
                    </div>
                    <div className="space-y-2">
                       <Label>External %</Label>
                       <Input 
                         type="number"
                         value={formData.external_weightage}
                         disabled
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bloom's Taxonomy</Label>
                    <Select 
                      value={formData.bloom_version} 
                      onValueChange={(v) => setFormData({...formData, bloom_version: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revised">Revised (Remember, Understand...)</SelectItem>
                        <SelectItem value="old">Old (Knowledge, Comprehension...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Regulation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : regulations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No regulations defined</h3>
              <p className="text-muted-foreground mb-4">
                Regulations define the academic rules for batches.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regulations.map((reg: Regulation) => (
              <Card key={reg.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/regulations/${reg.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded">
                        <Scale className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{reg.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{reg.year}</Badge>
                          {reg.is_active && <Badge className="bg-green-600">Active</Badge>}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 p-2 rounded">
                        <p className="text-xs text-muted-foreground">Internal</p>
                        <p className="font-medium">{reg.internal_weightage}%</p>
                      </div>
                      <div className="bg-muted/50 p-2 rounded">
                        <p className="text-xs text-muted-foreground">External</p>
                        <p className="font-medium">{reg.external_weightage}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                      <BookOpen className="w-4 h-4" />
                      <span>Configure Curriculum</span>
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
