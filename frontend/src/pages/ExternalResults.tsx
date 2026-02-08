import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { backlogsApi, cohortsApi, offeringsApi, externalExamsApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUp, Loader2, RefreshCw, Upload, Download, CheckCircle, XCircle, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExternalResult {
  id?: string;
  usn: string;
  subject_code: string;
  subject_name?: string;
  semester: number;
  external_marks: number;
  grade?: string;
  result: string;
  academic_year: string;
  exam_month?: string;
}

export default function ExternalResults() {
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [cohortFilter, setCohortFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [manualEntries, setManualEntries] = useState<ExternalResult[]>([]);
  const [formData, setFormData] = useState<ExternalResult>({
    usn: '',
    subject_code: '',
    semester: 1,
    external_marks: 0,
    result: 'pending',
    academic_year: '2025-26',
  });
  const [selectedOffering, setSelectedOffering] = useState<string>('');
  const [selectedExternalExam, setSelectedExternalExam] = useState<string>('');

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  // Fetch offerings based on cohort selection
  const { data: offerings = [] } = useQuery({
    queryKey: ['offerings', cohortFilter],
    queryFn: () => offeringsApi.list({ cohort_id: cohortFilter !== 'all' ? cohortFilter : undefined }),
    enabled: cohortFilter !== 'all',
  });

  // Fetch external exams for the selected offering
  const { data: externalExams = [] } = useQuery({
    queryKey: ['external-exams', selectedOffering],
    queryFn: () => externalExamsApi.list(selectedOffering),
    enabled: !!selectedOffering,
  });

  // For now, we'll use the backlogs data as external results are stored there
  const { data: results = [], isLoading, refetch } = useQuery({
    queryKey: ['external-results', cohortFilter, semesterFilter, academicYear],
    queryFn: () => backlogsApi.list({
      cohort_id: cohortFilter !== 'all' ? cohortFilter : undefined,
      limit: 100,
    }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // In a real implementation, this would upload to a backend endpoint
      // For now, simulate parsing CSV
      const text = await file.text();
      const lines = text.split('\n').slice(1); // Skip header
      const entries = lines.filter(l => l.trim()).map(line => {
        const [usn, subject_code, semester, external_marks, grade, result] = line.split(',');
        return {
          usn: usn?.trim(),
          subject_code: subject_code?.trim(),
          semester: parseInt(semester) || 1,
          external_marks: parseFloat(external_marks) || 0,
          grade: grade?.trim(),
          result: result?.trim() || 'pending',
          academic_year: academicYear,
        };
      });
      setManualEntries(entries);
      return entries;
    },
    onSuccess: (entries) => {
      toast({ title: `Parsed ${entries.length} external results from file` });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error parsing file',
        description: error.message || 'Failed to parse results file',
        variant: 'destructive',
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExternalExam) {
        throw new Error('Please select an external exam first');
      }
      
      // Transform entries to the format expected by the API
      const marksPayload = manualEntries.map(entry => ({
        usn: entry.usn,
        marks: entry.external_marks,
      }));
      
      // Call the actual backend API
      return await externalExamsApi.importMarks(selectedExternalExam, marksPayload);
    },
    onSuccess: (result) => {
      toast({ 
        title: `Saved ${result.saved_count} external results`,
        description: result.skipped_usns?.length > 0 
          ? `Skipped ${result.skipped_usns.length} unknown USNs`
          : undefined
      });
      setManualEntries([]);
      queryClient.invalidateQueries({ queryKey: ['external-results'] });
      queryClient.invalidateQueries({ queryKey: ['external-marks', selectedExternalExam] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving results',
        description: error.response?.data?.detail || error.message || 'Failed to save external results',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = () => {
    if (!uploadFile) {
      toast({ title: 'Please select a file', variant: 'destructive' });
      return;
    }
    uploadMutation.mutate(uploadFile);
  };

  const handleAddEntry = () => {
    if (!formData.usn || !formData.subject_code) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setManualEntries([...manualEntries, { ...formData }]);
    setFormData({
      usn: '',
      subject_code: '',
      semester: formData.semester,
      external_marks: 0,
      result: 'pending',
      academic_year: academicYear,
    });
    toast({ title: 'Entry added to batch' });
  };

  const handleRemoveEntry = (index: number) => {
    setManualEntries(manualEntries.filter((_, i) => i !== index));
  };

  const getResultBadge = (result: string) => {
    switch (result?.toLowerCase()) {
      case 'pass':
        return <Badge className="bg-green-500">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'absent':
        return <Badge variant="secondary">Absent</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const downloadTemplate = () => {
    const csv = 'USN,Subject Code,Semester,External Marks,Grade,Result\n1SI22CS001,22CS51,5,48,A,pass\n1SI22CS002,22CS51,5,32,C,pass\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'external_results_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">External Results</h2>
            <p className="text-muted-foreground">Import and manage university exam results</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Results
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import External Results</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with external exam results
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Alert>
                    <FileSpreadsheet className="h-4 w-4" />
                    <AlertTitle>CSV Format</AlertTitle>
                    <AlertDescription>
                      Required columns: USN, Subject Code, Semester, External Marks, Grade, Result
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label>Select CSV File</Label>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="e.g., 2025-26"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleFileUpload} 
                    disabled={uploadMutation.isPending || !uploadFile}
                  >
                    {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <FileUp className="w-4 h-4 mr-2" />
                    Parse File
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="space-y-2 w-64">
                <Label>Cohort</Label>
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cohorts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cohorts</SelectItem>
                    {cohorts.map((cohort: any) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-40">
                <Label>Semester</Label>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-40">
                <Label>Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g., 2025-26"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="imported" className="space-y-4">
          <TabsList>
            <TabsTrigger value="imported">Imported Results</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Upload ({manualEntries.length})
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="imported">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No external results found</h3>
                  <p className="text-muted-foreground mb-4">
                    Import external exam results from the university.
                  </p>
                  <Button onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Results
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>External Results</CardTitle>
                  <CardDescription>
                    Showing {results.length} result records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>USN</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>External Marks</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Academic Year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result: any, index: number) => (
                        <TableRow key={result.id || index}>
                          <TableCell className="font-mono">{result.student_usn}</TableCell>
                          <TableCell>
                            {result.offering?.subject?.code || '-'}
                            <span className="text-muted-foreground text-xs block">
                              {result.offering?.subject?.name || 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell>Sem {result.semester_attempted || '-'}</TableCell>
                          <TableCell>{result.external_marks ?? '-'}</TableCell>
                          <TableCell>{result.grade || '-'}</TableCell>
                          <TableCell>{getResultBadge(result.result)}</TableCell>
                          <TableCell>{result.academic_year || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {manualEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No pending entries</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload a file or add entries manually to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Upload</CardTitle>
                  <CardDescription>
                    {manualEntries.length} entries ready to save
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>USN</TableHead>
                        <TableHead>Subject Code</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>External Marks</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{entry.usn}</TableCell>
                          <TableCell>{entry.subject_code}</TableCell>
                          <TableCell>Sem {entry.semester}</TableCell>
                          <TableCell>{entry.external_marks}</TableCell>
                          <TableCell>{entry.grade || '-'}</TableCell>
                          <TableCell>{getResultBadge(entry.result)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEntry(index)}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save All Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>
                  Add individual result entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>USN *</Label>
                    <Input
                      value={formData.usn}
                      onChange={(e) => setFormData({ ...formData, usn: e.target.value })}
                      placeholder="e.g., 1SI22CS001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Offering (Subject) *</Label>
                    <Select
                      value={formData.subject_code}
                      onValueChange={(v) => setFormData({ ...formData, subject_code: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select offering" />
                      </SelectTrigger>
                      <SelectContent>
                        {offerings.map((offering: any) => (
                          <SelectItem key={offering.id} value={offering.subject?.code || offering.id}>
                            {offering.subject?.code} - {offering.subject?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select
                      value={formData.semester.toString()}
                      onValueChange={(v) => setFormData({ ...formData, semester: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <SelectItem key={sem} value={sem.toString()}>
                            Semester {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>External Marks</Label>
                    <Input
                      type="number"
                      value={formData.external_marks}
                      onChange={(e) => setFormData({ ...formData, external_marks: parseFloat(e.target.value) || 0 })}
                      min={0}
                      max={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select
                      value={formData.grade || ''}
                      onValueChange={(v) => setFormData({ ...formData, grade: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="O">O (Outstanding)</SelectItem>
                        <SelectItem value="A+">A+ (Excellent)</SelectItem>
                        <SelectItem value="A">A (Very Good)</SelectItem>
                        <SelectItem value="B+">B+ (Good)</SelectItem>
                        <SelectItem value="B">B (Above Average)</SelectItem>
                        <SelectItem value="C">C (Average)</SelectItem>
                        <SelectItem value="P">P (Pass)</SelectItem>
                        <SelectItem value="F">F (Fail)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Result</Label>
                    <Select
                      value={formData.result}
                      onValueChange={(v) => setFormData({ ...formData, result: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleAddEntry}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Batch
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}

// Plus icon component for the button
function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
