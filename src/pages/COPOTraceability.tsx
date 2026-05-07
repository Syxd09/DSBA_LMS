import { useState } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Target, TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { useAvailableSemesters } from '@/hooks/useAvailableSemesters';

interface TraceabilityData {
  context: {
    program: { id: string; name: string; code: string };
    cohort: { id: string; name: string; year: number };
    semester: number;
    academicYear: string;
    subject: { id: string; name: string; code: string; credits: number };
    lastCalculated: string | null;
  };
  coAttainments: Array<{
    id: string;
    co: { id: string; coNumber: number; description: string };
    achievedPercent: number;
    targetPercent: number;
    level: number;
    passCount: number;
    studentCount: number;
    poMappings: Array<{
      po: { id: string; poNumber: number; description: string };
      correlationLevel: number;
    }>;
  }>;
  poAttainments: Array<{
    id: string;
    po: { id: string; poNumber: number; description: string };
    achievedPercent: number;
    targetPercent: number;
    level: number;
    weightedSum: number;
    totalWeight: number;
    breakdown: Array<{
      co: { id: string; coNumber: number };
      coAttainment: number;
      correlationLevel: number;
      product: number;
    }>;
  }>;
}

const getAttainmentLevel = (percent: number): { level: number; label: string; color: string } => {
  if (percent >= 80) return { level: 3, label: 'Strongly Attained', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
  if (percent >= 60) return { level: 2, label: 'Attained', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
  if (percent >= 40) return { level: 1, label: 'Partially Attained', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
  return { level: 0, label: 'Not Attained', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
};

const getCorrelationLabel = (level: number): string => {
  if (level === 3) return 'Strong';
  if (level === 2) return 'Medium';
  if (level === 1) return 'Weak';
  return 'None';
};

export default function COPOTraceability() {
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const availableSemesters = useAvailableSemesters(selectedCohort, selectedProgram);

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data } = await api.get('/programs');
      return data || [];
    },
  });

  // Fetch cohorts (filtered by program if selected)
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts-list', selectedProgram],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      const allCohorts = data || [];
      if (selectedProgram) {
        return allCohorts.filter((c: any) => c.programId === selectedProgram);
      }
      return allCohorts;
    },
  });

  // Fetch all subjects (program filter removed - was returning 0 results)
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data || [];
    },
  });

  // Fetch traceability data
  const { data: traceabilityData, isLoading, error } = useQuery<TraceabilityData>({
    queryKey: ['co-po-traceability', selectedSubject, selectedCohort, selectedSemester],
    queryFn: async () => {
      const { data } = await api.get(
        `/analytics/co-po-traceability/${selectedSubject}/${selectedCohort}/${selectedSemester}`
      );
      return data;
    },
    enabled: !!selectedSubject && !!selectedCohort && !!selectedSemester,
  });

  return (
    <AuthenticatedLayout allowedRoles={['admin', 'principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">CO-PO Attainment Traceability</h2>
          <p className="text-muted-foreground">
            Comprehensive view of how Course Outcomes contribute to Program Outcomes
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Select Context</CardTitle>
            <CardDescription>Choose program, cohort, semester, and subject to view traceability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Program</label>
                <Select value={selectedProgram} onValueChange={(val) => {
                  setSelectedProgram(val);
                  setSelectedCohort('');
                  setSelectedSubject('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map((program: any) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name} ({program.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cohort/Batch</label>
                <Select value={selectedCohort} onValueChange={setSelectedCohort} disabled={!selectedProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts?.map((cohort: any) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Semester</label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester} disabled={!selectedCohort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSemesters.map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load traceability data. Please ensure CO and PO attainments have been calculated.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!selectedSubject &&  !isLoading && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please select all filters above to view CO-PO traceability data.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {traceabilityData && !isLoading && (
          <>
            {/* Academic Context */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Academic Context</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Program</p>
                    <p className="font-semibold">
                      {traceabilityData.context.program.name} ({traceabilityData.context.program.code})
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cohort/Batch</p>
                    <p className="font-semibold">
                      {traceabilityData.context.cohort.name} ({traceabilityData.context.cohort.year})
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Semester</p>
                    <p className="font-semibold">Semester {traceabilityData.context.semester}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Academic Year</p>
                    <p className="font-semibold">{traceabilityData.context.academicYear}</p>
                  </div>
                  {traceabilityData.context.lastCalculated && (
                    <div>
                      <p className="text-muted-foreground text-xs">Last Calculated</p>
                      <p className="font-semibold text-xs">
                        {format(new Date(traceabilityData.context.lastCalculated), 'dd-MMM-yyyy hh:mm a')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm">
                    <span className="font-semibold">Subject:</span> {traceabilityData.context.subject.name} (
                    {traceabilityData.context.subject.code}) • {traceabilityData.context.subject.credits} Credits
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CO Attainment Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Course Outcome Attainment</h3>
              <div className="space-y-4">
                {traceabilityData.coAttainments.map((coAtt) => {
                  const levelInfo = getAttainmentLevel(coAtt.achievedPercent);
                  const isAchieved = coAtt.achievedPercent >= coAtt.targetPercent;

                  return (
                    <Card key={coAtt.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="text-base">
                                CO{coAtt.co.coNumber}
                              </Badge>
                              <h4 className="font-medium">{coAtt.co.description}</h4>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Attainment:</span>
                                <span className="font-bold text-lg">{coAtt.achievedPercent.toFixed(1)}%</span>
                                <span className="text-muted-foreground">
                                  ({coAtt.passCount}/{coAtt.studentCount} students)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Target:</span>
                                <span className="font-semibold">{coAtt.targetPercent}%</span>
                              </div>
                              {isAchieved ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                          </div>
                          <Badge className={levelInfo.color}>
                            Level {levelInfo.level} - {levelInfo.label}
                          </Badge>
                        </div>

                        {coAtt.poMappings.length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Contributes to:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {coAtt.poMappings.map((mapping) => (
                                <div key={mapping.po.id} className="flex items-center gap-2 text-sm">
                                  <Badge variant="secondary" className="text-xs">
                                    PO{mapping.po.poNumber}
                                  </Badge>
                                  <span className="text-muted-foreground flex-1">
                                    {mapping.po.description.substring(0, 40)}...
                                  </span>
                                  <Badge
                                    className={
                                      mapping.correlationLevel === 3
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30'
                                        : mapping.correlationLevel === 2
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30'
                                    }
                                  >
                                    Level {mapping.correlationLevel} ({getCorrelationLabel(mapping.correlationLevel)})
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* PO Attainment Section */}
            {traceabilityData.poAttainments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Program Outcome Attainment (Derived from COs)</h3>
                <div className="space-y-4">
                  {traceabilityData.poAttainments.map((poAtt) => {
                    const levelInfo = getAttainmentLevel(poAtt.achievedPercent);
                    const isAchieved = poAtt.achievedPercent >= poAtt.targetPercent;

                    return (
                      <Card key={poAtt.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-base">
                                  PO{poAtt.po.poNumber}
                                </Badge>
                                <CardTitle className="text-base">{poAtt.po.description}</CardTitle>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Attainment:</span>
                                  <span className="font-bold text-lg">{poAtt.achievedPercent.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Target:</span>
                                  <span className="font-semibold">{poAtt.targetPercent}%</span>
                                </div>
                                {isAchieved ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                                )}
                              </div>
                            </div>
                            <Badge className={levelInfo.color}>
                              Level {levelInfo.level} - {levelInfo.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium mb-2">Calculation Breakdown:</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse border">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      <th className="border p-2 text-left">CO</th>
                                      <th className="border p-2 text-right">CO Attainment %</th>
                                      <th className="border p-2 text-center">Correlation Level</th>
                                      <th className="border p-2 text-right">Product</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {poAtt.breakdown.map((item) => (
                                      <tr key={item.co.id}>
                                        <td className="border p-2 font-medium">CO{item.co.coNumber}</td>
                                        <td className="border p-2 text-right">{item.coAttainment.toFixed(1)}%</td>
                                        <td className="border p-2 text-center">{item.correlationLevel}</td>
                                        <td className="border p-2 text-right font-mono">
                                          {item.coAttainment.toFixed(1)} × {item.correlationLevel} = {item.product.toFixed(1)}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-muted/30 font-bold">
                                      <td className="border p-2" colSpan={2}>
                                        Total
                                      </td>
                                      <td className="border p-2 text-center">{poAtt.totalWeight}</td>
                                      <td className="border p-2 text-right font-mono">{poAtt.weightedSum.toFixed(1)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                              <p className="text-sm font-mono">
                                <span className="font-semibold">PO{poAtt.po.poNumber} Attainment</span> ={' '}
                                {poAtt.weightedSum.toFixed(1)} ÷ {poAtt.totalWeight} ={' '}
                                <span className="text-lg font-bold">{poAtt.achievedPercent.toFixed(1)}%</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Contributing COs: {poAtt.breakdown.length} • Average Correlation:{' '}
                                {(poAtt.totalWeight / poAtt.breakdown.length).toFixed(1)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
