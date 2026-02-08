import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { enrollmentsApi, cohortsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Loader2, Trash2, Upload, FileSpreadsheet, Edit, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function StudentEnrollments() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [cohortFilter, setCohortFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit mode state
  const [editingStudent, setEditingStudent] = useState<any>(null);

  const [formData, setFormData] = useState({
    usn: '',
    name: '',
    email: '',
    cohort_id: '',
    section_id: '',
    admission_semester: 1,
    status: 'active',
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['enrollments', cohortFilter],
    queryFn: () => enrollmentsApi.list(cohortFilter !== 'all' ? { cohort_id: cohortFilter } : undefined),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  // Derived state for sections based on selected cohort in form
  const selectedCohort = cohorts.find((c: any) => c.id === formData.cohort_id);
  const availableSections = selectedCohort?.sections || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => enrollmentsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Student created successfully' });
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating student',
        description: error.response?.data?.detail || 'Failed to create student',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ usn, data }: { usn: string; data: any }) => enrollmentsApi.update(usn, data),
    onSuccess: () => {
      toast({ title: 'Student updated successfully' });
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating student',
        description: error.response?.data?.detail || 'Failed to update student',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (usn: string) => enrollmentsApi.delete(usn),
    onSuccess: () => {
      toast({ title: 'Student removed' });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to remove student',
        variant: 'destructive',
      });
    },
  });

  // Helper to download error log
  const downloadErrorLog = (errors: any[]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Row,Error\n" 
        + errors.map((e: any) => `${e.row},"${e.error.replace(/"/g, '""')}"`).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_upload_errors.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const bulkUploadMutation = useMutation({
    mutationFn: (file: File) => enrollmentsApi.bulkUpload(file),
    onSuccess: (data: any) => {
      toast({ 
        title: 'Bulk upload complete', 
        description: `Success: ${data.success_count}, Errors: ${data.errors.length}` 
      });
      
      if (data.errors.length > 0) {
        console.error("Bulk Upload Errors:", data.errors);
        toast({
            title: "Upload finished with errors",
            description: "Downloading error log...",
            variant: "destructive"
        });
        downloadErrorLog(data.errors);
      }
      
      setIsBulkOpen(false);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.response?.data?.detail || 'Failed to upload file',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      usn: '',
      name: '',
      email: '',
      cohort_id: '',
      section_id: '',
      admission_semester: 1,
      status: 'active',
    });
    setEditingStudent(null);
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setFormData({
      usn: student.usn,
      name: student.name,
      email: student.email || '',
      cohort_id: student.cohort_id,
      section_id: student.section_id || '',
      admission_semester: student.admission_semester,
      status: student.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.usn || !formData.name || !formData.cohort_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in USN, Name and Cohort.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
        ...formData,
        section_id: formData.section_id || null, // Handle empty string
        email: formData.email || null,
    };

    if (editingStudent) {
        updateMutation.mutate({ usn: editingStudent.usn, data: payload });
    } else {
        createMutation.mutate(payload);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      bulkUploadMutation.mutate(file);
    }
  };

  const filteredStudents = students.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Student Management</h2>
            <p className="text-muted-foreground">Manage students and cohort assignments (USN based)</p>
          </div>
          <div className="flex gap-2">
            {/* Bulk Upload Dialog */}
            <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Students</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Upload a CSV file with the following columns:
                        <br />
                        <code className="bg-muted p-1 rounded">usn, name, email, cohort_name, section_name, admission_semester</code>
                    </p>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv_file">CSV File</Label>
                        <Input id="csv_file" type="file" accept=".csv" onChange={handleBulkUpload} disabled={bulkUploadMutation.isPending} />
                    </div>
                    {bulkUploadMutation.isPending && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading and processing...
                        </div>
                    )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>USN</Label>
                        <Input
                        value={formData.usn}
                        onChange={(e) => setFormData({ ...formData, usn: e.target.value })}
                        placeholder="e.g., 1PI23CS001"
                        disabled={!!editingStudent} // USN is immutable
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Admission Semester</Label>
                        <Input
                            type="number"
                            min={1}
                            max={8}
                            value={formData.admission_semester}
                            onChange={(e) => setFormData({ ...formData, admission_semester: parseInt(e.target.value) || 1 })}
                        />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Student Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email (Optional)</Label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="student@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Cohort</Label>
                        <Select
                        value={formData.cohort_id}
                        onValueChange={(v) => setFormData({ ...formData, cohort_id: v, section_id: '' })} // Reset section on cohort change
                        >
                        <SelectTrigger>
                            <SelectValue placeholder="Select cohort" />
                        </SelectTrigger>
                        <SelectContent>
                            {cohorts.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Section (Optional)</Label>
                        <Select
                        value={formData.section_id}
                        onValueChange={(v) => setFormData({ ...formData, section_id: v })}
                        disabled={!formData.cohort_id || availableSections.length === 0}
                        >
                        <SelectTrigger>
                            <SelectValue placeholder={availableSections.length === 0 ? "No sections" : "Select section"} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSections.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                  </div>
                  
                  {editingStudent && (
                      <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(v) => setFormData({ ...formData, status: v })}
                          >
                              <SelectTrigger>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="detained">Detained</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  )}

                  <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingStudent ? 'Update Student' : 'Create Student'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or USN..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                />
            </div>
            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {cohorts.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No students found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>USN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s: any) => (
                    <TableRow key={s.usn}>
                      <TableCell className="font-medium font-mono">{s.usn}</TableCell>
                      <TableCell>
                          <div>{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                      </TableCell>
                      <TableCell>{s.cohort?.name || 'N/A'}</TableCell>
                      <TableCell>{s.section?.name || '-'}</TableCell>
                      <TableCell>{s.admission_semester}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'active' ? 'default' : s.status === 'completed' ? 'secondary' : 'destructive'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(s)}
                            >
                            <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(s.usn)}
                            disabled={deleteMutation.isPending}
                            >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
      </div>
    </AuthenticatedLayout>
  );
}
