import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Plus, Users, BookOpen, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Program {
  id: string;
  name: string;
  code: string;
  duration_years: number;
  department_id: string | null;
  created_at: string;
  departments?: {
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: '',
    code: '',
    duration_years: 3,
    department_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [programsRes, departmentsRes] = await Promise.all([
        supabase.from('programs').select('*, departments(name, code)').order('name'),
        supabase.from('departments').select('*').order('name'),
      ]);

      if (programsRes.error) throw programsRes.error;
      if (departmentsRes.error) throw departmentsRes.error;

      setPrograms(programsRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch programs.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    if (!newProgram.name || !newProgram.code) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('programs').insert({
        name: newProgram.name,
        code: newProgram.code.toUpperCase(),
        duration_years: newProgram.duration_years,
        department_id: newProgram.department_id || null,
      });

      if (error) throw error;

      toast({
        title: 'Program created',
        description: `${newProgram.name} has been created successfully.`,
      });

      setIsDialogOpen(false);
      setNewProgram({ name: '', code: '', duration_years: 3, department_id: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating program:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create program.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Programs</h2>
            <p className="text-muted-foreground">Manage academic programs and degrees</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Program</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Program Name</Label>
                  <Input
                    value={newProgram.name}
                    onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                    placeholder="e.g., Bachelor of Computer Applications"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Code</Label>
                  <Input
                    value={newProgram.code}
                    onChange={(e) => setNewProgram({ ...newProgram, code: e.target.value })}
                    placeholder="e.g., BCA"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (Years)</Label>
                    <Input
                      type="number"
                      value={newProgram.duration_years}
                      onChange={(e) => setNewProgram({ ...newProgram, duration_years: parseInt(e.target.value) || 3 })}
                      min={1}
                      max={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={newProgram.department_id}
                      onValueChange={(value) => setNewProgram({ ...newProgram, department_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateProgram} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Program'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : programs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No programs yet</h3>
              <p className="text-muted-foreground mb-4">Create your first academic program to get started.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{program.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{program.code}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <Badge variant="outline">{program.duration_years} Years</Badge>
                    </div>
                    {program.departments && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Department</span>
                        <span className="font-medium">{program.departments.code}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>0 Cohorts</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>0 Curriculum Versions</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Cohorts
                    </Button>
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
