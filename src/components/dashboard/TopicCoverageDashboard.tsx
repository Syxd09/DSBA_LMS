/**
 * EduMetrics - Topic Coverage Dashboard Component
 * F-05: Faculty view for topics taught vs assessed with student performance
 * 
 * Features:
 * - Topics defined vs topics with questions
 * - Gap analysis (unassessed topics)
 * - Performance per topic across students
 * - Unit-wise breakdown
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
  BookOpen, Target, BarChart3, AlertCircle
} from 'lucide-react';
import { topicCoverageApi, offeringsApi, cohortsApi } from '@/lib/api';

// =============================================================================
// TYPES
// =============================================================================

interface TopicInfo {
  topic_id: string;
  topic_name: string;
  question_count: number;
  total_marks: number;
  avg_percentage: number | null;
  attempt_count: number | null;
  co_codes: string[];
}

interface UnitInfo {
  unit_id: string;
  unit_no: number;
  unit_name: string;
  topic_count: number;
  assessed_topics: number;
  unassessed_topics: number;
  coverage_percentage: number;
  avg_performance: number | null;
  topics: TopicInfo[];
}

interface CoverageData {
  offering_id: string;
  subject_code: string;
  subject_name: string;
  total_units: number;
  total_topics: number;
  assessed_topics: number;
  coverage_percentage: number;
  avg_performance: number | null;
  units: UnitInfo[];
  gaps: Array<{
    topic_id: string;
    topic_name: string;
    unit_no: number;
    unit_name: string;
  }>;
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const CoverageStatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  variant = 'default'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) => {
  const colors = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-yellow-500/10 text-yellow-600',
    danger: 'bg-red-500/10 text-red-600',
  };
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[variant]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
};

const UnitCoverageCard = ({ unit }: { unit: UnitInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Badge variant="outline" className="font-mono">Unit {unit.unit_no}</Badge>
            <span className="font-medium">{unit.unit_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-sm font-medium">
                {unit.assessed_topics}/{unit.topic_count} topics
              </span>
              <Progress 
                value={unit.coverage_percentage} 
                className="w-24 h-2 mt-1"
              />
            </div>
            {unit.avg_performance !== null && (
              <Badge 
                variant={unit.avg_performance >= 60 ? "secondary" : "destructive"}
                className={unit.avg_performance >= 60 ? "bg-emerald-100 text-emerald-700" : ""}
              >
                {unit.avg_performance.toFixed(0)}% avg
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 ml-6 mr-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="w-24 text-center">Questions</TableHead>
                <TableHead className="w-20 text-center">Marks</TableHead>
                <TableHead className="w-32 text-center">Performance</TableHead>
                <TableHead className="w-28">COs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unit.topics.map((topic) => (
                <TableRow key={topic.topic_id}>
                  <TableCell className="font-medium">
                    {topic.question_count === 0 && (
                      <AlertCircle className="w-4 h-4 inline-block mr-2 text-orange-500" />
                    )}
                    {topic.topic_name}
                  </TableCell>
                  <TableCell className="text-center">
                    {topic.question_count > 0 ? (
                      <Badge variant="secondary">{topic.question_count}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {topic.total_marks > 0 ? topic.total_marks : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {topic.avg_percentage !== null ? (
                      <div className="flex items-center justify-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${
                            topic.avg_percentage >= 75 ? 'bg-emerald-500' :
                            topic.avg_percentage >= 60 ? 'bg-green-400' :
                            topic.avg_percentage >= 50 ? 'bg-yellow-400' :
                            'bg-red-500'
                          }`}
                        />
                        <span>{topic.avg_percentage.toFixed(0)}%</span>
                        <span className="text-xs text-muted-foreground">
                          ({topic.attempt_count} students)
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {topic.co_codes.length > 0 ? (
                        topic.co_codes.map((co) => (
                          <Badge key={co} variant="outline" className="text-xs">
                            {co}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface TopicCoverageDashboardProps {
  offeringId?: string;
  showOfferingSelector?: boolean;
}

export default function TopicCoverageDashboard({ 
  offeringId: initialOfferingId,
  showOfferingSelector = true
}: TopicCoverageDashboardProps) {
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>(initialOfferingId || '');
  
  // Fetch cohorts for selector
  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
    enabled: showOfferingSelector,
  });
  
  // Fetch offerings for selected cohort
  const { data: offerings = [] } = useQuery({
    queryKey: ['offerings', selectedCohortId],
    queryFn: () => offeringsApi.list({ cohort_id: selectedCohortId }),
    enabled: showOfferingSelector && !!selectedCohortId,
  });
  
  // Fetch coverage data
  const { data: coverageResponse, isLoading, error } = useQuery({
    queryKey: ['topicCoverage', selectedOfferingId],
    queryFn: () => topicCoverageApi.getOfferingCoverage(selectedOfferingId),
    enabled: !!selectedOfferingId,
  });
  
  const coverage: CoverageData | null = coverageResponse?.data || null;
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  return (
    <div className="space-y-6">
      {/* Offering Selector */}
      {showOfferingSelector && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cohort..." />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedOfferingId} 
                onValueChange={setSelectedOfferingId}
                disabled={!selectedCohortId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCohortId ? "Select subject..." : "Select cohort first"} />
                </SelectTrigger>
                <SelectContent>
                  {offerings.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.subject?.code} - {o.subject?.name} (Sem {o.semester})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}
      
      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <p>Unable to load topic coverage data</p>
          </CardContent>
        </Card>
      )}
      
      {/* Empty State */}
      {!selectedOfferingId && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Subject</h3>
            <p className="text-muted-foreground">
              Choose a cohort and subject to view topic coverage analysis.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Coverage Data */}
      {coverage && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {coverage.subject_code} - {coverage.subject_name}
              </h2>
              <p className="text-muted-foreground">Topic Coverage Analysis</p>
            </div>
            <Badge 
              variant={coverage.coverage_percentage >= 80 ? "secondary" : "destructive"}
              className={coverage.coverage_percentage >= 80 ? "bg-emerald-100 text-emerald-700" : ""}
            >
              {coverage.coverage_percentage.toFixed(0)}% Covered
            </Badge>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CoverageStatCard
              title="Total Topics"
              value={coverage.total_topics}
              icon={BookOpen}
            />
            <CoverageStatCard
              title="Topics Assessed"
              value={coverage.assessed_topics}
              subtitle={`${coverage.coverage_percentage.toFixed(0)}% coverage`}
              icon={Target}
              variant="success"
            />
            <CoverageStatCard
              title="Gaps (Unassessed)"
              value={coverage.gaps.length}
              icon={AlertCircle}
              variant={coverage.gaps.length > 0 ? "warning" : "success"}
            />
            <CoverageStatCard
              title="Avg Performance"
              value={coverage.avg_performance ? `${coverage.avg_performance.toFixed(0)}%` : 'N/A'}
              icon={BarChart3}
              variant={
                coverage.avg_performance === null ? 'default' :
                coverage.avg_performance >= 60 ? 'success' : 'danger'
              }
            />
          </div>
          
          {/* Gap Alerts */}
          {coverage.gaps.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Topics Never Assessed ({coverage.gaps.length})
                </CardTitle>
                <CardDescription className="text-orange-600">
                  These topics have no exam questions mapped to them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {coverage.gaps.map((gap) => (
                    <Badge 
                      key={gap.topic_id} 
                      variant="outline" 
                      className="border-orange-300 text-orange-700"
                    >
                      U{gap.unit_no}: {gap.topic_name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Unit-wise Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Unit-wise Topic Coverage</CardTitle>
              <CardDescription>
                Click on a unit to see topic-level details and student performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {coverage.units.map((unit) => (
                  <UnitCoverageCard key={unit.unit_id} unit={unit} />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
