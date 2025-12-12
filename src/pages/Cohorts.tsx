import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Users, Loader2, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Cohort {
  id: string;
  name: string;
  year: number;
  current_semester: number;
  program_id: string;
  created_at: string;
  programs?: {
    name: string;
    code: string;
    duration_years: number;
  };
}

interface Program {
  id: string;
  name: string;
  code: string;
  duration_years: number;
}

export default function Cohorts() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCohort, setNewCohort] = useState({
    name: '',
    year: new Date().getFullYear(),
    program_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cohortsRes, programsRes] = await Promise.all([
        supabase.from('cohorts').select('*, programs(name, code, duration_years)').order('year', { ascending: false }),
        supabase.from('programs').select('*').order('name'),
      ]);

      if (cohortsRes.error) throw cohortsRes.error;
      if (programsRes.error) throw programsRes.error;

      setCohorts(cohortsRes.data || []);
      setPrograms(programsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch cohorts.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCohort = async () => {
    if (!newCohort.name || !newCohort.program_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('cohorts').insert({
        name: newCohort.name,
        year: newCohort.year,
        program_id: newCohort.program_id,
        current_semester: 1,
      });

      if (error) throw error;

      toast({
        title: 'Cohort created',
        description: `${newCohort.name} has been created successfully.`,
      });

      setIsDialogOpen(false);
      setNewCohort({ name: '', year: new Date().getFullYear(), program_id: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating cohort:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create cohort.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCohorts = cohorts.filter(cohort =>
    cohort.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cohort.programs?.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Cohorts</h2>
            <p className="text-muted-foreground">Manage student batches and cohorts</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  <Label>Cohort Name</Label>
                  <Input
                    value={newCohort.name}
                    onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })}
                    placeholder="e.g., BCA 2024-27"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Admission Year</Label>
                    <Input
                      type="number"
                      value={newCohort.year}
                      onChange={(e) => setNewCohort({ ...newCohort, year: parseInt(e.target.value) || new Date().getFullYear() })}
                      min={2000}
                      max={2100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Program</Label>
                    <Select
                      value={newCohort.program_id}
                      onValueChange={(value) => setNewCohort({ ...newCohort, program_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateCohort} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Cohort'
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
              placeholder="Search cohorts..."
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
          ) : filteredCohorts.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No cohorts found</h3>
              <p className="text-muted-foreground">Create your first cohort to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Admission Year</TableHead>
                  <TableHead>Current Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCohorts.map((cohort) => {
                  const maxSemester = (cohort.programs?.duration_years || 3) * 2;
                  const isActive = cohort.current_semester <= maxSemester;
                  return (
                    <TableRow key={cohort.id}>
                      <TableCell className="font-medium">{cohort.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cohort.programs?.code || '—'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {cohort.year}
                        </div>
                      </TableCell>
                      <TableCell>Semester {cohort.current_semester}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isActive ? 'Active' : 'Completed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => window.location.href = '/student-enrollments'}>
                          Manage Students
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
