import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Target, Loader2, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CourseOutcome {
  id: string;
  co_number: number;
  description: string;
  bloom_level: string;
  subject_id: string;
  created_at: string;
  subjects?: {
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
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCO, setNewCO] = useState({
    subject_id: '',
    co_number: 1,
    description: '',
    bloom_level: 'Remember',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cosRes, subjectsRes] = await Promise.all([
        supabase.from('course_outcomes').select('*, subjects(name, code)').order('subject_id').order('co_number'),
        supabase.from('subjects').select('*').order('code'),
      ]);

      if (cosRes.error) throw cosRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

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
    if (!newCO.subject_id || !newCO.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('course_outcomes').insert({
        subject_id: newCO.subject_id,
        co_number: newCO.co_number,
        description: newCO.description,
        bloom_level: newCO.bloom_level,
      });

      if (error) throw error;

      toast({
        title: 'Course Outcome created',
        description: `CO${newCO.co_number} has been created successfully.`,
      });

      setIsDialogOpen(false);
      setNewCO({ subject_id: '', co_number: 1, description: '', bloom_level: 'Remember' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating CO:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create course outcome.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCOs = courseOutcomes.filter(co => {
    const matchesSearch = co.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.subjects?.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || co.subject_id === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Group COs by subject
  const groupedCOs = filteredCOs.reduce((acc, co) => {
    const subjectCode = co.subjects?.code || 'Unknown';
    if (!acc[subjectCode]) {
      acc[subjectCode] = {
        subjectName: co.subjects?.name || 'Unknown',
        cos: [],
      };
    }
    acc[subjectCode].cos.push(co);
    return acc;
  }, {} as Record<string, { subjectName: string; cos: CourseOutcome[] }>);

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Course Outcomes</h2>
            <p className="text-muted-foreground">Manage course outcomes and Bloom's taxonomy mappings</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add CO
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Course Outcome</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={newCO.subject_id}
                    onValueChange={(value) => setNewCO({ ...newCO, subject_id: value })}
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
                      value={newCO.co_number}
                      onChange={(e) => setNewCO({ ...newCO, co_number: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bloom's Level</Label>
                    <Select
                      value={newCO.bloom_level}
                      onValueChange={(value) => setNewCO({ ...newCO, bloom_level: value })}
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
                    'Create Course Outcome'
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
                <CardContent>
                  <div className="space-y-3">
                    {cos.map((co) => (
                      <div
                        key={co.id}
                        className="flex items-start gap-4 p-3 border border-border bg-background"
                      >
                        <Badge variant="outline" className="shrink-0">
                          CO{co.co_number}
                        </Badge>
                        <p className="text-sm text-foreground flex-1">{co.description}</p>
                        <Badge className={bloomColors[co.bloom_level] || ''}>
                          {co.bloom_level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
