import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { cohortsApi, programsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Users, Plus, Loader2, Edit, Trash2, BookOpen, ArrowUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Cohort {
  id: string;
  program_id: string;
  year: number;
  name: string;
  current_semester: number;
  created_at: string;
  program?: { name: string; code: string };
}

export default function Cohorts() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [programFilter, setProgramFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    program_id: '',
    current_semester: 1,
  });

  const { data: cohorts = [], isLoading } = useQuery({
    queryKey: ['cohorts', programFilter],
    queryFn: () => cohortsApi.list(programFilter !== 'all' ? { program_id: programFilter } : undefined),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { program_id: string; year: number; name: string; current_semester: number }) =>
      cohortsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Cohort created successfully' });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', year: new Date().getFullYear(), program_id: '', current_semester: 1 });
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating cohort',
        description: error.response?.data?.detail || 'Failed to create cohort',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; current_semester?: number } }) =>
      cohortsApi.update(id, data),
    onSuccess: () => {
      toast({ title: 'Cohort updated successfully' });
      setIsEditDialogOpen(false);
      setSelectedCohort(null);
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating cohort',
        description: error.response?.data?.detail || 'Failed to update cohort',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cohortsApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Cohort deleted' });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting cohort',
        description: error.response?.data?.detail || 'Failed to delete cohort',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.program_id) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setFormData({
      name: cohort.name,
      year: cohort.year,
      program_id: cohort.program_id,
      current_semester: cohort.current_semester,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedCohort) return;
    updateMutation.mutate({
      id: selectedCohort.id,
      data: {
        name: formData.name,
        current_semester: formData.current_semester,
      },
    });
  };

  const handleAdvanceSemester = (cohort: Cohort) => {
    if (cohort.current_semester >= 8) {
      toast({ title: 'Already at maximum semester', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: cohort.id,
      data: { current_semester: cohort.current_semester + 1 },
    });
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Cohorts</h2>
            <p className="text-muted-foreground">Manage student batches and cohorts</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Cohort
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Cohort</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Cohort Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., BCA 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select
                    value={formData.program_id}
                    onValueChange={(v) => setFormData({ ...formData, program_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program: any) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.code} - {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Year</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      min={2020}
                      max={2030}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Semester</Label>
                    <Input
                      type="number"
                      value={formData.current_semester}
                      onChange={(e) => setFormData({ ...formData, current_semester: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={8}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Cohort
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program: any) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : cohorts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No cohorts yet</h3>
              <p className="text-muted-foreground mb-4">Create your first cohort to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Cohort
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cohorts.map((cohort: Cohort) => (
              <Card key={cohort.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cohort.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Batch {cohort.year}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cohort)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(cohort.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Semester</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Sem {cohort.current_semester}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleAdvanceSemester(cohort)}
                          disabled={cohort.current_semester >= 8}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {cohort.program && (
                      <p className="text-sm text-muted-foreground">{cohort.program.name}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Students</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>Exams</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/student-enrollments?cohort=${cohort.id}`)}
                    >
                      Manage Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Cohort</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cohort Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Current Semester</Label>
                <Input
                  type="number"
                  value={formData.current_semester}
                  onChange={(e) => setFormData({ ...formData, current_semester: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={8}
                />
              </div>
              <Button className="w-full" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Cohort
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title="Delete Cohort"
          description="Are you sure you want to delete this cohort? This will also affect all enrollments and exams."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </AuthenticatedLayout>
  );
}
