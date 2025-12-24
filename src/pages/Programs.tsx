import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { BookCheck, BookOpen, FileText, GraduationCap, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Program {
  id: string;
  name: string;
  code: string;
  durationYears: number;
  departmentId: string | null;
  createdAt: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface CurriculumVersion {
  id: string;
  programId: string;
  versionName: string;
  effectiveFrom: number;
  isActive: boolean;
  program?: { name: string; code: string };
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCurriculumDialogOpen, setIsCurriculumDialogOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: '',
    code: '',
    durationYears: 3,
    departmentId: '',
  });
  const [newCurriculum, setNewCurriculum] = useState({
    programId: '',
    versionName: '',
    effectiveFrom: new Date().getFullYear(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit/Delete states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);

  // Fetch curriculum versions
  const { data: curriculumVersions = [], refetch: refetchCurriculums } = useQuery({
    queryKey: ['curriculum-versions'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/curriculum-versions');
        return data || [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [programsRes, departmentsRes] = await Promise.all([
        api.get('/programs'),
        api.get('/departments'),
      ]);

      setPrograms(programsRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch programs.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!newProgram.name || !newProgram.code || !newProgram.departmentId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/programs', {
        name: newProgram.name,
        code: newProgram.code.toUpperCase(),
        durationYears: newProgram.durationYears,
        departmentId: newProgram.departmentId,
      });

      toast({
        title: 'Program created',
        description: `${newProgram.name} has been created successfully.`,
      });

      setIsDialogOpen(false);
      setNewProgram({ name: '', code: '', durationYears: 3, departmentId: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating program:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create program.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (program: Program) => {
    setNewProgram({
      name: program.name,
      code: program.code,
      durationYears: program.durationYears,
      departmentId: program.departmentId || '',
    });
    setEditingProgram(program);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (program: Program) => {
    setDeletingProgram(program);
    setDeleteDialogOpen(true);
  };

  const handleUpdateProgram = async () => {
    if (!newProgram.name || !newProgram.code || !newProgram.departmentId) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/programs/${editingProgram?.id}`, newProgram);
      toast({ title: 'Program updated', description: `${newProgram.name} has been updated.` });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update program.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;
    
    setIsSubmitting(true);
    try {
      await api.delete(`/programs/${deletingProgram.id}`);
      toast({ title: 'Program deleted', description: `${deletingProgram.name} has been removed.` });
      setDeleteDialogOpen(false);
      setDeletingProgram(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete program.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewProgram({ name: '', code: '', durationYears: 3, departmentId: '' });
    setIsEditMode(false);
    setEditingProgram(null);
  };

  const handleCreateCurriculum = async () => {
    if (!newCurriculum.programId || !newCurriculum.versionName) {
      toast({
        title: 'Validation Error',
        description: 'Please select a program and enter a version name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/curriculum-versions', {
        programId: newCurriculum.programId,
        versionName: newCurriculum.versionName,
        effectiveFrom: newCurriculum.effectiveFrom,
      });

      toast({
        title: 'Curriculum Version created',
        description: `${newCurriculum.versionName} has been created successfully.`,
      });

      setIsCurriculumDialogOpen(false);
      setNewCurriculum({ programId: '', versionName: '', effectiveFrom: new Date().getFullYear() });
      refetchCurriculums();
    } catch (error: any) {
      console.error('Error creating curriculum:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create curriculum version.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* PO Management */
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [newPO, setNewPO] = useState({ poNumber: '', description: '' });
  const [editingPOId, setEditingPOId] = useState<string | null>(null);

  const { data: programOutcomes = [], refetch: refetchPOs } = useQuery({
    queryKey: ['program-outcomes', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data } = await api.get('/program-outcomes', { params: { programId: selectedProgramId } });
      return data || [];
    },
    enabled: !!selectedProgramId,
  });

  const handleCreatePO = async () => {
    if (!newPO.poNumber || !newPO.description) {
      toast({ title: 'Validation Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingPOId) {
          // Update PO
          await api.put(`/program-outcomes/${editingPOId}`, {
              poNumber: newPO.poNumber,
              description: newPO.description
          });
          toast({ title: 'Success', description: 'Program Outcome updated' });
      } else {
          // Create PO
          await api.post('/program-outcomes', {
            programId: selectedProgramId,
            poNumber: newPO.poNumber,
            description: newPO.description
          });
          toast({ title: 'Success', description: 'Program Outcome added' });
      }
      resetPOForm();
      refetchPOs();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to save PO', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPO = (po: any) => {
      setNewPO({ poNumber: String(po.poNumber), description: po.description });
      setEditingPOId(po.id);
  };

  const resetPOForm = () => {
      setNewPO({ poNumber: '', description: '' });
      setEditingPOId(null);
  };

  const handleDeletePO = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PO?')) return;
    try {
      await api.delete(`/program-outcomes/${id}`);
      toast({ title: 'Success', description: 'Program Outcome deleted' });
      refetchPOs();
    } catch (error) {
      console.error('Failed to delete PO', error);
    }
  };

  const getCurriculumCount = (programId: string) => {
    return curriculumVersions.filter((cv: CurriculumVersion) => cv.programId === programId).length;
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Programs</h2>
            <p className="text-muted-foreground">Manage academic programs and curriculum versions</p>
          </div>
          <div className="flex gap-2">
            {/* Curriculum Version Dialog */}
            <Dialog open={isCurriculumDialogOpen} onOpenChange={setIsCurriculumDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Add Curriculum
                </Button>
              </DialogTrigger>
              <DialogContent className="overflow-visible" aria-describedby="create-curriculum-desc">
                <DialogHeader>
                  <DialogTitle>Create Curriculum Version</DialogTitle>
                  <DialogDescription id="create-curriculum-desc">
                    Create a new curriculum version for a program. This is required before adding subjects.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Program *</Label>
                    <Select
                      value={newCurriculum.programId}
                      onValueChange={(value) => setNewCurriculum({ ...newCurriculum, programId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.code} - {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Version Name *</Label>
                    <Input
                      value={newCurriculum.versionName}
                      onChange={(e) => setNewCurriculum({ ...newCurriculum, versionName: e.target.value })}
                      placeholder="e.g., 2024 Revision, v2.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Effective From Year</Label>
                    <Input
                      type="number"
                      value={newCurriculum.effectiveFrom}
                      onChange={(e) => setNewCurriculum({ ...newCurriculum, effectiveFrom: parseInt(e.target.value) || new Date().getFullYear() })}
                      min={2000}
                      max={2100}
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreateCurriculum} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Curriculum Version'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Program Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Program
                </Button>
              </DialogTrigger>
              <DialogContent className="overflow-visible" aria-describedby="create-program-desc">
                <DialogHeader>
                  <DialogTitle>Create New Program</DialogTitle>
                  <DialogDescription id="create-program-desc">
                    Enter the details for the new academic program.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Program Name</Label>
                    <Input
                      value={newProgram.name}
                      onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                      placeholder="e.g., Bachelor of Computer Applications"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Program Code</Label>
                    <Input
                      value={newProgram.code}
                      onChange={(e) => setNewProgram({ ...newProgram, code: e.target.value })}
                      placeholder="e.g., BCA"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (Years)</Label>
                      <Input
                        type="number"
                        value={newProgram.durationYears}
                        onChange={(e) => setNewProgram({ ...newProgram, durationYears: parseInt(e.target.value) || 3 })}
                        min={1}
                        max={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select
                        value={newProgram.departmentId}
                        onValueChange={(value) => setNewProgram({ ...newProgram, departmentId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.code} - {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full" onClick={isEditMode ? handleUpdateProgram : handleCreateProgram} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      isEditMode ? 'Update Program' : 'Create Program'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              title="Delete Program"
              description={`This will permanently delete "${deletingProgram?.name}" and all associated data.`}
              confirmText={deletingProgram?.code || ''}
              onConfirm={handleDeleteProgram}
              isLoading={isSubmitting}
            />
          </div>
        </div>

        {/* Curriculum Versions Summary */}
        {curriculumVersions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Curriculum Versions ({curriculumVersions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {curriculumVersions.map((cv: CurriculumVersion) => (
                  <Badge key={cv.id} variant="secondary" className="py-1 px-3">
                    {cv.versionName} {cv.program && `(${cv.program.code})`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : programs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No programs yet</h3>
              <p className="text-muted-foreground mb-4">Create your first academic program to get started.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{program.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{program.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(program)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleOpenDelete(program)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <Badge variant="outline">{program.durationYears} Years</Badge>
                    </div>
                    {program.department && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Department</span>
                        <span className="font-medium">{program.department.code}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>0 Cohorts</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>{getCurriculumCount(program.id)} Curriculum Versions</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                        setNewCurriculum({ ...newCurriculum, programId: program.id });
                        setIsCurriculumDialogOpen(true);
                        }}>
                        + Curriculum
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => window.location.href = '/cohorts'}>
                        Cohorts
                        </Button>
                    </div>
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => {
                        setSelectedProgramId(program.id);
                        setIsPODialogOpen(true);
                    }}>
                        <BookCheck className="w-4 h-4 mr-2" />
                        Manage POs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* PO Management Dialog */}
        <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Program Outcomes</DialogTitle>
                    <DialogDescription>Define outcomes for {programs.find(p => p.id === selectedProgramId)?.name}</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* Add/Edit PO Form */}
                    <div className="flex gap-4 items-end bg-muted/50 p-4 rounded-md">
                        <div className="w-24 space-y-2">
                            <Label>PO #</Label>
                            <Input 
                                type="number" 
                                placeholder="1" 
                                value={newPO.poNumber}
                                onChange={(e) => setNewPO({...newPO, poNumber: e.target.value})}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label>Description</Label>
                            <Input 
                                placeholder="e.g. Apply engineering knowledge..." 
                                value={newPO.description}
                                onChange={(e) => setNewPO({...newPO, description: e.target.value})}
                            />
                        </div>
                        <Button onClick={handleCreatePO} disabled={isSubmitting}>
                            {editingPOId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </Button>
                        {editingPOId && (
                            <Button variant="ghost" onClick={resetPOForm}>Cancel</Button>
                        )}
                    </div>

                    {/* PO List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <Label>Existing Outcomes</Label>
                        {programOutcomes.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No outcomes defined.</p>
                        ) : (
                            programOutcomes.map((po: any) => (
                                <div key={po.id} className="flex items-start gap-3 p-3 border rounded-md bg-card">
                                    <Badge variant="outline" className="mt-1">PO{po.poNumber}</Badge>
                                    <p className="text-sm flex-1">{po.description}</p>
                                    <div className="flex gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleEditPO(po)}
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-destructive h-6 w-6 p-0"
                                            onClick={() => handleDeletePO(po.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
