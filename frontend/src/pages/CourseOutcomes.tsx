import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { cohortsApi, offeringsApi, subjectsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Plus, Loader2, BookOpen, Pencil, Trash2, Users, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

export default function CourseOutcomes() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  // Phase B Refactor: Cohort + Offering Selection
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedOffering, setSelectedOffering] = useState<string>('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [editingCO, setEditingCO] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; co: any | null }>({ open: false, co: null });
  const [formData, setFormData] = useState({
    co_number: 1,
    description: '',
    bloom_level: 'Remember',
  });
  const [addSubjectForm, setAddSubjectForm] = useState({
    subject_id: '',
    semester_no: 1,
  });

  // 1. Fetch Cohorts
  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  // Fetch all subjects for adding to batch
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  // 2. Fetch Offerings (Subjects) for selected Cohort
  const { data: offerings = [], isLoading: offeringsLoading } = useQuery({
    queryKey: ['offerings', selectedCohort],
    queryFn: () => offeringsApi.list({ cohort_id: selectedCohort }),
    enabled: !!selectedCohort,
  });

  // 3. Fetch Outcomes for selected Offering
  const { data: outcomes = [], isLoading: outcomesLoading } = useQuery({
    queryKey: ['course-outcomes', selectedOffering],
    queryFn: () => offeringsApi.getOutcomes(selectedOffering),
    enabled: !!selectedOffering,
  });

  const createMutation = useMutation({
    mutationFn: (data: { co_number: number; description: string; bloom_level: string }) =>
      offeringsApi.createOutcome(selectedOffering, data),
    onSuccess: () => {
      toast({ title: 'Course outcome created' });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['course-outcomes', selectedOffering] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating CO',
        description: error.response?.data?.detail || 'Failed to create course outcome',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; co_number: number; description: string; bloom_level: string }) =>
      offeringsApi.updateOutcome(selectedOffering, data.id, {
        co_number: data.co_number,
        description: data.description,
        bloom_level: data.bloom_level,
      }),
    onSuccess: () => {
      toast({ title: 'Course outcome updated' });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['course-outcomes', selectedOffering] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating CO',
        description: error.response?.data?.detail || 'Failed to update course outcome',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (coId: string) => offeringsApi.deleteOutcome(selectedOffering, coId),
    onSuccess: () => {
      toast({ title: 'Course outcome deleted' });
      setDeleteConfirm({ open: false, co: null });
      queryClient.invalidateQueries({ queryKey: ['course-outcomes', selectedOffering] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting CO',
        description: error.response?.data?.detail || 'Failed to delete course outcome',
        variant: 'destructive',
      });
    },
  });

  // Add Subject to Cohort (create offering)
  const addOfferingMutation = useMutation({
    mutationFn: (data: { subject_id: string; cohort_id: string; semester_no: number }) =>
      offeringsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Subject added to batch' });
      setIsAddSubjectDialogOpen(false);
      setAddSubjectForm({ subject_id: '', semester_no: 1 });
      queryClient.invalidateQueries({ queryKey: ['offerings', selectedCohort] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding subject',
        description: error.response?.data?.detail || 'Failed to add subject to batch',
        variant: 'destructive',
      });
    },
  });

  // Auto-select first cohort if available and none selected
  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohort) {
        // Can't auto select without context, but maybe?
        // setSelectedCohort(cohorts[0].id);
    }
  }, [cohorts]);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCO(null);
    setFormData({ co_number: outcomes.length + 1, description: '', bloom_level: 'Remember' });
  };

  const openEditDialog = (co: any) => {
    setEditingCO(co);
    setFormData({
      co_number: co.co_number,
      description: co.description,
      bloom_level: co.bloom_level,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.description) {
      toast({ title: 'Please enter a description', variant: 'destructive' });
      return;
    }
    if (editingCO) {
      updateMutation.mutate({ id: editingCO.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getBloomBadge = (level: string) => {
    const colors: Record<string, string> = {
      Remember: 'bg-blue-500',
      Understand: 'bg-green-500',
      Apply: 'bg-yellow-500',
      Analyze: 'bg-orange-500',
      Evaluate: 'bg-purple-500',
      Create: 'bg-red-500',
    };
    return <Badge className={colors[level] || ''}>{level}</Badge>;
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Course Outcomes (COs)</h2>
            <p className="text-muted-foreground">Manage outcomes for specific batches & subjects</p>
          </div>
          
          {['hod', 'principal'].includes(role) && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : closeDialog()}>
              <DialogTrigger asChild>
                <Button disabled={!selectedOffering} onClick={() => setFormData({ co_number: outcomes.length + 1, description: '', bloom_level: 'Remember' })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add CO
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCO ? 'Edit Course Outcome' : 'Add Course Outcome'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CO Number</Label>
                      <Input
                        type="number"
                        value={formData.co_number}
                        onChange={(e) => setFormData({ ...formData, co_number: parseInt(e.target.value) || 1 })}
                        min={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bloom Level</Label>
                      <Select
                        value={formData.bloom_level}
                        onValueChange={(v) => setFormData({ ...formData, bloom_level: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOOM_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Students will be able to..."
                    />
                  </div>
                  <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {editingCO ? 'Update Course Outcome' : 'Add Course Outcome'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cohort Selector */}
            <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                <Label className="w-24">Select Batch:</Label>
                <Select value={selectedCohort} onValueChange={(val) => { setSelectedCohort(val); setSelectedOffering(''); }}>
                    <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a batch..." />
                    </SelectTrigger>
                    <SelectContent>
                    {cohorts.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                        {c.name} (Year {c.year})
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            </CardContent>
            </Card>

            {/* Offering Selector */}
            <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                <Label className="w-24">Select Subject:</Label>
                <Select value={selectedOffering} onValueChange={setSelectedOffering} disabled={!selectedCohort}>
                    <SelectTrigger className="flex-1">
                    <SelectValue placeholder={offeringsLoading ? "Loading..." : offerings.length === 0 ? "No subjects linked" : "Select a subject..."} />
                    </SelectTrigger>
                    <SelectContent>
                    {offerings.map((off: any) => (
                        <SelectItem key={off.id} value={off.id}>
                        {off.subject?.code} - {off.subject?.name} (Sem {off.semester_no})
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                {selectedCohort && !offeringsLoading && ['hod', 'principal'].includes(role) && (
                  <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Link className="w-4 h-4 mr-2" />
                        Add Subject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Link Subject to Batch</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Select value={addSubjectForm.subject_id} onValueChange={(v) => setAddSubjectForm({ ...addSubjectForm, subject_id: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a subject..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allSubjects
                                .filter((s: any) => !offerings.some((o: any) => o.subject_id === s.id))
                                .map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.code} - {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Semester Number</Label>
                          <Input
                            type="number"
                            value={addSubjectForm.semester_no}
                            onChange={(e) => setAddSubjectForm({ ...addSubjectForm, semester_no: parseInt(e.target.value) || 1 })}
                            min={1}
                            max={8}
                          />
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => addOfferingMutation.mutate({
                            subject_id: addSubjectForm.subject_id,
                            cohort_id: selectedCohort,
                            semester_no: addSubjectForm.semester_no
                          })}
                          disabled={!addSubjectForm.subject_id || addOfferingMutation.isPending}
                        >
                          {addOfferingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Link Subject to Batch
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                </div>
            </CardContent>
            </Card>
        </div>

        {/* Course Outcomes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Course Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedOffering ? (
              <div className="py-12 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a Batch and Subject to view course outcomes</p>
              </div>
            ) : outcomesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : outcomes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No course outcomes defined for this offering.</p>
                {['hod', 'principal'].includes(role) && (
                  <Button className="mt-4" onClick={() => { setFormData({ co_number: 1, description: '', bloom_level: 'Remember' }); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First CO
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CO #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Bloom Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomes.map((co: any) => (
                    <TableRow key={co.id}>
                      <TableCell className="font-medium">CO{co.co_number}</TableCell>
                      <TableCell>{co.description}</TableCell>
                      <TableCell>{getBloomBadge(co.bloom_level)}</TableCell>
                      <TableCell>
                        {['hod', 'principal'].includes(role) && (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(co)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm({ open: true, co })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Quick-add row for HOD/Principal */}
                  {['hod', 'principal'].includes(role) && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-medium">
                        <Input
                          type="number"
                          value={formData.co_number}
                          onChange={(e) => setFormData({ ...formData, co_number: parseInt(e.target.value) || 1 })}
                          min={1}
                          className="w-16 h-8"
                          placeholder="#"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Students will be able to..."
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={formData.bloom_level}
                          onValueChange={(v) => setFormData({ ...formData, bloom_level: v })}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOOM_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={handleSubmit} 
                          disabled={!formData.description || isPending}
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, co: deleteConfirm.co })}
        title="Delete Course Outcome"
        description={`Are you sure you want to delete CO${deleteConfirm.co?.co_number}? This action cannot be undone.`}
        onConfirm={() => deleteConfirm.co && deleteMutation.mutate(deleteConfirm.co.id)}
        isLoading={deleteMutation.isPending}
      />
    </AuthenticatedLayout>
  );
}
