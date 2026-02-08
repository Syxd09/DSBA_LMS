/**
 * EduMetrics - Unit Management Page
 * F-01: Full CRUD for Units per SubjectOffering
 * 
 * Features:
 * - Select Subject Offering (via Cohort filter)
 * - List/Create/Edit/Delete Units
 * - Expand unit to manage Topics
 * - Reorder units via drag or explicit action
 * - Role-based: Faculty + HOD only
 */

import { useState, useCallback } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { offeringsApi, unitsApi, topicsApi, cohortsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Layers, Plus, Loader2, Edit, Trash2, ChevronDown, ChevronRight,
  GripVertical, BookOpen, AlertCircle, Tag, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

interface Topic {
  id: string;
  unit_id: string;
  name: string;
  created_at: string;
}

interface Unit {
  id: string;
  offering_id: string;
  unit_no: number;
  name: string;
  created_at: string;
  topics_count: number;
  topics?: Topic[];
}

interface Offering {
  id: string;
  subject: { name: string; code: string };
  cohort: { name: string; year: number };
  semester: number;
}

interface Cohort {
  id: string;
  name: string;
  year: number;
  program?: { name: string; code: string };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Units() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  
  // State for filters
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  
  // State for dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deleteTopicData, setDeleteTopicData] = useState<{ unitId: string; topicId: string } | null>(null);
  
  // State for forms
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedTopicUnit, setSelectedTopicUnit] = useState<Unit | null>(null);
  const [unitFormData, setUnitFormData] = useState({ unit_no: 1, name: '' });
  const [topicFormData, setTopicFormData] = useState({ name: '' });
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  
  // State for expanded units (to show topics)
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  
  // Check if user can delete (HOD+ only)
  const canDelete = role === 'hod' || role === 'principal';
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });
  
  const { data: offerings = [], isLoading: offeringsLoading } = useQuery({
    queryKey: ['offerings', selectedCohortId],
    queryFn: () => offeringsApi.list({ cohort_id: selectedCohortId }),
    enabled: !!selectedCohortId,
  });
  
  const { data: units = [], isLoading: unitsLoading, refetch: refetchUnits } = useQuery({
    queryKey: ['units', selectedOfferingId],
    queryFn: () => unitsApi.list(selectedOfferingId, true), // include topics
    enabled: !!selectedOfferingId,
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const createUnitMutation = useMutation({
    mutationFn: (data: { unit_no: number; name: string }) =>
      unitsApi.create(selectedOfferingId, data),
    onSuccess: () => {
      toast({ title: 'Unit created successfully' });
      setIsCreateDialogOpen(false);
      setUnitFormData({ unit_no: 1, name: '' });
      queryClient.invalidateQueries({ queryKey: ['units', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating unit',
        description: error.response?.data?.detail || 'Failed to create unit',
        variant: 'destructive',
      });
    },
  });
  
  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { unit_no?: number; name?: string } }) =>
      unitsApi.update(id, data),
    onSuccess: () => {
      toast({ title: 'Unit updated successfully' });
      setIsEditDialogOpen(false);
      setSelectedUnit(null);
      queryClient.invalidateQueries({ queryKey: ['units', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating unit',
        description: error.response?.data?.detail || 'Failed to update unit',
        variant: 'destructive',
      });
    },
  });
  
  const deleteUnitMutation = useMutation({
    mutationFn: (id: string) => unitsApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Unit deleted' });
      setDeleteUnitId(null);
      queryClient.invalidateQueries({ queryKey: ['units', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting unit',
        description: error.response?.data?.detail || 'Failed to delete unit',
        variant: 'destructive',
      });
    },
  });
  
  const reorderUnitsMutation = useMutation({
    mutationFn: (unitIds: string[]) => unitsApi.reorder(selectedOfferingId, unitIds),
    onSuccess: () => {
      toast({ title: 'Units reordered' });
      queryClient.invalidateQueries({ queryKey: ['units', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error reordering units',
        description: error.response?.data?.detail || 'Failed to reorder',
        variant: 'destructive',
      });
    },
  });
  
  // Topic mutations
  const createTopicMutation = useMutation({
    mutationFn: ({ unitId, name }: { unitId: string; name: string }) =>
      topicsApi.create(unitId, { name }),
    onSuccess: () => {
      toast({ title: 'Topic created successfully' });
      setTopicFormData({ name: '' });
      queryClient.invalidateQueries({ queryKey: ['units', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating topic',
        description: error.response?.data?.detail || 'Failed to create topic',
        variant: 'destructive',
      });
    },
  });
  
  const updateTopicMutation = useMutation({
    mutationFn: ({ unitId, topicId, name }: { unitId: string; topicId: string; name: string }) =>
      topicsApi.update(unitId, topicId, { name }),
    onSuccess: () => {
      toast({ title: 'Topic updated' });
      setEditingTopic(null);
      setTopicFormData({ name: '' });
      queryClient.invalidateQueries({ queryKey: ['units', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating topic',
        description: error.response?.data?.detail || 'Failed to update topic',
        variant: 'destructive',
      });
    },
  });
  
  const deleteTopicMutation = useMutation({
    mutationFn: ({ unitId, topicId }: { unitId: string; topicId: string }) =>
      topicsApi.delete(unitId, topicId),
    onSuccess: () => {
      toast({ title: 'Topic deleted' });
      setDeleteTopicData(null);
      queryClient.invalidateQueries({ queryKey: ['units', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting topic',
        description: error.response?.data?.detail || 'Failed to delete topic',
        variant: 'destructive',
      });
    },
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleCreateUnit = () => {
    if (!unitFormData.name.trim()) {
      toast({ title: 'Unit name is required', variant: 'destructive' });
      return;
    }
    if (unitFormData.unit_no < 1 || unitFormData.unit_no > 20) {
      toast({ title: 'Unit number must be between 1 and 20', variant: 'destructive' });
      return;
    }
    createUnitMutation.mutate(unitFormData);
  };
  
  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitFormData({ unit_no: unit.unit_no, name: unit.name });
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateUnit = () => {
    if (!selectedUnit) return;
    updateUnitMutation.mutate({
      id: selectedUnit.id,
      data: unitFormData,
    });
  };
  
  const handleMoveUnit = useCallback((unit: Unit, direction: 'up' | 'down') => {
    const currentIndex = units.findIndex((u: Unit) => u.id === unit.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === units.length - 1)
    ) {
      return;
    }
    
    const newUnits = [...units];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newUnits[currentIndex], newUnits[swapIndex]] = [newUnits[swapIndex], newUnits[currentIndex]];
    
    const unitIds = newUnits.map((u: Unit) => u.id);
    reorderUnitsMutation.mutate(unitIds);
  }, [units, reorderUnitsMutation]);
  
  const toggleExpandUnit = (unitId: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };
  
  const handleAddTopic = (unit: Unit) => {
    setSelectedTopicUnit(unit);
    setTopicFormData({ name: '' });
    setEditingTopic(null);
    setIsTopicDialogOpen(true);
  };
  
  const handleEditTopic = (unit: Unit, topic: Topic) => {
    setSelectedTopicUnit(unit);
    setEditingTopic(topic);
    setTopicFormData({ name: topic.name });
    setIsTopicDialogOpen(true);
  };
  
  const handleSaveTopic = () => {
    if (!selectedTopicUnit || !topicFormData.name.trim()) {
      toast({ title: 'Topic name is required', variant: 'destructive' });
      return;
    }
    
    if (editingTopic) {
      updateTopicMutation.mutate({
        unitId: selectedTopicUnit.id,
        topicId: editingTopic.id,
        name: topicFormData.name.trim(),
      });
    } else {
      createTopicMutation.mutate({
        unitId: selectedTopicUnit.id,
        name: topicFormData.name.trim(),
      });
    }
  };
  
  const handleCohortChange = (cohortId: string) => {
    setSelectedCohortId(cohortId);
    setSelectedOfferingId(''); // Reset offering when cohort changes
  };
  
  const getNextUnitNo = (): number => {
    if (units.length === 0) return 1;
    const maxNo = Math.max(...units.map((u: Unit) => u.unit_no));
    return maxNo + 1;
  };
  
  const openCreateDialog = () => {
    setUnitFormData({ unit_no: getNextUnitNo(), name: '' });
    setIsCreateDialogOpen(true);
  };
  
  // Get selected offering details for display
  const selectedOffering = offerings.find((o: Offering) => o.id === selectedOfferingId);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <AuthenticatedLayout allowedRoles={['teacher', 'hod', 'principal']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Unit Management</h2>
            <p className="text-muted-foreground">
              Define units and topics for each subject offering
            </p>
          </div>
          {selectedOfferingId && (
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          )}
        </div>
        
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Subject Offering</CardTitle>
            <CardDescription>
              Choose a cohort and subject to manage its units and topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cohort</Label>
                <Select value={selectedCohortId} onValueChange={handleCohortChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort: Cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.year})
                        {cohort.program && ` - ${cohort.program.code}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Subject Offering</Label>
                <Select 
                  value={selectedOfferingId} 
                  onValueChange={setSelectedOfferingId}
                  disabled={!selectedCohortId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCohortId ? "Select subject..." : "Select cohort first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {offerings.map((offering: Offering) => (
                      <SelectItem key={offering.id} value={offering.id}>
                        {offering.subject.code} - {offering.subject.name} (Sem {offering.semester})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Selected Offering Info */}
        {selectedOffering && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedOffering.subject.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOffering.subject.code} • {selectedOffering.cohort.name} • Semester {selectedOffering.semester}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {units.length} Unit{units.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Units List */}
        {!selectedOfferingId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a Subject Offering</h3>
              <p className="text-muted-foreground">
                Choose a cohort and subject to view and manage its units.
              </p>
            </CardContent>
          </Card>
        ) : unitsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : units.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No units yet</h3>
              <p className="text-muted-foreground mb-4">
                Create units to organize topics for this subject.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Unit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {units.map((unit: Unit, index: number) => (
              <Card key={unit.id} className="group">
                <Collapsible 
                  open={expandedUnits.has(unit.id)}
                  onOpenChange={() => toggleExpandUnit(unit.id)}
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Reorder Controls */}
                    <div className="flex flex-col gap-1 opacity-50 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || reorderUnitsMutation.isPending}
                        onClick={() => handleMoveUnit(unit, 'up')}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === units.length - 1 || reorderUnitsMutation.isPending}
                        onClick={() => handleMoveUnit(unit, 'down')}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    {/* Unit Info */}
                    <CollapsibleTrigger asChild>
                      <div className="flex-1 flex items-center gap-3 cursor-pointer">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-primary">{unit.unit_no}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{unit.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {unit.topics_count} topic{unit.topics_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {expandedUnits.has(unit.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleAddTopic(unit)}
                      >
                        <Tag className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditUnit(unit)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteUnitId(unit.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Topics Section */}
                  <CollapsibleContent>
                    <div className="border-t bg-muted/30 p-4">
                      {unit.topics && unit.topics.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground mb-3">
                            Topics in Unit {unit.unit_no}
                          </div>
                          {unit.topics.map((topic: Topic) => (
                            <div 
                              key={topic.id}
                              className="flex items-center justify-between p-2 bg-background rounded-lg border"
                            >
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-muted-foreground" />
                                <span>{topic.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEditTopic(unit, topic)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => setDeleteTopicData({ unitId: unit.id, topicId: topic.id })}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No topics in this unit yet</p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => handleAddTopic(unit)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Topic
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
        
        {/* Create Unit Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Unit</DialogTitle>
              <DialogDescription>
                Add a new unit for {selectedOffering?.subject.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Unit No. *</Label>
                  <Input
                    type="number"
                    value={unitFormData.unit_no}
                    onChange={(e) => setUnitFormData({ ...unitFormData, unit_no: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={20}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Unit Name *</Label>
                  <Input
                    value={unitFormData.name}
                    onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                    placeholder="e.g., Introduction to Programming"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUnit} disabled={createUnitMutation.isPending}>
                {createUnitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Unit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Unit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Unit No.</Label>
                  <Input
                    type="number"
                    value={unitFormData.unit_no}
                    onChange={(e) => setUnitFormData({ ...unitFormData, unit_no: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={20}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Unit Name</Label>
                  <Input
                    value={unitFormData.name}
                    onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUnit} disabled={updateUnitMutation.isPending}>
                {updateUnitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Unit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Topic Dialog (Create/Edit) */}
        <Dialog open={isTopicDialogOpen} onOpenChange={(open) => {
          setIsTopicDialogOpen(open);
          if (!open) {
            setEditingTopic(null);
            setTopicFormData({ name: '' });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTopic ? 'Edit Topic' : 'Add Topic'}
              </DialogTitle>
              <DialogDescription>
                {selectedTopicUnit && `Unit ${selectedTopicUnit.unit_no}: ${selectedTopicUnit.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Topic Name *</Label>
                <Input
                  value={topicFormData.name}
                  onChange={(e) => setTopicFormData({ name: e.target.value })}
                  placeholder="e.g., Variables and Data Types"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTopic} 
                disabled={createTopicMutation.isPending || updateTopicMutation.isPending}
              >
                {(createTopicMutation.isPending || updateTopicMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTopic ? 'Update Topic' : 'Add Topic'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Unit Confirmation */}
        <ConfirmDialog
          open={!!deleteUnitId}
          onOpenChange={() => setDeleteUnitId(null)}
          title="Delete Unit"
          description="Are you sure you want to delete this unit? All topics in this unit will also be deleted. This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteUnitId && deleteUnitMutation.mutate(deleteUnitId)}
          isLoading={deleteUnitMutation.isPending}
        />
        
        {/* Delete Topic Confirmation */}
        <ConfirmDialog
          open={!!deleteTopicData}
          onOpenChange={() => setDeleteTopicData(null)}
          title="Delete Topic"
          description="Are you sure you want to delete this topic? This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteTopicData && deleteTopicMutation.mutate(deleteTopicData)}
          isLoading={deleteTopicMutation.isPending}
        />
      </div>
    </AuthenticatedLayout>
  );
}
