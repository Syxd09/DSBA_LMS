import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

interface ProgramOutcome {
  id: string;
  poNumber: number;
  description: string;
  targetPercent: number;
  programId: string;
  program: {
    name: string;
    code: string;
  };
}

interface Program {
  id: string;
  name: string;
  code: string;
}

export default function ProgramOutcomes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<ProgramOutcome | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletePOId, setDeletePOId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPO, setNewPO] = useState({
    programId: '',
    poNumber: 1,
    description: '',
    targetPercent: 60
  });

  // Fetch programs
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data } = await api.get('/programs');
      return data || [];
    },
  });

  // Fetch program outcomes
  const { data: programOutcomes = [], isLoading, refetch } = useQuery<ProgramOutcome[]>({
    queryKey: ['program-outcomes'],
    queryFn: async () => {
      const { data } = await api.get('/program-outcomes');
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!newPO.programId || !newPO.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/program-outcomes', newPO);
      toast({
        title: 'Program Outcome created',
        description: `PO${newPO.poNumber} has been created successfully.`,
      });
      setIsDialogOpen(false);
      setNewPO({ programId: '', poNumber: 1, description: '', targetPercent: 60 });
      refetch();
    } catch (error: any) {
      console.error('Error creating PO:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create program outcome.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingPO || !editingPO.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/program-outcomes/${editingPO.id}`, {
        poNumber: editingPO.poNumber,
        description: editingPO.description,
        targetPercent: editingPO.targetPercent
      });
      toast({
        title: 'Program Outcome updated',
        description: `PO${editingPO.poNumber} has been updated successfully.`,
      });
      setIsEditDialogOpen(false);
      setEditingPO(null);
      refetch();
    } catch (error: any) {
      console.error('Error updating PO:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update program outcome.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePOId) return;

    try {
      await api.delete(`/program-outcomes/${deletePOId}`);
      toast({
        title: 'Program Outcome deleted',
        description: 'Program outcome has been deleted successfully.',
      });
      setDeletePOId(null);
      refetch();
    } catch (error: any) {
      console.error('Error deleting PO:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete program outcome.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Program Outcomes (PO)</h2>
            <p className="text-muted-foreground">Manage program outcomes for your academic programs</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Program Outcome
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="create-po-desc">
              <DialogHeader>
                <DialogTitle>Create Program Outcome</DialogTitle>
                <DialogDescription id="create-po-desc">
                  Add a new program outcome to a program.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select value={newPO.programId} onValueChange={(value) => setNewPO({ ...newPO, programId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name} ({program.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PO Number *</Label>
                  <Input
                    type="number"
                    value={newPO.poNumber}
                    onChange={(e) => setNewPO({ ...newPO, poNumber: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={newPO.description}
                    onChange={(e) => setNewPO({ ...newPO, description: e.target.value })}
                    placeholder="e.g., Engineering Knowledge: Apply knowledge of mathematics and science"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Percentage</Label>
                  <Input
                    type="number"
                    value={newPO.targetPercent}
                    onChange={(e) => setNewPO({ ...newPO, targetPercent: parseInt(e.target.value) || 60 })}
                    min={0}
                    max={100}
                  />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Program Outcome'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">All Program Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : programOutcomes.length === 0 ? (
              <div className="py-12 text-center">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No program outcomes found</h3>
                <p className="text-muted-foreground">Create your first program outcome to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Target %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programOutcomes.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>
                        <Badge variant="outline">PO{po.poNumber}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {po.program.name}
                        <span className="text-muted-foreground ml-1">({po.program.code})</span>
                      </TableCell>
                      <TableCell className="max-w-md">{po.description}</TableCell>
                      <TableCell>{po.targetPercent}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPO(po);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletePOId(po.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent aria-describedby="edit-po-desc">
            <DialogHeader>
              <DialogTitle>Edit Program Outcome</DialogTitle>
              <DialogDescription id="edit-po-desc">
                Update the program outcome details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>PO Number *</Label>
                <Input
                  type="number"
                  value={editingPO?.poNumber || 1}
                  onChange={(e) => setEditingPO(editingPO ? { ...editingPO, poNumber: parseInt(e.target.value) || 1 } : null)}
                  min={1}
                  max={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={editingPO?.description || ''}
                  onChange={(e) => setEditingPO(editingPO ? { ...editingPO, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Percentage</Label>
                <Input
                  type="number"
                  value={editingPO?.targetPercent || 60}
                  onChange={(e) => setEditingPO(editingPO ? { ...editingPO, targetPercent: parseInt(e.target.value) || 60 } : null)}
                  min={0}
                  max={100}
                />
              </div>
              <Button className="w-full" onClick={handleEdit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Program Outcome'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDeleteDialog
          open={deletePOId !== null}
          onOpenChange={(open) => !open && setDeletePOId(null)}
          onConfirm={handleDelete}
          title="Delete Program Outcome"
          description="Are you sure you want to delete this program outcome? This action cannot be undone."
        />
      </div>
    </AuthenticatedLayout>
  );
}
