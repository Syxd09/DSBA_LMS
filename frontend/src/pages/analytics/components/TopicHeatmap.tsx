
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TopicHeatmapProps {
    data: {
        unit: string;
        topics: {
            name: string;
            score: number; // 0-100
        }[];
    }[];
}

export const TopicHeatmap: React.FC<TopicHeatmapProps> = ({ data }) => {
    
    // Color scale: Red (low) -> Yellow (mid) -> Green (high)
    const getColor = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-400';
        if (score >= 40) return 'bg-orange-400';
        return 'bg-red-500';
    };

    return (
        <Card className="h-full overflow-hidden">
            <CardHeader>
                <CardTitle>Topic Mastery Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {data.map((unit, unitIdx) => (
                        <div key={unitIdx} className="border-b pb-4 last:border-0">
                            <h4 className="font-semibold mb-3 text-sm text-gray-700">{unit.unit}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {unit.topics.map((topic, topicIdx) => (
                                    <div 
                                        key={topicIdx} 
                                        className="relative group cursor-pointer"
                                    >
                                        <div 
                                            className={`h-12 w-full rounded-md flex items-center justify-center text-white font-bold text-sm shadow-sm transition-all hover:scale-105 ${getColor(topic.score)}`}
                                        >
                                            {topic.score}%
                                        </div>
                                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs p-2 rounded w-32 text-center pointer-events-none z-10">
                                            {topic.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
