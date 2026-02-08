import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { offeringsApi, cohortsApi } from '@/lib/api';
import { History, ChevronDown, ChevronUp, Clock, BookOpen, Loader2 } from 'lucide-react';

interface COHistoryViewerProps {
  programId?: string;
}

export function COHistoryViewer({ programId }: COHistoryViewerProps) {
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [expandedOffering, setExpandedOffering] = useState<string | null>(null);

  // Get cohorts for the program
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery({
    queryKey: ['cohorts', programId],
    queryFn: () => cohortsApi.list({ program_id: programId }),
    enabled: !!programId,
  });

  // Get offerings for selected cohort
  const { data: offerings = [], isLoading: offeringsLoading } = useQuery({
    queryKey: ['offerings', selectedCohort],
    queryFn: () => offeringsApi.list({ cohort_id: selectedCohort }),
    enabled: !!selectedCohort,
  });

  // Get COs for expanded offering
  const { data: offeringCOs = [], isLoading: cosLoading } = useQuery({
    queryKey: ['offering-cos', expandedOffering],
    queryFn: () => offeringsApi.getOutcomes(expandedOffering!),
    enabled: !!expandedOffering,
  });

  const toggleExpand = (offeringId: string) => {
    setExpandedOffering(prev => prev === offeringId ? null : offeringId);
  };

  if (!programId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="w-4 h-4" />
            CO Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Select a program to view CO history across cohorts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="w-4 h-4" />
            CO Version History
          </CardTitle>
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Cohort" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map((cohort: any) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name} ({cohort.admission_year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {cohortsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !selectedCohort ? (
          <p className="text-center py-8 text-muted-foreground">
            Select a cohort to view subject offerings and their COs.
          </p>
        ) : offeringsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : offerings.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No subject offerings found for this cohort.
          </p>
        ) : (
          <div className="space-y-2">
            {offerings.map((offering: any) => (
              <div key={offering.id} className="border rounded-lg">
                <button
                  onClick={() => toggleExpand(offering.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{offering.subject?.name || 'Unknown Subject'}</p>
                      <p className="text-xs text-muted-foreground">{offering.subject?.code} • Sem {offering.semester}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {offering.co_count || 0} COs
                    </Badge>
                    {expandedOffering === offering.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>
                
                {expandedOffering === offering.id && (
                  <div className="border-t p-3 bg-secondary/10">
                    {cosLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : offeringCOs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No COs defined for this offering yet.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">CO</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-24">Bloom</TableHead>
                            <TableHead className="w-32">Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {offeringCOs.map((co: any) => (
                            <TableRow key={co.id}>
                              <TableCell>
                                <Badge variant="secondary">CO{co.co_number}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{co.description}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {co.bloom_level}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {co.created_at ? new Date(co.created_at).toLocaleDateString() : 'N/A'}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
