import { useQuery } from '@tanstack/react-query';
import { roleAnalyticsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { Target, AlertCircle } from 'lucide-react';

interface COAttainmentChartProps {
    offeringId: string;
    subjectName: string;
}

export function COAttainmentChart({ offeringId, subjectName }: COAttainmentChartProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['student-co-profile', offeringId],
        queryFn: () => roleAnalyticsApi.getStudentCOProfile(offeringId),
        staleTime: 300000,
        enabled: !!offeringId && offeringId !== 'undefined',
    });

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-sm font-medium truncate">{subjectName}</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </CardContent>
            </Card>
        );
    }

    if (isError || !data?.outcomes || data.outcomes.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-sm font-medium truncate">{subjectName}</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                    <p>No CO data available</p>
                </CardContent>
            </Card>
        );
    }

    const chartData = data.outcomes.map((co: any) => ({
        name: `CO${co.co_number}`,
        attainment: co.attainment,
        target: co.target,
        fullMark: 100,
    }));

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="truncate" title={subjectName}>{subjectName}</span>
                    <Target className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <ReferenceLine y={60} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                            <Bar dataKey="attainment" name="Attainment %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="target" name="Target %" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} barSize={20} hide />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
