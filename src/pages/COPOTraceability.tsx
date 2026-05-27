import { useState, useMemo } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Target, TrendingUp, AlertTriangle, CheckCircle2, Info, Search, Sparkles, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  questionTraceability?: Array<{
    id: string;
    examType: string;
    customTypeName: string | null;
    questionLabel: string;
    questionText: string;
    maxMarks: number;
    bloomLevel: string;
    coCode: string;
    coDescription: string;
    attainmentPercent: number;
  }>;
  studentRankings?: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    registrationNumber: string;
    coAttainments: Record<string, number>;
    poAttainments: Record<string, number>;
    overallScore: number;
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

  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    if (!traceabilityData?.studentRankings) return [];
    return traceabilityData.studentRankings.filter(s => 
      s.studentName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.registrationNumber.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [traceabilityData?.studentRankings, studentSearchQuery]);

  const getBloomBadgeColor = (level: string): string => {
    if (level === 'Remember') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (level === 'Understand') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (level === 'Apply') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (level === 'Analyze') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (level === 'Evaluate') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (level === 'Create') return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
    return 'bg-slate-100 text-slate-700';
  };

  const getPerformerStatus = (score: number) => {
    if (score >= 75) return { label: 'High Performer', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400' };
    if (score >= 40) return { label: 'Moderate Performer', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400' };
    return { label: 'At-Risk Performer', color: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400' };
  };

  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportAttainmentSummary = () => {
    if (!traceabilityData) return;
    const { context, coAttainments, poAttainments } = traceabilityData;
    
    let csv = '';
    // Header Context info
    csv += `Academic Context\n`;
    csv += `Program,"${context.program.name} (${context.program.code})"\n`;
    csv += `Cohort/Batch,"${context.cohort.name} (${context.cohort.year})"\n`;
    csv += `Semester,"Semester ${context.semester}"\n`;
    csv += `Academic Year,"${context.academicYear}"\n`;
    csv += `Subject,"${context.subject.name} (${context.subject.code}) - ${context.subject.credits} Credits"\n\n`;
    
    // Course Outcomes
    csv += `COURSE OUTCOME (CO) ATTAINMENT SUMMARY\n`;
    csv += `CO Number,Description,Target Attainment %,Achieved Attainment %,Attainment Level,Pass Count,Total Students\n`;
    coAttainments.forEach(coAtt => {
      const levelInfo = getAttainmentLevel(coAtt.achievedPercent);
      const desc = coAtt.co.description.replace(/"/g, '""');
      csv += `CO${coAtt.co.coNumber},"${desc}",${coAtt.targetPercent},${coAtt.achievedPercent.toFixed(1)},Level ${levelInfo.level} - ${levelInfo.label},${coAtt.passCount},${coAtt.studentCount}\n`;
    });
    
    csv += `\n`;
    
    // Program Outcomes
    csv += `PROGRAM OUTCOME (PO) ATTAINMENT SUMMARY\n`;
    csv += `PO Number,Description,Target Attainment %,Achieved Attainment %,Attainment Level,Weighted Sum,Total Weight\n`;
    poAttainments.forEach(poAtt => {
      const levelInfo = getAttainmentLevel(poAtt.achievedPercent);
      const desc = poAtt.po.description.replace(/"/g, '""');
      csv += `PO${poAtt.po.poNumber},"${desc}",${poAtt.targetPercent},${poAtt.achievedPercent.toFixed(1)},Level ${levelInfo.level} - ${levelInfo.label},${poAtt.weightedSum.toFixed(1)},${poAtt.totalWeight}\n`;
    });
    
    const subjectCode = context.subject.code.replace(/[^a-zA-Z0-9]/g, '_');
    downloadCSV(`${subjectCode}_CO_PO_Attainment_Summary.csv`, csv);
  };

  const exportQuestionAnalysis = () => {
    if (!traceabilityData || !traceabilityData.questionTraceability) return;
    const { context, questionTraceability } = traceabilityData;
    
    let csv = '';
    csv += `Academic Context\n`;
    csv += `Program,"${context.program.name} (${context.program.code})"\n`;
    csv += `Cohort/Batch,"${context.cohort.name} (${context.cohort.year})"\n`;
    csv += `Semester,"Semester ${context.semester}"\n`;
    csv += `Academic Year,"${context.academicYear}"\n`;
    csv += `Subject,"${context.subject.name} (${context.subject.code})"\n\n`;
    
    csv += `QUESTION-LEVEL OUTCOME ATTAINMENT MAP\n`;
    csv += `Exam Type,Question Label,Question Details / Text,Max Marks,Bloom's Level,Course Outcome,Attainment %,Attainment Status\n`;
    
    questionTraceability.forEach(item => {
      const levelInfo = getAttainmentLevel(item.attainmentPercent);
      const examLabel = item.examType === 'CUSTOM' ? item.customTypeName || 'Custom' : item.examType.toLowerCase().replace('_', ' ');
      const qText = (item.questionText || `Question ${item.questionLabel}`).replace(/"/g, '""');
      csv += `"${examLabel}",Q${item.questionLabel},"${qText}",${item.maxMarks},${item.bloomLevel},${item.coCode},${item.attainmentPercent.toFixed(1)}%,${levelInfo.label}\n`;
    });
    
    const subjectCode = context.subject.code.replace(/[^a-zA-Z0-9]/g, '_');
    downloadCSV(`${subjectCode}_Question_Level_Attainment.csv`, csv);
  };

  const exportPerformerRankings = () => {
    if (!traceabilityData || !traceabilityData.studentRankings) return;
    const { context, coAttainments, poAttainments, studentRankings } = traceabilityData;
    
    let csv = '';
    csv += `Academic Context\n`;
    csv += `Program,"${context.program.name} (${context.program.code})"\n`;
    csv += `Cohort/Batch,"${context.cohort.name} (${context.cohort.year})"\n`;
    csv += `Semester,"Semester ${context.semester}"\n`;
    csv += `Academic Year,"${context.academicYear}"\n`;
    csv += `Subject,"${context.subject.name} (${context.subject.code})"\n\n`;
    
    csv += `STUDENT COURSE OUTCOME RANKINGS & LEADERBOARD\n`;
    
    const coHeaders = coAttainments.map(coAtt => `CO${coAtt.co.coNumber}`);
    const poHeaders = poAttainments.map(poAtt => `PO${poAtt.po.poNumber}`);
    
    csv += `Rank,Reg Number,Student Name,${coHeaders.join(',')},${poHeaders.join(',')},Overall Score %,Status\n`;
    
    studentRankings.forEach(student => {
      const status = getPerformerStatus(student.overallScore);
      
      const coScores = coHeaders.map(co => {
        if (!co.startsWith('CO')) return '0.0%';
        const val = Reflect.get(student.coAttainments, co);
        return val !== undefined ? `${Number(val).toFixed(1)}%` : '0.0%';
      });
      
      const poScores = poHeaders.map(po => {
        if (!po.startsWith('PO')) return '0.0%';
        const val = Reflect.get(student.poAttainments, po);
        return val !== undefined ? `${Number(val).toFixed(1)}%` : '0.0%';
      });
      
      csv += `${student.rank},${student.registrationNumber},"${student.studentName}",${coScores.join(',')},${poScores.join(',')},${student.overallScore.toFixed(1)}%,${status.label}\n`;
    });
    
    const subjectCode = context.subject.code.replace(/[^a-zA-Z0-9]/g, '_');
    downloadCSV(`${subjectCode}_Student_Rankings_Leaderboard.csv`, csv);
  };

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

            <Tabs defaultValue="outcomes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-6">
                <TabsTrigger value="outcomes">Attainment Summary</TabsTrigger>
                <TabsTrigger value="questions">Question Analysis</TabsTrigger>
                <TabsTrigger value="rankings">Performer Rankings</TabsTrigger>
              </TabsList>

              {/* Tab 1: Attainment Summary (Standard view) */}
              <TabsContent value="outcomes" className="space-y-6 mt-0">
                {/* CO Attainment Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Course Outcome Attainment</h3>
                    <Button onClick={exportAttainmentSummary} variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Attainment Summary (CSV)
                    </Button>
                  </div>
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
              </TabsContent>

              {/* Tab 2: Question Traceability */}
              <TabsContent value="questions" className="space-y-6 mt-0">
                <Card>
                  <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="w-5 h-5 text-primary" />
                        Question-Level Outcome Attainment Map
                      </CardTitle>
                      <CardDescription>
                        Attainment rate computed dynamically for each question & sub-question in published exams
                      </CardDescription>
                    </div>
                    <Button onClick={exportQuestionAnalysis} variant="outline" size="sm" className="flex items-center gap-2 self-start md:self-auto">
                      <Download className="w-4 h-4" />
                      Export Question Analysis (CSV)
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {!traceabilityData.questionTraceability || traceabilityData.questionTraceability.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No questions have been configured for this subject's active exams yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="p-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Exam Type</th>
                              <th className="p-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Question</th>
                              <th className="p-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Question Details / Text</th>
                              <th className="p-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">Max Marks</th>
                              <th className="p-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bloom's Level</th>
                              <th className="p-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">Course Outcome</th>
                              <th className="p-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Attainment</th>
                              <th className="p-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {traceabilityData.questionTraceability.map((item, idx) => {
                              const levelInfo = getAttainmentLevel(item.attainmentPercent);
                              return (
                                <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                  <td className="p-3 font-medium capitalize">
                                    {item.examType === 'CUSTOM' ? item.customTypeName : item.examType.toLowerCase().replace('_', ' ')}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-primary">Q{item.questionLabel}</td>
                                  <td className="p-3 max-w-[250px] truncate" title={item.questionText}>
                                    {item.questionText || <span className="text-muted-foreground italic">No text provided</span>}
                                  </td>
                                  <td className="p-3 text-center font-semibold">{item.maxMarks}</td>
                                  <td className="p-3 text-center">
                                    <Badge className={`font-normal border shadow-none ${getBloomBadgeColor(item.bloomLevel)}`}>
                                      {item.bloomLevel}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge variant="outline" className="font-semibold text-xs">
                                      {item.coCode}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold text-base">
                                    {item.attainmentPercent.toFixed(1)}%
                                  </td>
                                  <td className="p-3 text-right">
                                    <Badge className={levelInfo.color}>
                                      {levelInfo.label}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Performer Rankings */}
              <TabsContent value="rankings" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                          Student CO-PO Outcome Rankings & Leaderboard
                        </CardTitle>
                        <CardDescription>
                          Complete student leaderboard sorted by overall Subject Course Outcome achievements
                        </CardDescription>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        {/* Search Field */}
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search student or reg no..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                          />
                        </div>
                        <Button onClick={exportPerformerRankings} variant="outline" size="sm" className="flex items-center gap-2 h-9">
                          <Download className="w-4 h-4" />
                          Export Leaderboard (CSV)
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No student rankings found matching search query, or marks are not yet submitted.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground w-12">Rank</th>
                              <th className="p-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground w-28">Reg Number</th>
                              <th className="p-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Student Name</th>
                              {traceabilityData.coAttainments.map(coAtt => (
                                <th key={coAtt.id} className="p-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                  CO{coAtt.co.coNumber}
                                </th>
                              ))}
                              {traceabilityData.poAttainments.map(poAtt => (
                                <th key={poAtt.id} className="p-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                  PO{poAtt.po.poNumber}
                                </th>
                              ))}
                              <th className="p-3 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground w-28">Overall Score</th>
                              <th className="p-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground w-36">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudents.map((student) => {
                              const status = getPerformerStatus(student.overallScore);
                              const isTopPerformer = student.rank <= 3;
                              
                              return (
                                <tr 
                                  key={student.studentId} 
                                  className={`border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors ${
                                    isTopPerformer 
                                      ? 'bg-emerald-50/30 dark:bg-emerald-950/5 border-l-4 border-l-emerald-500' 
                                      : student.overallScore < 40
                                      ? 'bg-rose-50/30 dark:bg-rose-950/5 border-l-4 border-l-rose-500'
                                      : ''
                                  }`}
                                >
                                  <td className="p-3 text-center font-extrabold text-base">
                                    {isTopPerformer ? (
                                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 font-bold border border-yellow-300">
                                        🏆 {student.rank}
                                      </span>
                                    ) : (
                                      student.rank
                                    )}
                                  </td>
                                  <td className="p-3 font-mono font-semibold text-xs">{student.registrationNumber}</td>
                                  <td className="p-3 font-semibold">{student.studentName}</td>
                                  
                                  {/* CO Score Cells */}
                                  {traceabilityData.coAttainments.map(coAtt => {
                                    const key = `CO${coAtt.co.coNumber}`;
                                    const val = student.coAttainments[key] ?? 0;
                                    return (
                                      <td key={coAtt.id} className="p-3 text-center font-mono font-medium">
                                        <span className={val >= coAtt.targetPercent ? 'text-green-600 font-bold' : 'text-slate-500'}>
                                          {val.toFixed(1)}%
                                        </span>
                                      </td>
                                    );
                                  })}

                                  {/* PO Score Cells */}
                                  {traceabilityData.poAttainments.map(poAtt => {
                                    const key = `PO${poAtt.po.poNumber}`;
                                    const val = student.poAttainments[key] ?? 0;
                                    return (
                                      <td key={poAtt.id} className="p-3 text-center font-mono">
                                        <span className={val >= poAtt.targetPercent ? 'text-indigo-600 font-semibold' : 'text-slate-500'}>
                                          {val.toFixed(1)}%
                                        </span>
                                      </td>
                                    );
                                  })}
                                  
                                  <td className="p-3 text-right font-mono font-extrabold text-base text-primary">
                                    {student.overallScore.toFixed(1)}%
                                  </td>
                                  <td className="p-3 text-right">
                                    <Badge className={`border shadow-none ${status.color}`}>
                                      {status.label}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
