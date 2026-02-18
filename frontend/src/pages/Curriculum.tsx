import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { regulationsApi, CurriculumVersion, SubjectCreate } from '@/services/regulationsService';
import { programsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ArrowLeft, BookOpen, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Curriculum() {
  const { id: regulationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [activeSemester, setActiveSemester] = useState<string>("1");
  
  // Add Subject State
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubject, setNewSubject] = useState<SubjectCreate>({
    name: '',
    code: '',
    credits: 3,
    semester: 1,
    subject_type: 'core',
  });

  // Fetch Regulation Details
  const { data: regulation, isLoading: isLoadingReg } = useQuery({
    queryKey: ['regulation', regulationId],
    queryFn: () => regulationsApi.get(regulationId!),
    enabled: !!regulationId,
  });

  // Fetch Programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programsApi.list(),
  });

  // Fetch Curriculum for selected Program
  const { data: curriculumVersions = [], isLoading: isLoadingCurriculum } = useQuery({
    queryKey: ['curriculum-versions', regulationId, selectedProgram],
    queryFn: () => regulationsApi.getProgramCurriculum(regulationId!, selectedProgram),
    enabled: !!regulationId && !!selectedProgram,
  });

  // Identify the active version (for now assume 1 active version per program/regulation)
  const activeVersion = curriculumVersions.find(v => v.is_active) || curriculumVersions[0];

  // Fetch Subjects for the active version and active semester
  const { data: subjects = [], refetch: refetchSubjects } = useQuery({
    queryKey: ['curriculum-subjects', regulationId, activeVersion?.id, activeSemester],
    queryFn: () => regulationsApi.getCurriculumSubjects(regulationId!, activeVersion!.id, parseInt(activeSemester)),
    enabled: !!regulationId && !!activeVersion && !!activeSemester,
  });

  // Mutation to create/init curriculum if none exists
  const initCurriculumMutation = useMutation({
    mutationFn: () => regulationsApi.createProgramCurriculum(regulationId!, selectedProgram, {
      version_name: 'v1.0',
      effective_from: regulation?.year || new Date().getFullYear(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-versions'] });
      toast({ title: 'Curriculum initialized for program' });
    },
    onError: (err: any) => toast({ title: 'Failed to init curriculum', description: err.response?.data?.detail, variant: 'destructive' }),
  });

  // Mutation to add subject
  const addSubjectMutation = useMutation({
    mutationFn: (data: SubjectCreate) => 
      regulationsApi.addSubjectToCurriculum(regulationId!, activeVersion!.id, data),
    onSuccess: () => {
      setIsAddSubjectOpen(false);
      setNewSubject({ name: '', code: '', credits: 3, semester: parseInt(activeSemester), subject_type: 'core' });
      refetchSubjects();
      toast({ title: 'Subject added successfully' });
    },
    onError: (err: any) => toast({ title: 'Failed to add subject', description: err.response?.data?.detail, variant: 'destructive' }),
  });

  if (isLoadingReg) {
     return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!regulation) {
    return <div className="p-8 text-center">Regulation not found</div>;
  }

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
       <div className="space-y-6">
         {/* Header */}
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/regulations')}>
               <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
               <h2 className="text-2xl font-bold tracking-tight">{regulation.name} - Curriculum</h2>
               <p className="text-muted-foreground">Manage subjects and credit distribution</p>
            </div>
         </div>

         {/* Program Selection */}
         <Card>
            <CardHeader className="pb-3">
               <CardTitle className="text-lg">Select Program</CardTitle>
               <CardDescription>Choose a program to configure its curriculum structure under this regulation.</CardDescription>
            </CardHeader>
            <CardContent>
               <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="w-[300px]">
                     <SelectValue placeholder="Select Program..." />
                  </SelectTrigger>
                  <SelectContent>
                     {programs.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </CardContent>
         </Card>

         {selectedProgram && (
            <div className="space-y-6">
               {/* Curriculum Status */}
               {!activeVersion ? (
                  <Card className="border-dashed">
                     <CardContent className="py-12 text-center text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium mb-2">No Curriculum Defined</h3>
                        <p className="mb-6">Initialize the curriculum structure for this program to start adding subjects.</p>
                        <Button onClick={() => initCurriculumMutation.mutate()} disabled={initCurriculumMutation.isPending}>
                           {initCurriculumMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                           Initialize Curriculum
                        </Button>
                     </CardContent>
                  </Card>
               ) : (
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-sm px-3 py-1 bg-green-50 text-green-700 border-green-200">
                              Active Version: {activeVersion.version_name}
                           </Badge>
                        </div>
                        <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
                           <DialogTrigger asChild>
                              <Button>
                                 <Plus className="w-4 h-4 mr-2" />
                                 Add Subject
                              </Button>
                           </DialogTrigger>
                           <DialogContent>
                              <DialogHeader>
                                 <DialogTitle>Add Subject to Semester {activeSemester}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                 <div className="space-y-2">
                                    <Label>Subject Name</Label>
                                    <Input value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                       <Label>Code</Label>
                                       <Input value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                       <Label>Credits</Label>
                                       <Input type="number" value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value)})} />
                                    </div>
                                 </div>
                                 <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={newSubject.subject_type} onValueChange={v => setNewSubject({...newSubject, subject_type: v})}>
                                       <SelectTrigger><SelectValue /></SelectTrigger>
                                       <SelectContent>
                                          <SelectItem value="core">Core</SelectItem>
                                          <SelectItem value="elective">Elective</SelectItem>
                                          <SelectItem value="lab">Lab</SelectItem>
                                       </SelectContent>
                                    </Select>
                                 </div>
                                 <Button className="w-full" onClick={() => addSubjectMutation.mutate({...newSubject, semester: parseInt(activeSemester)})} disabled={addSubjectMutation.isPending}>
                                    {addSubjectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add Subject
                                 </Button>
                              </div>
                           </DialogContent>
                        </Dialog>
                     </div>

                     <Tabs value={activeSemester} onValueChange={setActiveSemester} className="w-full">
                        <TabsList className="w-full justify-start h-auto p-2 bg-muted/50 overflow-x-auto">
                           {Array.from({length: 8}, (_, i) => i + 1).map(sem => (
                              <TabsTrigger key={sem} value={sem.toString()} className="px-6 py-2">
                                 Semester {sem}
                              </TabsTrigger>
                           ))}
                        </TabsList>
                        
                        <TabsContent value={activeSemester} className="mt-6">
                           <Card>
                              <CardContent className="p-0">
                                 {subjects.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                       No subjects defined for Semester {activeSemester}
                                    </div>
                                 ) : (
                                    <div className="divide-y">
                                       <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm text-muted-foreground bg-muted/30">
                                          <div className="col-span-2">Code</div>
                                          <div className="col-span-6">Subject</div>
                                          <div className="col-span-2">Type</div>
                                          <div className="col-span-2 text-center">Credits</div>
                                       </div>
                                       {subjects.map((sub: any) => (
                                          <div key={sub.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-muted/10">
                                             <div className="col-span-2 font-mono">{sub.code}</div>
                                             <div className="col-span-6 font-medium">{sub.name}</div>
                                             <div className="col-span-2 capitalize">
                                                <Badge variant="secondary">{sub.subject_type || 'Core'}</Badge>
                                             </div>
                                             <div className="col-span-2 text-center">{sub.credits}</div>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </CardContent>
                           </Card>
                        </TabsContent>
                     </Tabs>
                  </div>
               )}
            </div>
         )}
       </div>
    </AuthenticatedLayout>
  );
}
