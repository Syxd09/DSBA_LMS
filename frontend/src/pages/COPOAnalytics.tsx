import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { analyticsApi, subjectsApi, templatesApi } from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, Brain, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { toast } from '@/hooks/use-toast';

export default function COPOAnalytics() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: coAttainment, isLoading } = useQuery({
    queryKey: ['co-attainment', selectedSubject],
    queryFn: () => analyticsApi.getCOAttainment(selectedSubject),
    enabled: !!selectedSubject,
  });

  const outcomes = coAttainment?.outcomes || [];
  const poContribution = coAttainment?.po_contribution || [];

  // Prepare radar data from real PO contribution data
  const radarData = poContribution.length > 0
    ? poContribution.map((po: any) => ({
        subject: `PO${po.po_number}`,
        A: po.contribution || 0,
        fullMark: 100,
      }))
    : [];

  // PDF Download handler
  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    if (!selectedSubject) return;
    
    setIsDownloading(true);
    try {
      const blob = await templatesApi.getCOAttainmentReport(selectedSubject, format);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `co_attainment_report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast({ title: `Report downloaded as ${format.toUpperCase()}` });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.response?.data?.detail || 'Could not generate report',
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">CO-PO Analytics</h2>
            <p className="text-muted-foreground">Course Outcome and Program Outcome analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubject && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('pdf')}
                  disabled={isDownloading}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="ml-1">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('xlsx')}
                  disabled={isDownloading}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="ml-1">Excel</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {!selectedSubject ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a subject to view CO-PO analytics</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* CO Attainment Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Course Outcome Attainment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {outcomes.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outcomes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="co_number"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickFormatter={(v) => `CO${v}`}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Bar dataKey="attainment" fill="hsl(var(--primary))" name="Attainment %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No CO attainment data available. Data will appear after exams are graded.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* CO Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">CO Details</CardTitle>
              </CardHeader>
              <CardContent>
                {outcomes.length > 0 ? (
                  <div className="space-y-4">
                    {outcomes.map((co: any) => (
                      <div key={co.co_number} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">CO{co.co_number}</Badge>
                            <span className="text-sm">{co.description}</span>
                          </div>
                          <Badge variant={co.attainment >= (co.target || 70) ? 'default' : 'destructive'}>
                            {co.attainment?.toFixed(1) || 0}%
                          </Badge>
                        </div>
                        <Progress value={co.attainment || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: {co.target || 70}%
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No course outcomes defined for this subject yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* PO Mapping Radar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Program Outcome Contribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Radar name="Contribution" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No CO-PO mapping configured. Set up CO-PO mappings to see contribution analysis.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
