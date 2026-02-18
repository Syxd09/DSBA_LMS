import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi, cohortsApi, programsApi } from '@/services/academicService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterValues {
  department_id?: string;
  cohort_id?: string;
  semester?: number;
}

interface DashboardFilterBarProps {
  onFilterChange: (filters: FilterValues) => void;
  role: 'principal' | 'hod';
}

export function DashboardFilterBar({ onFilterChange, role }: DashboardFilterBarProps) {
  const [deptId, setDeptId] = useState<string>('all');
  const [cohortId, setCohortId] = useState<string>('all');
  const [semester, setSemester] = useState<string>('all');

  // Fetch departments (only for principal)
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
    enabled: role === 'principal',
  });

  // Fetch all cohorts
  const { data: cohorts } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
  });

  // Fetch all programs (to link dept to cohort for filtering)
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programsApi.list(),
    enabled: role === 'principal',
  });

  // Filter cohorts based on selected department (for Principal view)
  const filteredCohorts = cohorts?.filter(cohort => {
    // If HOD, they only see their dept's cohorts anyway (backend scoped)
    // If Principal and dept is "all", show all
    if (role === 'hod' || deptId === 'all') return true;
    
    // Find program of this cohort
    const program = programs?.find(p => p.id === cohort.program_id);
    return program?.department_id === deptId;
  });

  const handleReset = () => {
    setDeptId('all');
    setCohortId('all');
    setSemester('all');
    // useEffect will trigger onFilterChange
  };

  // Trigger filter change on state change
  useEffect(() => {
    onFilterChange({
      department_id: deptId === 'all' ? undefined : deptId,
      cohort_id: cohortId === 'all' ? undefined : cohortId,
      semester: semester === 'all' ? undefined : parseInt(semester),
    });
  }, [deptId, cohortId, semester]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-md">
      <CardContent className="p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground mr-2 border-r pr-4 border-primary/10">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium uppercase tracking-wider">Dashboard Filters</span>
        </div>

        {role === 'principal' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase ml-1">Department</label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger className="w-[200px] bg-background border-primary/20 hover:border-primary/50 transition-colors h-9">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase ml-1">Cohort (Batch)</label>
          <Select value={cohortId} onValueChange={setCohortId}>
            <SelectTrigger className="w-[200px] bg-background border-primary/20 hover:border-primary/50 transition-colors h-9">
              <SelectValue placeholder="All Cohorts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cohorts</SelectItem>
              {filteredCohorts?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase ml-1">Semester</label>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-[160px] bg-background border-primary/20 hover:border-primary/50 transition-colors h-9">
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end h-full pt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReset}
            className="text-muted-foreground hover:text-primary gap-2 h-9"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-xs">Reset</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
