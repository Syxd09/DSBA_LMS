import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Search, Plus, Users, Loader2, Calendar, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Cohort {
  id: string;
  name: string;
  year: number;
  currentSemester: number;
  programId: string;
  createdAt: string;
  program?: { id: string; name: string; code: string; durationYears: number };
}

interface Program {
  id: string;
  name: string;
  code: string;
  durationYears: number;
}

export default function Cohorts() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCohort, setDeletingCohort] = useState<Cohort | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    programId: '',
    currentSemester: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cohortsRes, programsRes] = await Promise.all([
        api.get('/cohorts'),
        api.get('/programs'),
      ]);
      setCohorts(cohortsRes.data || []);
      setPrograms(programsRes.data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch cohorts.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', year: new Date().getFullYear(), programId: '', currentSemester: 1 });
    setIsEditMode(false);
    setEditingCohort(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cohort: Cohort) => {
    setFormData({
      name: cohort.name,
      year: cohort.year,
      programId: cohort.programId,
      currentSemester: cohort.currentSemester,
    });
    setEditingCohort(cohort);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (cohort: Cohort) => {
    setDeletingCohort(cohort);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.programId) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && editingCohort) {
        await api.put(`/cohorts/${editingCohort.id}`, formData);
        toast({ title: 'Cohort updated', description: `${formData.name} has been updated.` });
      } else {
        await api.post('/cohorts', formData);
        toast({ title: 'Cohort created', description: `${formData.name} has been created.` });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Operation failed.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCohort) return;
    
    setIsSubmitting(true);
    try {
      await api.delete(`/cohorts/${deletingCohort.id}`);
      toast({ title: 'Cohort deleted', description: `${deletingCohort.name} has been removed.` });
      setDeleteDialogOpen(false);
      setDeletingCohort(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete cohort.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCohorts = cohorts.filter(cohort =>
    cohort.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cohort.program?.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Cohorts</h2>
            <p className="text-muted-foreground">Manage student batches and cohorts</p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Cohort
          </Button>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Cohort' : 'Create New Cohort'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update the cohort details.' : 'Enter the details for the new student cohort.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cohort Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., BCA 2024-27"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Admission Year</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    min={2000}
                    max={2100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select value={formData.programId} onValueChange={(value) => setFormData({ ...formData, programId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.code} - {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isEditMode && (
                <div className="space-y-2">
                  <Label>Current Semester</Label>
                  <Input
                    type="number"
                    value={formData.currentSemester}
                    onChange={(e) => setFormData({ ...formData, currentSemester: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={12}
                  />
                </div>
              )}
              <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (isEditMode ? 'Update Cohort' : 'Create Cohort')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Cohort"
          description={`This will permanently delete "${deletingCohort?.name}" and all associated enrollments.`}
          confirmText={deletingCohort?.name || ''}
          onConfirm={handleDelete}
          isLoading={isSubmitting}
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cohorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCohorts.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No cohorts found</h3>
              <p className="text-muted-foreground">Create your first cohort to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Admission Year</TableHead>
                  <TableHead>Current Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCohorts.map((cohort) => {
                  const maxSemester = (cohort.program?.durationYears || 3) * 2;
                  const isActive = cohort.currentSemester <= maxSemester;
                  return (
                    <TableRow key={cohort.id}>
                      <TableCell className="font-medium">{cohort.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cohort.program?.code || '—'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {cohort.year}
                        </div>
                      </TableCell>
                      <TableCell>Semester {cohort.currentSemester}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isActive ? 'Active' : 'Completed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(cohort)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleOpenDelete(cohort)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/student-enrollments'}>
                            Students
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
