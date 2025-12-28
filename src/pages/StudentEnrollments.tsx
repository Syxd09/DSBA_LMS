import { useState, useRef } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Upload, Download, Loader2, Users, FileSpreadsheet, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function StudentEnrollments() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Context selection state
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [bulkResults, setBulkResults] = useState<{ success: number; created: number; errors: any[] } | null>(null);
  
  // Single student form
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    rollNumber: '',
  });
  
  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments');
      return data || [];
    },
  });
  
  // Fetch cohorts filtered by department
  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts', selectedDepartment],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      // Filter cohorts by department if needed
      if (selectedDepartment) {
        return (data || []).filter((c: any) => 
          c.program?.departmentId === selectedDepartment
        );
      }
      return data || [];
    },
  });
  
  // Fetch enrollments with context filtering
  const { data: enrollments, isLoading: enrollmentsLoading, refetch } = useQuery({
    queryKey: ['student-enrollments', selectedDepartment, selectedCohort, selectedSemester],
    queryFn: async () => {
      if (!selectedCohort) return [];
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('departmentId', selectedDepartment);
      if (selectedCohort) params.append('cohortId', selectedCohort);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const { data } = await api.get(`/enrollments?${params.toString()}`);
      return data || [];
    },
    enabled: !!selectedCohort,
  });
  
  const filteredEnrollments = enrollments?.filter((e: any) =>
    e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.student?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.student?.mobileNumber?.includes(searchQuery)
  ) || [];
  
  // Get current cohort details for semester dropdown
  const currentCohort = cohorts.find((c: any) => c.id === selectedCohort);
  const maxSemester = currentCohort?.program?.durationYears ? currentCohort.program.durationYears * 2 : 8;
  
  // Handle single student enrollment
  const handleSingleEnroll = async () => {
    if (!selectedCohort || !selectedDepartment || !newStudent.fullName || !newStudent.email || !newStudent.rollNumber) {
      toast({ title: 'Error', description: 'Please fill all required fields and select Department/Cohort', variant: 'destructive' });
      return;
    }
    
    try {
      await api.post('/enrollments', {
        cohortId: selectedCohort,
        departmentId: selectedDepartment,
        semester: parseInt(selectedSemester) || 1,
        ...newStudent
      });
      
      toast({ title: 'Success', description: `${newStudent.fullName} enrolled successfully` });
      setNewStudent({ fullName: '', email: '', mobileNumber: '', rollNumber: '' });
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to enroll student',
        variant: 'destructive'
      });
    }
  };
  
  // Handle CSV file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setBulkData(text);
    };
    reader.readAsText(file);
  };
  
  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!selectedCohort || !selectedDepartment || !bulkData.trim()) {
      toast({ title: 'Error', description: 'Please select Department/Cohort and enter/upload student data', variant: 'destructive' });
      return;
    }
    
    // Parse CSV data
    const lines = bulkData.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const students = lines.slice(1).map(line => {
      const values = line.split(',').map(s => s.trim());
      const student: any = {};
      
      headers.forEach((header, idx) => {
        const key = header.replace(/_/g, '').replace('fullname', 'fullName')
          .replace('rollnumber', 'rollNumber').replace('mobilenumber', 'mobileNumber');
        student[key] = values[idx] || '';
      });
      
      return student;
    }).filter(s => s.email && s.rollNumber);
    
    if (students.length === 0) {
      toast({ title: 'Error', description: 'No valid student data found in CSV', variant: 'destructive' });
      return;
    }
    
    try {
      const response = await api.post('/enrollments/bulk', { 
        cohortId: selectedCohort, 
        departmentId: selectedDepartment,
        semester: parseInt(selectedSemester) || 1,
        students 
      });
      setBulkResults(response.data);
      
      if (response.data.success > 0) {
        toast({ 
          title: 'Bulk Enrollment Complete', 
          description: `Enrolled ${response.data.success} students, created ${response.data.created} new users`
        });
        refetch();
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Bulk enrollment failed',
        variant: 'destructive'
      });
    }
  };
  
  const downloadTemplate = () => {
    const csv = 'email,full_name,roll_number,mobile_number\nstudent@example.com,John Doe,2024001,9876543210';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_enrollment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const resetBulkForm = () => {
    setBulkData('');
    setBulkResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const contextSelected = selectedDepartment && selectedCohort;

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Student Enrollments</h2>
            <p className="text-muted-foreground">Enroll students by department, cohort, and semester</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetBulkForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!contextSelected}>
                <UserPlus className="w-4 h-4 mr-2" />
                Enroll Students
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Enroll Students</DialogTitle>
                <DialogDescription>
                  Enrolling to: {departments.find((d: any) => d.id === selectedDepartment)?.name} / {currentCohort?.name} / Semester {selectedSemester}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="single" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Single Student
                  </TabsTrigger>
                  <TabsTrigger value="bulk">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </TabsTrigger>
                </TabsList>
                
                {/* Single Student Tab */}
                <TabsContent value="single" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={newStudent.fullName}
                        onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newStudent.email}
                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                        placeholder="student@college.edu"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Roll Number *</Label>
                      <Input
                        value={newStudent.rollNumber}
                        onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                        placeholder="2024001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input
                        value={newStudent.mobileNumber}
                        onChange={(e) => setNewStudent({ ...newStudent, mobileNumber: e.target.value })}
                        placeholder="9876543210"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A student user will be created automatically with default password: Student@123
                  </p>
                  <Button className="w-full" onClick={handleSingleEnroll}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Enroll Student
                  </Button>
                </TabsContent>
                
                {/* Bulk Upload Tab */}
                <TabsContent value="bulk" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-4 border border-dashed border-border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Upload CSV File</p>
                        <p className="text-sm text-muted-foreground">
                          Format: email, full_name, roll_number, mobile_number
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="w-4 h-4 mr-2" />
                        Template
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>CSV Data (or paste here)</Label>
                    <Textarea
                      placeholder="email,full_name,roll_number,mobile_number&#10;student@example.com,John Doe,2024001,9876543210"
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  {/* Results Display */}
                  {bulkResults && (
                    <Card className={bulkResults.errors.length > 0 ? 'border-yellow-500/50' : 'border-green-500/50'}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4 mb-3">
                          {bulkResults.errors.length === 0 ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {bulkResults.success} enrolled, {bulkResults.created} users created
                            </p>
                            {bulkResults.errors.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {bulkResults.errors.length} errors
                              </p>
                            )}
                          </div>
                        </div>
                        {bulkResults.errors.length > 0 && (
                          <div className="max-h-32 overflow-y-auto text-sm">
                            {bulkResults.errors.map((err, idx) => (
                              <div key={idx} className="text-destructive py-1">
                                Row {err.row}: {err.email} - {err.error}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  <Button 
                    className="w-full" 
                    onClick={handleBulkUpload}
                    disabled={!bulkData.trim()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Enroll Students
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Context Selection - Cascading Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Select Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={selectedDepartment} onValueChange={(val) => {
                  setSelectedDepartment(val);
                  setSelectedCohort(''); // Reset cohort when department changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Cohort */}
              <div className="space-y-2">
                <Label>Cohort</Label>
                <Select value={selectedCohort} onValueChange={setSelectedCohort} disabled={!selectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedDepartment ? "Select cohort" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort: any) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.program?.code || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Semester */}
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester} disabled={!selectedCohort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxSemester }, (_, i) => i + 1).map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        {contextSelected && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, roll number, email, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Enrollment Table */}
        {!contextSelected ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select Context First</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Choose a Department, Cohort, and Semester to view and manage enrolled students
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Enrolled Students
                <Badge variant="secondary">{filteredEnrollments.length}</Badge>
              </CardTitle>
              <CardDescription>
                {departments.find((d: any) => d.id === selectedDepartment)?.name} → {currentCohort?.name} → Semester {selectedSemester}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Students Enrolled</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by enrolling your first student
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Enroll Students
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments.map((enrollment: any) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-mono font-medium">{enrollment.rollNumber}</TableCell>
                        <TableCell className="font-medium">
                          {enrollment.student?.fullName || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {enrollment.student?.email || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {enrollment.student?.mobileNumber || '—'}
                        </TableCell>
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
