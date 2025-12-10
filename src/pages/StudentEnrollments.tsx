import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useStudentEnrollments, useBulkEnrollStudents } from '@/hooks/useStudentEnrollments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, Upload, Download, Loader2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function StudentEnrollments() {
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  
  const { data: cohorts, isLoading: cohortsLoading } = useQuery({
    queryKey: ['cohorts-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*, program:programs(name)')
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  
  const { data: enrollments, isLoading: enrollmentsLoading } = useStudentEnrollments(selectedCohort || null);
  const bulkEnroll = useBulkEnrollStudents();
  
  const filteredEnrollments = enrollments?.filter((e: any) =>
    e.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const handleBulkUpload = async () => {
    if (!selectedCohort || !bulkData.trim()) {
      toast({ title: 'Error', description: 'Please select a cohort and enter student data', variant: 'destructive' });
      return;
    }
    
    // Parse CSV data (format: email,full_name,roll_number)
    const lines = bulkData.trim().split('\n');
    const students = lines.slice(1).map(line => {
      const [email, full_name, roll_number] = line.split(',').map(s => s.trim());
      return { email, full_name, roll_number };
    }).filter(s => s.email && s.roll_number);
    
    if (students.length === 0) {
      toast({ title: 'Error', description: 'No valid student data found', variant: 'destructive' });
      return;
    }
    
    await bulkEnroll.mutateAsync({ cohort_id: selectedCohort, students });
    setIsBulkDialogOpen(false);
    setBulkData('');
  };
  
  const downloadTemplate = () => {
    const csv = 'email,full_name,roll_number\nstudent@example.com,John Doe,2024001';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_enrollment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Student Enrollments</h2>
            <p className="text-muted-foreground">Manage student enrollments in cohorts</p>
          </div>
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedCohort}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Enroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Student Enrollment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV with email, full_name, roll_number
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Paste CSV Data</Label>
                  <Textarea
                    placeholder="email,full_name,roll_number&#10;student@example.com,John Doe,2024001"
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleBulkUpload}
                  disabled={bulkEnroll.isPending}
                >
                  {bulkEnroll.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enroll Students
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a cohort" />
            </SelectTrigger>
            <SelectContent>
              {cohorts?.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name} ({cohort.program?.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedCohort && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>

        {!selectedCohort ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a cohort to view enrolled students</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Enrolled Students
                <Badge variant="secondary" className="ml-2">
                  {filteredEnrollments.length} students
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students enrolled yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments.map((enrollment: any) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-mono">{enrollment.roll_number}</TableCell>
                        <TableCell className="font-medium">
                          {enrollment.profile?.full_name || '—'}
                        </TableCell>
                        <TableCell>{enrollment.profile?.email || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
