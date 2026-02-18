
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle } from "lucide-react";
import { roleAnalyticsApi } from '@/services/analyticsService';
import { toast } from 'sonner';

export default function AccreditationDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await roleAnalyticsApi.getAccreditationReadiness();
            setData(res.data);
        } catch (error) {
            console.error("Failed to load accreditation data", error);
            toast.error("Failed to load accreditation readiness");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (!data) return <div>No data available</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'READY': return 'bg-green-100 text-green-800';
            case 'NEEDS_ATTENTION': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-red-100 text-red-800';
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Accreditation Readiness (NBA/NAAC)</h1>
                <Badge className={getStatusColor(data.status)} variant="outline">
                    {data.status.replace('_', ' ')}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Readiness</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.overall_score}%</div>
                        <Progress value={data.overall_score} className="mt-2" />
                    </CardContent>
                </Card>
                
                {data.components && Object.entries(data.components).map(([key, value]: [string, any]) => (
                     <Card key={key}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium capitalize">{key.replace('_', ' ')}</CardTitle>
                            {value >= 80 ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{value}%</div>
                            <Progress value={value} className="mt-2" color={value >= 80 ? 'bg-green-500' : 'bg-yellow-500'} />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {data.recommendations && data.recommendations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 space-y-2">
                            {data.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="text-sm">{rec}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
