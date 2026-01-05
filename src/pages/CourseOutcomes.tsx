import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Target, Loader2, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface CourseOutcome {
  id: string;
  coNumber: number;
  description: string;
  bloomLevel: string;
  subjectId: string;
  createdAt: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const bloomColors: Record<string, string> = {
  Remember: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Understand: 'bg-green-500/10 text-green-600 border-green-500/20',
  Apply: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Analyze: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Evaluate: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Create: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

export default function CourseOutcomes() {
  const { user } = useAuth();
  const canModify = user?.role === 'ADMIN' || user?.role === 'PRINCIPAL' || user?.role === 'HOD';
  
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCO, setNewCO] = useState({
    subjectId: '',
    coNumber: 1,
    description: '',
    bloomLevel: 'Remember',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit/Delete State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingDescription, setDeletingDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cosRes, subjectsRes] = await Promise.all([
        api.get('/course-outcomes'),
        api.get('/subjects'),
      ]);

      setCourseOutcomes(cosRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch course outcomes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCO = async () => {
    if (!newCO.subjectId || !newCO.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && editingId) {
        // Update CO
         await api.put(`/course-outcomes/${editingId}`, {
            subjectId: newCO.subjectId,
            coNumber: newCO.coNumber,
            description: newCO.description,
            bloomLevel: newCO.bloomLevel,
         });
         toast({ title: 'Course Outcome updated', description: 'Changes saved successfully.' });
      } else {
        // Create CO
        await api.post('/course-outcomes', {
            subjectId: newCO.subjectId,
            coNumber: newCO.coNumber,
            description: newCO.description,
            bloomLevel: newCO.bloomLevel,
        });
        toast({ title: 'Course Outcome created', description: `CO${newCO.coNumber} has been created successfully.` });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving CO:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save course outcome.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
      setNewCO({ subjectId: '', coNumber: 1, description: '', bloomLevel: 'Remember' });
      setIsEditMode(false);
      setEditingId(null);
  };

  const handleOpenEdit = (co: CourseOutcome) => {
      setNewCO({
          subjectId: co.subjectId,
          coNumber: co.coNumber,
          description: co.description,
          bloomLevel: co.bloomLevel,
      });
      setEditingId(co.id);
      setIsEditMode(true);
      setIsDialogOpen(true);
  };

  const handleDeleteCO = async () => {
      if (!deletingId) return;
      setIsSubmitting(true);
      try {
          await api.delete(`/course-outcomes/${deletingId}`);
          toast({ title: 'Success', description: 'Course Outcome deleted.' });
          setDeleteDialogOpen(false);
          fetchData();
      } catch (error: any) {
          toast({ title: 'Error', description: 'Failed to delete CO.', variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  };

  // Fetch POs for the selected subject's program
  const { data: programOutcomes = [] } = useQuery({
      queryKey: ['program-outcomes-mapping', selectedSubject],
      queryFn: async () => {
          if (!selectedSubject || selectedSubject === 'all') return [];
          const subject = subjects.find(s => s.id === selectedSubject);
          if (!subject) return [];
          
          // We need the program ID. Backend subject response has curriculum -> program. 
          // Assuming subject list includes this structure or we fetch subject details.
          // Let's try fetching subject details or getting program from subject list if available.
          // Actually, our getSubjects controller returns curriculum.program. Let's verify subjects structure.
          // For now, assume subject object has what we need or fetch it.
          // Better: fetch program outcomes by subject's program.
          
          // Hack: we need programId. Let's assume we can get it from subject list if we update getSubjects to include it effectively.
          // Or just fetch specific subject to get programId.
          const { data: subjectDetails } = await api.get(`/subjects?id=${selectedSubject}`); 
          // Actually getSubjects returns a list.
          
          const targetSubject = (subjects as any[]).find(s => s.id === selectedSubject);
           if (targetSubject?.curriculum?.program?.id) {
               const { data } = await api.get('/program-outcomes', { params: { programId: targetSubject.curriculum.program.id } });
               return data || [];
           }
          return [];
      },
      enabled: selectedSubject !== 'all'
  });

  const handleMappingChange = async (coId: string, poId: string, level: string) => {
      try {
          const co = filteredCOs.find(c => c.id === coId);
          const po = (programOutcomes as any[]).find(p => p.id === poId);
          const levelName = level === '3' ? 'Strong' : level === '2' ? 'Medium' : level === '1' ? 'Weak' : 'None';
          
          await api.put('/course-outcomes/mapping', {
              coId,
              poId,
              correlationLevel: parseInt(level)
          });
          
          fetchData();
          toast({ 
              title: 'CO-PO Mapping Updated', 
              description: `CO${co?.coNumber || '?'} → PO${po?.poNumber || '?'} set to Level ${level} (${levelName})` 
          });
      } catch (error: any) {
          const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
          toast({ 
              title: 'Failed to Save Mapping', 
              description: errorMsg.includes('Network') || errorMsg.includes('fetch') 
                  ? 'Unable to reach server. Please check your connection.'
                  : `Error: ${errorMsg}`,
              variant: 'destructive' 
          });
      }
  };

  const filteredCOs = courseOutcomes.filter(co => {
    const matchesSearch = co.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.subject?.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || co.subjectId === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Group COs by subject
  const groupedCOs = filteredCOs.reduce((acc, co) => {
    const subjectCode = co.subject?.code || 'Unknown';
    if (!acc[subjectCode]) {
      acc[subjectCode] = {
        subjectName: co.subject?.name || 'Unknown',
        cos: [],
      };
    }
    acc[subjectCode].cos.push(co);
    return acc;
  }, {} as Record<string, { subjectName: string; cos: any[] }>);

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Course Outcomes</h2>
            <p className="text-muted-foreground">Manage course outcomes and Bloom's taxonomy mappings</p>
          </div>
          {canModify && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add CO
                </Button>
              </DialogTrigger>
            <DialogContent aria-describedby="create-co-desc">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Course Outcome' : 'Create Course Outcome'}</DialogTitle>
                <DialogDescription id="create-co-desc">
                  {isEditMode ? 'Update existing course outcome details.' : 'Define a new course outcome with Bloom\'s taxonomy level.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={newCO.subjectId}
                    onValueChange={(value) => setNewCO({ ...newCO, subjectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CO Number</Label>
                    <Input
                      type="number"
                      value={newCO.coNumber}
                      onChange={(e) => setNewCO({ ...newCO, coNumber: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bloom's Level</Label>
                    <Select
                      value={newCO.bloomLevel}
                      onValueChange={(value) => setNewCO({ ...newCO, bloomLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bloomLevels.map((level) => (
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
                  <Textarea
                    value={newCO.description}
                    onChange={(e) => setNewCO({ ...newCO, description: e.target.value })}
                    placeholder="Describe what the student should be able to do..."
                    rows={3}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateCO} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    isEditMode ? 'Update Course Outcome' : 'Create Course Outcome'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search course outcomes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(groupedCOs).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No course outcomes yet</h3>
              <p className="text-muted-foreground mb-4">Create course outcomes to define learning objectives.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Course Outcome
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCOs).map(([subjectCode, { subjectName, cos }]) => (
              <Card key={subjectCode}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{subjectName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{subjectCode}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* CO List */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Course Outcomes</h3>
                    {cos.map((co) => (
                      <div
                        key={co.id}
                        className="flex items-start gap-4 p-3 border border-border bg-background"
                      >
                        <Badge variant="outline" className="shrink-0">
                          CO{co.coNumber}
                        </Badge>
                        <p className="text-sm text-foreground flex-1">{co.description}</p>
                         <Badge className={bloomColors[co.bloomLevel] || ''}>
                          {co.bloomLevel}
                        </Badge>
                        {canModify && (
                          <div className="flex gap-1">
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(co)}>
                                   <Pencil className="w-3.5 h-3.5" />
                               </Button>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                   setDeletingId(co.id);
                                   setDeletingDescription(`CO${co.coNumber}: ${co.description.substring(0, 30)}...`);
                                   setDeleteDialogOpen(true);
                               }}>
                                   <Trash2 className="w-3.5 h-3.5" />
                               </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mapping Matrix - Only show if subject specific view is active or we have POs */}
                  {selectedSubject !== 'all' && programOutcomes.length > 0 && (
                      <div className="pt-4 border-t">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-sm">CO-PO Mapping Matrix</h3>
                              
                              {/* Statistics Summary */}
                              <div className="flex items-center gap-4 text-xs">
                                  <span className="flex items-center gap-1">
                                      <span className="font-semibold">{cos.length}</span> COs
                                  </span>
                                  <span className="flex items-center gap-1">
                                      <span className="font-semibold">{programOutcomes.length}</span> POs
                                  </span>
                                  <span className="flex items-center gap-1">
                                      📊 Avg: <span className="font-semibold">
                                          {(() => {
                                              const allMappings = cos.flatMap(co => 
                                                  programOutcomes.map((po: any) => {
                                                      const mapping = co.poMappings?.find((m: any) => m.poId === po.id);
                                                      return mapping?.correlationLevel || 0;
                                                  })
                                              );
                                              const avg = allMappings.reduce((a, b) => a + b, 0) / allMappings.length;
                                              return avg.toFixed(1);
                                          })()}
                                      </span>
                                  </span>
                              </div>
                          </div>

                          {/* Validation Warnings */}
                          {(() => {
                              const unmappedCOs = cos.filter(co => 
                                  !co.poMappings || co.poMappings.every((m: any) => m.correlationLevel === 0)
                              );
                              const unmappedPOs = programOutcomes.filter((po: any) =>
                                  !cos.some(co => co.poMappings?.some((m: any) => m.poId === po.id && m.correlationLevel > 0))
                              );
                              
                              return (unmappedCOs.length > 0 || unmappedPOs.length > 0) && (
                                  <div className="mb-3 space-y-2">
                                      {unmappedCOs.length > 0 && (
                                          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                                              <span className="text-red-600 dark:text-red-400">⚠</span>
                                              <span className="text-red-700 dark:text-red-300">
                                                  <strong>{unmappedCOs.length} CO(s)</strong> have no PO mappings: {unmappedCOs.map(co => `CO${co.coNumber}`).join(', ')}
                                              </span>
                                          </div>
                                      )}
                                      {unmappedPOs.length > 0 && (
                                          <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                                              <span className="text-yellow-600 dark:text-yellow-400">ℹ</span>
                                              <span className="text-yellow-700 dark:text-yellow-300">
                                                  <strong>{unmappedPOs.length} PO(s)</strong> have no CO mappings: {unmappedPOs.map((po: any) => `PO${po.poNumber}`).join(', ')}
                                              </span>
                                          </div>
                                      )}
                                  </div>
                              );
                          })()}

                          {/* Bulk Actions */}
                          <div className="mb-3 flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-muted-foreground">Quick Actions:</span>
                              <button
                                  onClick={() => {
                                      if (!window.confirm('Set all mappings to 0 (no correlation)?')) return;
                                      cos.forEach(co => {
                                          programOutcomes.forEach((po: any) => {
                                              handleMappingChange(co.id, po.id, '0');
                                          });
                                      });
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border rounded"
                              >
                                  Clear All
                              </button>
                              <button
                                  onClick={() => {
                                      if (!window.confirm('Set diagonal (CO1→PO1, CO2→PO2...) to Level 3?')) return;
                                      cos.forEach((co, idx) => {
                                          if (programOutcomes[idx]) {
                                              handleMappingChange(co.id, programOutcomes[idx].id, '3');
                                          }
                                      });
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border rounded"
                              >
                                  Fill Diagonal (3)
                              </button>
                              <button
                                  onClick={() => {
                                      if (!window.confirm('Set all mappings to Level 3 (strong correlation)?')) return;
                                      cos.forEach(co => {
                                          programOutcomes.forEach((po: any) => {
                                              handleMappingChange(co.id, po.id, '3');
                                          });
                                      });
                                  }}
                                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 border rounded"
                              >
                                  Set All Strong (3)
                              </button>
                          </div>

                          <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                  <thead>
                                      <tr>
                                          <th className="p-2 border text-left bg-muted/50">CO \ PO</th>
                                          {programOutcomes.map((po: any) => (
                                              <th 
                                                  key={po.id} 
                                                  className="p-2 border text-center bg-muted/50 cursor-help" 
                                                  title={`${po.description}\n\nClick cells below to map COs to this PO`}
                                              >
                                                  <div className="flex flex-col items-center">
                                                      <span className="font-semibold">PO{po.poNumber}</span>
                                                      <span className="text-xs text-muted-foreground font-normal truncate max-w-[100px]">
                                                          {po.description.substring(0, 20)}...
                                                      </span>
                                                  </div>
                                              </th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {cos.map((co) => (
                                          <tr key={co.id}>
                                              <td className="p-2 border font-medium bg-muted/30" title={co.description}>
                                                  <div className="flex flex-col">
                                                      <span>CO{co.coNumber}</span>
                                                      <span className="text-xs text-muted-foreground font-normal truncate max-w-[120px]">
                                                          {co.description.substring(0, 25)}...
                                                      </span>
                                                  </div>
                                              </td>
                                              {programOutcomes.map((po: any) => {
                                                  const mapping = co.poMappings?.find((m: any) => m.poId === po.id);
                                                  const level = mapping?.correlationLevel || 0;
                                                  
                                                  // Enhanced heat map background colors
                                                  const cellBgClass = 
                                                      level === 3 ? 'bg-green-200 dark:bg-green-900/50' :
                                                      level === 2 ? 'bg-blue-100 dark:bg-blue-900/30' :
                                                      level === 1 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                                                      'bg-gray-50 dark:bg-gray-900/10';
                                                  
                                                  return (
                                                      <td 
                                                          key={po.id} 
                                                          className={`p-1 border text-center ${cellBgClass} transition-colors`}
                                                          title={`CO${co.coNumber} → PO${po.poNumber}\nCorrelation: ${level === 0 ? 'None' : level === 1 ? 'Weak' : level === 2 ? 'Medium' : 'Strong'}`}
                                                      >
                                                          <select 
                                                              className={`w-14 p-1 rounded border text-center font-semibold cursor-pointer bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors ${
                                                                  level === 3 ? 'text-green-800 dark:text-green-300' :
                                                                  level === 2 ? 'text-blue-700 dark:text-blue-300' :
                                                                  level === 1 ? 'text-yellow-700 dark:text-yellow-300' :
                                                                  'text-gray-500'
                                                              }`}
                                                              value={level}
                                                              onChange={(e) => handleMappingChange(co.id, po.id, e.target.value)}
                                                          >
                                                              <option value="0">-</option>
                                                              <option value="1">1</option>
                                                              <option value="2">2</option>
                                                              <option value="3">3</option>
                                                          </select>
                                                      </td>
                                                  );
                                              })}
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                              <div className="flex items-start gap-4 mt-3 text-xs text-muted-foreground">
                                  <div>
                                      <strong>Correlation Levels:</strong> 
                                      <span className="ml-2">1 (Weak)</span> •
                                      <span className="ml-1">2 (Medium)</span> •
                                      <span className="ml-1">3 (Strong)</span> •
                                      <span className="ml-1">- (None)</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-green-200 dark:bg-green-900/50 rounded">Strong</span>
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded">Medium</span>
                                      <span className="px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded">Weak</span>
                                      <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-900/10 rounded">None</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ConfirmDeleteDialog 
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Delete Course Outcome"
            description={`Are you sure you want to delete "${deletingDescription}"? This action cannot be undone.`}
            confirmText="Delete"
            onConfirm={handleDeleteCO}
            isLoading={isSubmitting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
