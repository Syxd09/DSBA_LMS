import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { programsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Target, Plus, Loader2, Edit, Trash2, Award } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';

interface ProgramOutcome {
  id: string;
  program_id: string;
  po_code: string;
  po_number: number;
  description: string;
  threshold: number;
  created_at: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
}

export default function ProgramOutcomes() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<ProgramOutcome | null>(null);
  const [formData, setFormData] = useState({ po_number: 1, description: '', threshold: 60 });

  const canEdit = ['hod', 'principal'].includes(role);

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programsApi.list(),
  });

  // Fetch POs for selected program
  const { data: pos = [], isLoading: posLoading } = useQuery({
    queryKey: ['program-outcomes', selectedProgramId],
    queryFn: () => programsApi.listOutcomes(selectedProgramId),
    enabled: !!selectedProgramId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { po_number: number; description: string }) =>
      programsApi.createOutcome(selectedProgramId, data),
    onSuccess: () => {
      toast({ title: 'Program Outcome created' });
      setIsCreateDialogOpen(false);
      setFormData({ po_number: pos.length + 1, description: '', threshold: 60 });
      queryClient.invalidateQueries({ queryKey: ['program-outcomes', selectedProgramId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating PO',
        description: error.response?.data?.detail || 'Failed to create PO',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: { description?: string; threshold?: number } }) =>
      programsApi.updateOutcome(selectedProgramId, poId, data),
    onSuccess: () => {
      toast({ title: 'Program Outcome updated' });
      setIsEditDialogOpen(false);
      setSelectedPO(null);
      queryClient.invalidateQueries({ queryKey: ['program-outcomes', selectedProgramId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating PO',
        description: error.response?.data?.detail || 'Failed to update PO',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (poId: string) => programsApi.deleteOutcome(selectedProgramId, poId),
    onSuccess: () => {
      toast({ title: 'Program Outcome deleted' });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['program-outcomes', selectedProgramId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting PO',
        description: error.response?.data?.detail || 'Cannot delete PO with existing mappings',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!formData.description) {
      toast({ title: 'Please enter a description', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (po: ProgramOutcome) => {
    setSelectedPO(po);
    setFormData({
      po_number: po.po_number,
      description: po.description,
      threshold: po.threshold,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedPO) return;
    updateMutation.mutate({
      poId: selectedPO.id,
      data: { description: formData.description, threshold: formData.threshold },
    });
  };

  const selectedProgram = programs.find((p: Program) => p.id === selectedProgramId);

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Award className="w-6 h-6" />
              Program Outcomes
            </h2>
            <p className="text-muted-foreground">
              Manage NBA-compliant Program Outcomes (PO1-PO12)
            </p>
          </div>
        </div>

        {/* Program Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Program</CardTitle>
            <CardDescription>Choose a program to view and manage its Program Outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select a program..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program: Program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* PO List */}
        {selectedProgramId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {selectedProgram?.code} - Program Outcomes
                </CardTitle>
                <CardDescription>
                  {pos.length} PO{pos.length !== 1 ? 's' : ''} defined
                </CardDescription>
              </div>
              {canEdit && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setFormData({ po_number: pos.length + 1, description: '', threshold: 60 })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add PO
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Program Outcome</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>PO Number</Label>
                          <Input
                            type="number"
                            value={formData.po_number}
                            onChange={(e) => setFormData({ ...formData, po_number: parseInt(e.target.value) || 1 })}
                            min={1}
                            max={12}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Threshold (%)</Label>
                          <Input
                            type="number"
                            value={formData.threshold}
                            onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 60 })}
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="e.g., Engineering Knowledge: Apply knowledge of mathematics, science, engineering fundamentals..."
                          rows={3}
                        />
                      </div>
                      <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create PO
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {posLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : pos.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No Program Outcomes defined yet.</p>
                  {canEdit && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm">Create standard NBA 12 POs or add custom ones:</p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => {
                          setFormData({ po_number: 1, description: '', threshold: 60 });
                          setIsCreateDialogOpen(true);
                        }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Custom PO
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]">Threshold</TableHead>
                      {canEdit && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pos.map((po: ProgramOutcome) => (
                      <TableRow key={po.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {po.po_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm line-clamp-2">{po.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{po.threshold}%</Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(po)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteId(po.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {/* Quick-add row for HOD/Principal */}
                    {canEdit && (
                      <TableRow className="bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-sm">PO</span>
                            <Input
                              type="number"
                              value={formData.po_number}
                              onChange={(e) => setFormData({ ...formData, po_number: parseInt(e.target.value) || 1 })}
                              min={1}
                              max={12}
                              className="w-14 h-8"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="e.g., Engineering Knowledge: Apply knowledge of..."
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={formData.threshold}
                            onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 60 })}
                            min={0}
                            max={100}
                            className="w-16 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={handleCreate} 
                            disabled={!formData.description || createMutation.isPending}
                          >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {selectedPO?.po_code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Threshold (%)</Label>
                <Input
                  type="number"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 60 })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button className="w-full" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update PO
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title="Delete Program Outcome"
          description="Are you sure you want to delete this Program Outcome? This action cannot be undone. Make sure there are no CO-PO mappings referencing this PO."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </AuthenticatedLayout>
  );
}
