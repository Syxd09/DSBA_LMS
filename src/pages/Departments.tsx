import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { departmentsApi, usersApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Building2, Plus, Loader2, Edit, Trash2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  code: string;
  hod_id: string | null;
  created_at: string;
  hod?: { full_name: string };
}

export default function Departments() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', hod_id: '' });

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const { data: hodCandidates = [] } = useQuery({
    queryKey: ['users', 'hod'],
    queryFn: () => usersApi.list({ role: 'hod' }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; code: string; hod_id?: string }) =>
      departmentsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Department created successfully' });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', code: '', hod_id: '' });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating department',
        description: error.response?.data?.detail || 'Failed to create department',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string; hod_id?: string } }) =>
      departmentsApi.update(id, data),
    onSuccess: () => {
      toast({ title: 'Department updated successfully' });
      setIsEditDialogOpen(false);
      setSelectedDepartment(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating department',
        description: error.response?.data?.detail || 'Failed to update department',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Department deleted' });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting department',
        description: error.response?.data?.detail || 'Failed to delete department',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.code) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      name: formData.name,
      code: formData.code.toUpperCase(),
      hod_id: formData.hod_id || undefined,
    });
  };

  const handleEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setFormData({ name: dept.name, code: dept.code, hod_id: dept.hod_id || '' });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedDepartment) return;
    updateMutation.mutate({
      id: selectedDepartment.id,
      data: {
        name: formData.name,
        code: formData.code.toUpperCase(),
        hod_id: formData.hod_id || undefined,
      },
    });
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Departments</h2>
            <p className="text-muted-foreground">Manage academic departments</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Department Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., CS"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Head of Department</Label>
                  <Select
                    value={formData.hod_id || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, hod_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select HOD (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {hodCandidates.map((user: any) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Department
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : departments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No departments yet</h3>
              <p className="text-muted-foreground mb-4">Create your first department to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept: Department) => (
              <Card key={dept.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">{dept.code}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(dept)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(dept.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>HOD: {dept.hod?.full_name || 'Not assigned'}</span>
                    </div>
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
              <DialogTitle>Edit Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Head of Department</Label>
                <Select
                  value={formData.hod_id || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, hod_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select HOD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {hodCandidates.map((user: any) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title="Delete Department"
          description="Are you sure you want to delete this department? This will also affect all programs and cohorts under it."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </AuthenticatedLayout>
  );
}
