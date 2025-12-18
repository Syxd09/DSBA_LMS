import { useAcademicContext } from '@/contexts/AcademicContext';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, BookOpen, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function AcademicContextSelector() {
  const {
    departmentId,
    cohortId,
    semester,
    academicYear,
    setDepartmentId,
    setCohortId,
    setSemester,
    setAcademicYear,
    resetContext,
    isContextComplete,
  } = useAcademicContext();

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
    queryKey: ['cohorts', departmentId],
    queryFn: async () => {
      const { data } = await api.get('/cohorts');
      if (departmentId) {
        return (data || []).filter((c: any) => 
          c.program?.departmentId === departmentId
        );
      }
      return data || [];
    },
    enabled: !!departmentId,
  });

  // Get current cohort for semester calculation
  const currentCohort = cohorts.find((c: any) => c.id === cohortId);
  const maxSemester = currentCohort?.program?.durationYears 
    ? currentCohort.program.durationYears * 2 
    : 8;

  // Get display names
  const deptName = departments.find((d: any) => d.id === departmentId)?.code || '';
  const cohortName = currentCohort?.name || '';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Context:</span>
      
      {/* Department */}
      <Select value={departmentId} onValueChange={setDepartmentId}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <Building2 className="w-3 h-3 mr-1" />
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept: any) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.code} - {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Cohort */}
      <Select value={cohortId} onValueChange={setCohortId} disabled={!departmentId}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <Users className="w-3 h-3 mr-1" />
          <SelectValue placeholder={departmentId ? "Cohort" : "Select dept first"} />
        </SelectTrigger>
        <SelectContent>
          {cohorts.map((cohort: any) => (
            <SelectItem key={cohort.id} value={cohort.id}>
              {cohort.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Semester */}
      <Select 
        value={String(semester)} 
        onValueChange={(val) => setSemester(Number(val))} 
        disabled={!cohortId}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <BookOpen className="w-3 h-3 mr-1" />
          <SelectValue placeholder="Semester" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: maxSemester }, (_, i) => i + 1).map((sem) => (
            <SelectItem key={sem} value={String(sem)}>
              Sem {sem}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Academic Year */}
      <Select value={academicYear} onValueChange={setAcademicYear}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {[2024, 2025, 2026].map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}-{String(year + 1).slice(2)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Badge */}
      {isContextComplete ? (
        <Badge variant="default" className="h-6 text-xs ml-2">
          {deptName} / {cohortName} / Sem {semester}
        </Badge>
      ) : (
        <Badge variant="secondary" className="h-6 text-xs ml-2">
          Select context
        </Badge>
      )}

      {/* Reset */}
      {isContextComplete && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={resetContext}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
