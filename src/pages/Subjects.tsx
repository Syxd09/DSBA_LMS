import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, BookOpen, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  curriculumVersionId?: string;
  curriculum?: {
    id: string;
    versionName: string;
    program?: { name: string; code: string };
  };
  createdAt: string;
}

interface CurriculumVersion {
  id: string;
  versionName: string;
  program?: { name: string; code: string };
}

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    credits: 3,
    semester: 1,
    curriculumVersionId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);

  // Fetch curriculum versions for the dropdown
  const { data: curriculumVersions = [] } = useQuery({
    queryKey: ['curriculum-versions'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/curriculum-versions');
        return data || [];
      } catch (error) {
        // Fallback: if no curriculum versions, show empty
        console.warn('Could not fetch curriculum versions:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/subjects');
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubject.name || !newSubject.code || !newSubject.curriculumVersionId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields including Curriculum Version.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/subjects', {
        name: newSubject.name,
        code: newSubject.code.toUpperCase(),
        credits: newSubject.credits,
        semester: newSubject.semester,
        curriculumVersionId: newSubject.curriculumVersionId,
      });

      toast({
        title: 'Subject created',
        description: `${newSubject.name} has been created successfully.`,
      });

      setIsDialogOpen(false);
      setNewSubject({ name: '', code: '', credits: 3, semester: 1, curriculumVersionId: '' });
      fetchSubjects();
    } catch (error: any) {
      console.error('Error creating subject:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create subject.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubject = async () => {
    if (!editingSubject || !editingSubject.name || !editingSubject.code || !editingSubject.curriculumVersionId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/subjects/${editingSubject.id}`, {
        name: editingSubject.name,
        code: editingSubject.code.toUpperCase(),
        credits: editingSubject.credits,
        semester: editingSubject.semester,
        curriculumVersionId: editingSubject.curriculumVersionId,
      });

      toast({
        title: 'Subject updated',
        description: `${editingSubject.name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      setEditingSubject(null);
      fetchSubjects();
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update subject.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubjectId) return;

    try {
      await api.delete(`/subjects/${deleteSubjectId}`);
      toast({
        title: 'Subject deleted',
        description: 'Subject has been deleted successfully.',
      });
      setDeleteSubjectId(null);
      fetchSubjects();
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete subject.',
        variant: 'destructive',
      });
    }
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Subjects</h2>
            <p className="text-muted-foreground">Manage course subjects and curriculum</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="create-subject-desc">
              <DialogHeader>
                <DialogTitle>Create New Subject</DialogTitle>
                <DialogDescription id="create-subject-desc">
                  Enter the details for the new subject.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject Name *</Label>
                  <Input
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="e.g., Data Structures"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject Code *</Label>
                  <Input
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                    placeholder="e.g., CS201"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Curriculum Version *</Label>
                  <Select 
                    value={newSubject.curriculumVersionId} 
                    onValueChange={(value) => setNewSubject({ ...newSubject, curriculumVersionId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                    <SelectContent>
                      {curriculumVersions.map((cv: CurriculumVersion) => (
                        <SelectItem key={cv.id} value={cv.id}>
                          {cv.versionName} {cv.program ? `(${cv.program.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Credits</Label>
                    <Input
                      type="number"
                      value={newSubject.credits}
                      onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) || 3 })}
                      min={1}
                      max={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Input
                      type="number"
                      value={newSubject.semester}
                      onChange={(e) => setNewSubject({ ...newSubject, semester: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={8}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateSubject} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Subject'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No subjects found</h3>
              <p className="text-muted-foreground">Create your first subject to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Curriculum</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-mono">{subject.code}</TableCell>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      {subject.curriculum?.versionName || 'N/A'}
                      {subject.curriculum?.program && (
                        <span className="text-muted-foreground ml-1">
                          ({subject.curriculum.program.code})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Sem {subject.semester}</Badge>
                    </TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingSubject({
                              ...subject,
                              curriculumVersionId: subject.curriculum?.id || ''
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDeleteSubjectId(subject.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.location.href = '/course-outcomes'}
                        >
                          Manage COs
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent aria-describedby="edit-subject-desc">
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription id="edit-subject-desc">
                Update the subject details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subject Name *</Label>
                <Input
                  value={editingSubject?.name || ''}
                  onChange={(e) => setEditingSubject(editingSubject ? { ...editingSubject, name: e.target.value } : null)}
                  placeholder="e.g., Data Structures"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Code *</Label>
                <Input
                  value={editingSubject?.code || ''}
                  onChange={(e) => setEditingSubject(editingSubject ? { ...editingSubject, code: e.target.value } : null)}
                  placeholder="e.g., CS201"
                />
              </div>
              <div className="space-y-2">
                <Label>Curriculum Version *</Label>
                <Select 
                  value={editingSubject?.curriculumVersionId || ''} 
                  onValueChange={(value) => setEditingSubject(editingSubject ? { ...editingSubject, curriculumVersionId: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select curriculum" />
                  </SelectTrigger>
                  <SelectContent>
                    {curriculumVersions.map((cv: CurriculumVersion) => (
                      <SelectItem key={cv.id} value={cv.id}>
                        {cv.versionName} {cv.program ? `(${cv.program.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input
                    type="number"
                    value={editingSubject?.credits || 3}
                    onChange={(e) => setEditingSubject(editingSubject ? { ...editingSubject, credits: parseInt(e.target.value) || 3 } : null)}
                    min={1}
                    max={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input
                    type="number"
                    value={editingSubject?.semester || 1}
                    onChange={(e) => setEditingSubject(editingSubject ? { ...editingSubject, semester: parseInt(e.target.value) || 1 } : null)}
                    min={1}
                    max={8}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleEditSubject} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Subject'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          open={deleteSubjectId !== null}
          onOpenChange={(open) => !open && setDeleteSubjectId(null)}
          onConfirm={handleDeleteSubject}
          title="Delete Subject"
          description="Are you sure you want to delete this subject? This action cannot be undone and will remove all associated course outcomes."
        />
      </div>
    </AuthenticatedLayout>
  );
}
