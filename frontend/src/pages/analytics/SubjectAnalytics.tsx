
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, Check } from "lucide-react";
import { toast } from 'sonner';

import { roleAnalyticsApi, topicCoverageApi } from '@/services/analyticsService';
import { examsApi } from '@/services/marksService';
import { QPQICard } from './components/QPQICard';
import { TopicHeatmap } from './components/TopicHeatmap';

export default function SubjectAnalytics() {
    const { offeringId } = useParams<{ offeringId: string }>();
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [topicData, setTopicData] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [qpqiData, setQpqiData] = useState<any>(null);

    useEffect(() => {
        if (!offeringId) return;
        loadSubjectData();
    }, [offeringId]);

    useEffect(() => {
        if (selectedExamId) {
            loadExamQPQI(selectedExamId);
        }
    }, [selectedExamId]);

    const loadSubjectData = async () => {
        setLoading(true);
        try {
            // 1. Load Topic Coverage
            const coverage = await topicCoverageApi.getOfferingCoverage(offeringId!);
            setTopicData(coverage.data);

            // 2. Load Exams for this offering
            const examsList = await examsApi.list({ offering_id: offeringId });
            setExams(examsList);
        } catch (error) {
            console.error("Failed to load analytics", error);
            toast.error("Failed to load subject analytics");
        } finally {
            setLoading(false);
        }
    };

    const loadExamQPQI = async (examId: string) => {
        try {
            const result = await roleAnalyticsApi.getQPQI(examId);
            setQpqiData(result);
        } catch (error) {
            console.error("Failed to load QPQI", error);
            toast.error("Failed to load QPQI for selected exam");
        }
    };

    if (loading && !topicData) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Subject Analytics</h1>
            </div>

            <Tabs defaultValue="topics" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="topics">Topic Mastery</TabsTrigger>
                    <TabsTrigger value="assessment">Assessment Quality (QPQI)</TabsTrigger>
                </TabsList>

                <TabsContent value="topics" className="space-y-4">
                    {topicData ? (
                        <TopicHeatmap data={topicData.units || []} />
                    ) : (
                        <Card><CardContent className="pt-6">No topic data available</CardContent></Card>
                    )}
                </TabsContent>

                <TabsContent value="assessment" className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                        <span className="text-sm font-medium">Select Exam:</span>
                        <Select onValueChange={setSelectedExamId} value={selectedExamId || undefined}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Choose an exam..." />
                            </SelectTrigger>
                            <SelectContent>
                                {exams.map(exam => (
                                    <SelectItem key={exam.id} value={exam.id}>
                                        {exam.title} ({exam.exam_type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedExamId && qpqiData ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                           <QPQICard 
                                score={qpqiData.overall_score} 
                                bloom_distribution={qpqiData.bloom_distribution}
                                difficulty_balance={qpqiData.difficulty_balance}
                                coverage_score={qpqiData.coverage_score}
                           />
                           
                           {/* We could add more cards here like "Hardest Questions" */}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="pt-6 flex flex-col items-center justify-center text-gray-500 min-h-[200px]">
                                <AlertTriangle className="h-10 w-10 mb-2 opacity-20" />
                                <p>Select an exam to view Quality Analysis</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
