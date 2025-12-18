import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Building2, Plus, Users, BookOpen, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  code: string;
  hodId: string | null;
  createdAt: string;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({ title: 'Error', description: 'Failed to fetch departments.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDeptName('');
    setDeptCode('');
    setIsEditMode(false);
    setEditingDept(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setEditingDept(dept);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (dept: Department) => {
    setDeletingDept(dept);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!deptName || !deptCode) {
      toast({ title: 'Validation Error', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && editingDept) {
        await api.put(`/departments/${editingDept.id}`, {
          name: deptName,
          code: deptCode.toUpperCase(),
        });
        toast({ title: 'Department updated', description: `${deptName} has been updated.` });
      } else {
        await api.post('/departments', {
          name: deptName,
          code: deptCode.toUpperCase(),
        });
        toast({ title: 'Department created', description: `${deptName} has been created.` });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Operation failed.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    
    setIsSubmitting(true);
    try {
      await api.delete(`/departments/${deletingDept.id}`);
      toast({ title: 'Department deleted', description: `${deletingDept.name} has been deleted.` });
      setDeleteDialogOpen(false);
      setDeletingDept(null);
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete department.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Departments</h2>
            <p className="text-muted-foreground">Manage college departments</p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Department' : 'Create New Department'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update the department details below.' : 'Enter the details for the new department.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Department Name</Label>
                <Input
                  id="dept-name"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-code">Department Code</Label>
                <Input
                  id="dept-code"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="e.g., CS"
                />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  isEditMode ? 'Update Department' : 'Create Department'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Department"
          description={`This will permanently delete "${deletingDept?.name}" and all associated data. This action cannot be undone.`}
          confirmText={deletingDept?.code || ''}
          onConfirm={handleDelete}
          isLoading={isSubmitting}
        />

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
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{dept.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(dept)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleOpenDelete(dept)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Faculty Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>Programs</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.location.href = '/programs'}>
                      View Programs
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.location.href = '/users'}>
                      Manage Staff
                    </Button>
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
