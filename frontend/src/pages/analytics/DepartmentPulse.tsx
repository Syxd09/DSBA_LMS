
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { roleAnalyticsApi } from '@/services/analyticsService';
import { Loader2, TrendingUp, Users } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

export default function DepartmentPulse() {
    const [loading, setLoading] = useState(true);
    const [batchData, setBatchData] = useState<any>(null);
    const [teacherData, setTeacherData] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load last 3 years by default
            const currentYear = new Date().getFullYear();
            const years = [currentYear - 2, currentYear - 1, currentYear];
            
            const [batchRes, teacherRes] = await Promise.all([
                roleAnalyticsApi.getBatchComparison(years),
                roleAnalyticsApi.getTeacherEffectiveness()
            ]);

            setBatchData(batchRes.data);
            setTeacherData(teacherRes.data);
        } catch (error) {
            console.error("Failed to load department analytics", error);
            toast.error("Failed to load department pulse");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Department Pulse</h1>
            
            <div className="grid gap-6 md:grid-cols-2">
                {/* Batch Comparison Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Batch Comparison (CO Attainment)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {batchData && (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={batchData.trends || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="batch_year" />
                                    <YAxis domain={[0, 3]} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="avg_attainment" stroke="#2563eb" name="Avg Attainment" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Teacher Effectiveness */}
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Faculty Effectiveness
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {teacherData?.teachers?.slice(0, 5).map((t: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div>
                                        <p className="font-medium">{t.name}</p>
                                        <p className="text-xs text-gray-500">{t.subjects_count} Subjects</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-bold ${t.avg_attainment >= 2.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {t.avg_attainment.toFixed(2)}
                                        </span>
                                        <p className="text-xs text-gray-500">Avg CO</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
