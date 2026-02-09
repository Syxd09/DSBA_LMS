import { useState, useEffect } from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { programsApi, cohortsApi, offeringsApi, coPoMappingApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Grid3X3, Loader2, Save, RotateCcw, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MatrixCell {
  co_id: string;
  po_id: string;
  level: number;
}

const CORRELATION_LEVELS = [
  { value: 0, label: '-', color: 'bg-muted' },
  { value: 1, label: '1', color: 'bg-yellow-200 dark:bg-yellow-900' },
  { value: 2, label: '2', color: 'bg-orange-300 dark:bg-orange-800' },
  { value: 3, label: '3', color: 'bg-green-400 dark:bg-green-700' },
];

export default function COPOMapping() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const canEdit = ['hod', 'principal'].includes(role);

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programsApi.list(),
  });

  // Fetch cohorts for selected program
  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts', selectedProgramId],
    queryFn: () => cohortsApi.list({ program_id: selectedProgramId }),
    enabled: !!selectedProgramId,
  });

  // Fetch offerings for selected cohort
  const { data: offerings = [] } = useQuery({
    queryKey: ['offerings', selectedCohortId],
    queryFn: () => offeringsApi.list({ cohort_id: selectedCohortId }),
    enabled: !!selectedCohortId,
  });

  // Fetch matrix data
  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: ['co-po-matrix', selectedOfferingId],
    queryFn: () => coPoMappingApi.getMatrix(selectedOfferingId),
    enabled: !!selectedOfferingId,
  });

  // Initialize matrix from fetched data
  useEffect(() => {
    if (matrixData?.matrix) {
      const newMatrix: Record<string, Record<string, number>> = {};
      matrixData.matrix.forEach((row: any) => {
        newMatrix[row.co_id] = row.mappings;
      });
      setMatrix(newMatrix);
      setHasChanges(false);
    }
  }, [matrixData]);

  // Reset selections when program changes
  useEffect(() => {
    setSelectedCohortId('');
    setSelectedOfferingId('');
    setMatrix({});
  }, [selectedProgramId]);

  useEffect(() => {
    setSelectedOfferingId('');
    setMatrix({});
  }, [selectedCohortId]);

  const saveMutation = useMutation({
    mutationFn: (mappings: Array<{ co_id: string; po_id: string; correlation_level: number }>) =>
      coPoMappingApi.bulkSave(mappings),
    onSuccess: (data) => {
      toast({ 
        title: 'Mappings saved', 
        description: `Created: ${data.created}, Updated: ${data.updated}, Removed: ${data.deleted}` 
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['co-po-matrix', selectedOfferingId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving mappings',
        description: error.response?.data?.detail || 'Failed to save mappings',
        variant: 'destructive',
      });
    },
  });

  const handleCellClick = (coId: string, poId: string) => {
    if (!canEdit) return;
    
    setMatrix((prev) => {
      const currentLevel = prev[coId]?.[poId] || 0;
      const nextLevel = (currentLevel + 1) % 4;
      return {
        ...prev,
        [coId]: {
          ...prev[coId],
          [poId]: nextLevel,
        },
      };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    const mappings: Array<{ co_id: string; po_id: string; correlation_level: number }> = [];
    
    Object.entries(matrix).forEach(([coId, poMappings]) => {
      Object.entries(poMappings).forEach(([poId, level]) => {
        mappings.push({ co_id: coId, po_id: poId, correlation_level: level });
      });
    });

    saveMutation.mutate(mappings);
  };

  const handleReset = () => {
    if (matrixData?.matrix) {
      const newMatrix: Record<string, Record<string, number>> = {};
      matrixData.matrix.forEach((row: any) => {
        newMatrix[row.co_id] = row.mappings;
      });
      setMatrix(newMatrix);
      setHasChanges(false);
    }
  };

  const getCellStyle = (level: number) => {
    return CORRELATION_LEVELS.find((l) => l.value === level)?.color || 'bg-muted';
  };

  const selectedProgram = programs.find((p: any) => p.id === selectedProgramId);
  const selectedOffering = offerings.find((o: any) => o.id === selectedOfferingId);

  return (
    <AuthenticatedLayout allowedRoles={['principal', 'hod', 'teacher']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Grid3X3 className="w-6 h-6" />
              CO-PO Mapping Matrix
            </h2>
            <p className="text-muted-foreground">
              Define correlations between Course Outcomes and Program Outcomes
            </p>
          </div>
        </div>

        {/* Selectors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Subject Offering</CardTitle>
            <CardDescription>Choose program, cohort, and subject to view/edit mappings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Program</label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program: any) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.code} - {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cohort</label>
                <Select 
                  value={selectedCohortId} 
                  onValueChange={setSelectedCohortId}
                  disabled={!selectedProgramId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((cohort: any) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} (Sem {cohort.current_semester})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Select 
                  value={selectedOfferingId} 
                  onValueChange={setSelectedOfferingId}
                  disabled={!selectedCohortId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offerings.map((offering: any) => (
                      <SelectItem key={offering.id} value={offering.id}>
                        {offering.subject?.code} - {offering.subject?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                Correlation Levels:
              </span>
              {CORRELATION_LEVELS.map((level) => (
                <div key={level.value} className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded flex items-center justify-center font-medium border', level.color)}>
                    {level.label}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {level.value === 0 ? 'None' : level.value === 1 ? 'Low' : level.value === 2 ? 'Medium' : 'High'}
                  </span>
                </div>
              ))}
              {canEdit && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Click cells to cycle through levels
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Matrix */}
        {selectedOfferingId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {selectedOffering?.subject?.code} - {selectedOffering?.subject?.name}
                </CardTitle>
                <CardDescription>
                  {matrixData?.cos?.length || 0} COs × {matrixData?.pos?.length || 0} POs
                </CardDescription>
              </div>
              {canEdit && hasChanges && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {matrixLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : !matrixData?.cos?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No Course Outcomes defined for this offering.</p>
                  <p className="text-sm mt-2">Create COs first in the Subject Offerings page.</p>
                </div>
              ) : !matrixData?.pos?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No Program Outcomes defined for {selectedProgram?.code}.</p>
                  <p className="text-sm mt-2">Create POs first in the Program Outcomes page.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                          CO / PO
                        </TableHead>
                        {matrixData.pos.map((po: any) => (
                          <TableHead key={po.id} className="text-center min-w-[60px]" title={po.description}>
                            {po.code}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrixData.cos.map((co: any) => (
                        <TableRow key={co.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium" title={co.description}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {co.code}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {co.description}
                              </span>
                            </div>
                          </TableCell>
                          {matrixData.pos.map((po: any) => {
                            const level = matrix[co.id]?.[po.id] || 0;
                            return (
                              <TableCell
                                key={po.id}
                                className={cn(
                                  'text-center cursor-pointer transition-colors border',
                                  getCellStyle(level),
                                  canEdit && 'hover:opacity-80'
                                )}
                                onClick={() => handleCellClick(co.id, po.id)}
                              >
                                <span className="font-medium">
                                  {CORRELATION_LEVELS.find((l) => l.value === level)?.label}
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
