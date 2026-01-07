import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { AnalyticsFilters as FiltersType } from '@/types/feedback.types';

interface AnalyticsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  onApply: () => void;
  onReset: () => void;
  
  // Options
  semesters?: number[];
  subjects?: Array<{ id: string; name: string; code: string }>;
  teachers?: Array<{ id: string; fullName: string }>;
  cohorts?: Array<{ id: string; name: string }>;
}

/**
 * Collapsible filter panel for analytics
 * Follows existing filter patterns (like MarksEntry)
 */
export function AnalyticsFilters({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  semesters = [1, 2, 3, 4, 5, 6, 7, 8],
  subjects = [],
  teachers = [],
  cohorts = []
}: AnalyticsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = Object.values(filters).filter(v => v !== null && v !== undefined).length;

  const handleFilterChange = (key: keyof FiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  const handleReset = () => {
    onFiltersChange({});
    onReset();
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Semester Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select
                value={filters.semester?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('semester', value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {semesters.map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Select
                value={filters.subjectId || 'all'}
                onValueChange={(value) => handleFilterChange('subjectId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Teacher</label>
              <Select
                value={filters.teacherId || 'all'}
                onValueChange={(value) => handleFilterChange('teacherId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cohort Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cohort</label>
              <Select
                value={filters.cohortId || 'all'}
                onValueChange={(value) => handleFilterChange('cohortId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={onApply}>Apply Filters</Button>
            <Button variant="outline" onClick={handleReset}>
              <X className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
