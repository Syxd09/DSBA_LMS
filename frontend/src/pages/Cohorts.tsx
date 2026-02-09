import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { cohortsApi, programsApi, sectionsApi, promotionsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Users, Plus, Loader2, Edit, Trash2, BookOpen, ArrowUp, List, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

  // Sections State
  const [isSectionsDialogOpen, setIsSectionsDialogOpen] = useState(false);
  const [sectionsCohort, setSectionsCohort] = useState<Cohort | null>(null);
  const [newSectionName, setNewSectionName] = useState('');

  // Promotion State
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [promotionCohort, setPromotionCohort] = useState<Cohort | null>(null);
  const [promotionPreview, setPromotionPreview] = useState<any>(null);
  const [overrideDetained, setOverrideDetained] = useState<string[]>([]);
  const [approvalNotes, setApprovalNotes] = useState('');

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

  // --- SECTIONS LOGIC ---
  const { data: sections = [], refetch: refetchSections } = useQuery({
    queryKey: ['sections', sectionsCohort?.id],
    queryFn: () => sectionsCohort ? sectionsApi.list(sectionsCohort.id) : Promise.resolve([]),
    enabled: !!sectionsCohort,
  });

  const createSectionMutation = useMutation({
    mutationFn: (name: string) => sectionsApi.create(sectionsCohort!.id, { name }),
    onSuccess: () => {
      setNewSectionName('');
      refetchSections();
      toast({ title: 'Section added' });
    },
    onError: (err: any) => toast({ title: 'Error adding section', description: err.response?.data?.detail, variant: 'destructive' }),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => sectionsApi.delete(id),
    onSuccess: () => {
      refetchSections();
      toast({ title: 'Section removed' });
    },
    onError: (err: any) => toast({ title: 'Error removing section', description: err.response?.data?.detail, variant: 'destructive' }),
  });

  const handleManageSections = (cohort: Cohort) => {
    setSectionsCohort(cohort);
    setIsSectionsDialogOpen(true);
  };

  // --- PROMOTION LOGIC ---
  const { isFetching: isPreviewLoading, refetch: fetchPreview } = useQuery({
    queryKey: ['promotionPreview', promotionCohort?.id],
    queryFn: () => promotionCohort ? promotionsApi.preview(promotionCohort.id) : Promise.resolve(null),
    enabled: !!promotionCohort,
  });

  // Watch for data updates to set preview state
  const { data: previewData } = useQuery({
    queryKey: ['promotionPreview', promotionCohort?.id],
    queryFn: () => promotionCohort ? promotionsApi.preview(promotionCohort.id) : Promise.resolve(null),
    enabled: !!promotionCohort,
  });

  const promoteMutation = useMutation({
    mutationFn: (data: any) => promotionsApi.execute(promotionCohort!.id, data),
    onSuccess: () => {
      toast({ title: 'Cohort promoted successfully' });
      setIsPromoteDialogOpen(false);
      setPromotionCohort(null);
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
    },
    onError: (err: any) => toast({ title: 'Promotion failed', description: err.response?.data?.detail, variant: 'destructive' }),
  });

  const handlePromoteClick = (cohort: Cohort) => {
    if (cohort.current_semester >= 8) {
      toast({ title: 'Start Final Semester', description: 'This cohort is already in 8th sem.' });
    }
    setPromotionCohort(cohort);
    setOverrideDetained([]);
    setApprovalNotes('');
    setIsPromoteDialogOpen(true);
  };

  const handleConfirmPromotion = () => {
    promoteMutation.mutate({
      confirm: true,
      approval_notes: approvalNotes,
      override_detained: overrideDetained,
    });
  };

  const toggleOverride = (usn: string) => {
    if (overrideDetained.includes(usn)) {
      setOverrideDetained(overrideDetained.filter(id => id !== usn));
    } else {
      setOverrideDetained([...overrideDetained, usn]);
    }
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
                          className="h-6 w-6 text-blue-600"
                          onClick={() => handlePromoteClick(cohort)}
                          disabled={cohort.current_semester >= 8}
                          title="Promote to Next Semester"
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleManageSections(cohort)}
                    >
                      Manage Sections
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

        {/* SECTIONS DIALOG */}
        <Dialog open={isSectionsDialogOpen} onOpenChange={setIsSectionsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Sections - {sectionsCohort?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="New Section Name (e.g. A, B)" 
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="uppercase"
                  maxLength={5}
                />
                <Button onClick={() => createSectionMutation.mutate(newSectionName)} disabled={!newSectionName || createSectionMutation.isPending}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="border rounded-md p-2 min-h-[100px]">
                {sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No sections created.</p>
                ) : (
                  <ul className="space-y-2">
                    {sections.map((sec: any) => (
                      <li key={sec.id} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span className="font-medium">{sec.name}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteSectionMutation.mutate(sec.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* PROMOTION DIALOG */}
        <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Promote Cohort {promotionCohort?.name}</DialogTitle>
            </DialogHeader>
            
            {previewData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                  <div className="text-sm">
                    <span className="text-muted-foreground">From:</span> Semester {previewData.from_semester}
                  </div>
                  <ArrowUp className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm font-bold">
                    <span className="text-muted-foreground font-normal">To:</span> Semester {previewData.to_semester}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                   <div className="p-2 border rounded">
                     <div className="text-2xl font-bold text-green-600">{previewData.eligible_count}</div>
                     <div className="text-xs text-muted-foreground">Eligible</div>
                   </div>
                   <div className="p-2 border rounded">
                     <div className="text-2xl font-bold text-red-600">{previewData.detained_count}</div>
                     <div className="text-xs text-muted-foreground">Detained</div>
                   </div>
                   <div className="p-2 border rounded">
                     <div className="text-2xl font-bold">{previewData.total_students}</div>
                     <div className="text-xs text-muted-foreground">Total</div>
                   </div>
                </div>

                <ScrollArea className="h-[200px] border rounded-md">
                   <table className="w-full text-sm">
                     <thead className="bg-muted sticky top-0">
                       <tr>
                         <th className="p-2 text-left">USN</th>
                         <th className="p-2 text-left">Name</th>
                         <th className="p-2 text-left">Status</th>
                         <th className="p-2 text-center">Override</th>
                       </tr>
                     </thead>
                     <tbody>
                       {previewData.students.map((s: any) => (
                         <tr key={s.student_usn} className="border-b">
                           <td className="p-2 font-mono">{s.student_usn}</td>
                           <td className="p-2">{s.student_name}</td>
                           <td className="p-2">
                             {s.status === 'ELIGIBLE' ? (
                               <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Eligible</Badge>
                             ) : (
                               <div className="flex flex-col">
                                 <Badge variant="destructive">Detained</Badge>
                                 <span className="text-[10px] text-muted-foreground">{s.reason}</span>
                               </div>
                             )}
                           </td>
                           <td className="p-2 text-center">
                             {s.status === 'DETAINED' && (
                               <Checkbox 
                                 checked={overrideDetained.includes(s.student_usn)}
                                 onCheckedChange={() => toggleOverride(s.student_usn)}
                               />
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </ScrollArea>

                <div className="space-y-2">
                    <Label>Approval Notes</Label>
                    <Input 
                      placeholder="Reason for promotion / overrides..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                    />
                </div>

                <Button className="w-full" onClick={handleConfirmPromotion} disabled={promoteMutation.isPending}>
                    {promoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Promotion
                </Button>
              </div>
            ) : (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </DialogContent>
        </Dialog>
    </AuthenticatedLayout>
  );
}
