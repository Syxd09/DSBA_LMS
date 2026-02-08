import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { templatesApi, programsApi, cohortsApi, offeringsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText, Award, GraduationCap, Target, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'co_po' | 'naac' | 'nba';
  requiresProgram?: boolean;
  requiresSubject?: boolean;
}

const reportTypes: ReportType[] = [
  {
    id: 'co-attainment',
    name: 'CO Attainment Report',
    description: 'Course Outcome attainment analysis (NBA Criterion 3 & 4)',
    icon: <Target className="w-5 h-5" />,
    category: 'co_po',
    requiresSubject: true,
  },
  {
    id: 'po-matrix',
    name: 'PO Attainment Matrix',
    description: 'Program Outcome mapping and attainment',
    icon: <Award className="w-5 h-5" />,
    category: 'co_po',
    requiresProgram: true,
  },
  {
    id: 'pso-matrix',
    name: 'PSO Attainment Matrix',
    description: 'Program Specific Outcomes analysis',
    icon: <BookOpen className="w-5 h-5" />,
    category: 'co_po',
    requiresProgram: true,
  },
  {
    id: 'naac-criterion-2',
    name: 'NAAC Criterion 2',
    description: 'Teaching-Learning and Evaluation (2.6.1, 2.6.2)',
    icon: <GraduationCap className="w-5 h-5" />,
    category: 'naac',
    requiresProgram: true,
  },
  {
    id: 'naac-criterion-3',
    name: 'NAAC Criterion 3',
    description: 'Research, Innovations and Extension',
    icon: <GraduationCap className="w-5 h-5" />,
    category: 'naac',
    requiresProgram: true,
  },
  {
    id: 'nba-sar',
    name: 'NBA SAR',
    description: 'Self-Assessment Report for NBA accreditation',
    icon: <FileText className="w-5 h-5" />,
    category: 'nba',
    requiresProgram: true,
  },
];

export default function Reports() {
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedOffering, setSelectedOffering] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2024');
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programsApi.list(),
  });

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts', selectedProgram],
    queryFn: () => cohortsApi.list({ program_id: selectedProgram }),
    enabled: !!selectedProgram,
  });

  const { data: offerings = [] } = useQuery({
    queryKey: ['offerings', selectedCohort],
    queryFn: () => offeringsApi.list({ cohort_id: selectedCohort }),
    enabled: !!selectedCohort,
  });

  const handleDownload = async (reportId: string, format: 'json' | 'pdf') => {
    setDownloading(reportId);
    try {
      let data;
      const year = parseInt(academicYear);

      switch (reportId) {
        case 'co-attainment':
          if (!selectedOffering) {
            toast({ title: 'Select an offering first', variant: 'destructive' });
            return;
          }
          data = await templatesApi.getCOAttainmentReport(selectedOffering, format);
          break;

        case 'po-matrix':
          if (!selectedProgram) {
            toast({ title: 'Select a program first', variant: 'destructive' });
            return;
          }
          data = await templatesApi.getPOMatrixReport(selectedProgram, academicYear, format);
          break;

        case 'pso-matrix':
          if (!selectedProgram) {
            toast({ title: 'Select a program first', variant: 'destructive' });
            return;
          }
          data = await templatesApi.getPSOMatrixReport(selectedProgram, academicYear, format);
          break;

        case 'naac-criterion-2':
          if (!selectedProgram) {
            toast({ title: 'Select a program first', variant: 'destructive' });
            return;
          }
          data = await templatesApi.getNAACCriterion2Report(selectedProgram, academicYear, format);
          break;

        case 'naac-criterion-3':
          if (!selectedProgram) {
            toast({ title: 'Select a program first', variant: 'destructive' });
            return;
          }
          data = await templatesApi.getNAACCriterion3Report(selectedProgram, academicYear, format);
          break;

        case 'nba-sar':
          if (!selectedProgram) {
            toast({ title: 'Select a program first', variant: 'destructive' });
            return;
          }
          // NBA SAR combines Criterion 2 data with CO-PO matrix
          data = await templatesApi.getNBASARReport(selectedProgram, academicYear, format);
          break;

        default:
          toast({ title: 'Report not implemented yet', variant: 'destructive' });
          return;
      }


      if (format === 'pdf' && data instanceof Blob) {
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportId}_report.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // For JSON, create downloadable file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportId}_report.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      toast({ title: `${reportId.replace(/-/g, ' ').toUpperCase()} downloaded` });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.response?.data?.detail || 'Could not generate report',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'co_po':
        return <Badge className="bg-blue-500">CO/PO</Badge>;
      case 'naac':
        return <Badge className="bg-purple-600">NAAC</Badge>;
      case 'nba':
        return <Badge className="bg-green-600">NBA</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports & Templates</h2>
          <p className="text-muted-foreground">
            Generate NBA/NAAC compliant reports and attainment analysis
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cohort (for CO reports)</label>
                <Select value={selectedCohort} onValueChange={(v) => { setSelectedCohort(v); setSelectedOffering(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Offering (Subject for CO)</label>
                <Select value={selectedOffering} onValueChange={setSelectedOffering} disabled={!selectedCohort}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCohort ? "Select offering" : "Select cohort first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {offerings.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.subject?.code} - {o.subject?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Academic Year</label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024-25</SelectItem>
                    <SelectItem value="2023">2023-24</SelectItem>
                    <SelectItem value="2022">2022-23</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">{report.icon}</div>
                    <div>
                      <CardTitle className="text-base">{report.name}</CardTitle>
                      {getCategoryBadge(report.category)}
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(report.id, 'json')}
                    disabled={downloading === report.id}
                  >
                    {downloading === report.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1" />
                        JSON
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(report.id, 'pdf')}
                    disabled={downloading === report.id}
                  >
                    {downloading === report.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-1" />
                        PDF
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
