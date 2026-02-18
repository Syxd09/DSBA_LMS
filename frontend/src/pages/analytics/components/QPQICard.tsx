
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QPQIProps {
    score: number;
    bloom_distribution: Record<string, number>;
    difficulty_balance: number; // 0.0 to 1.0 (1.0 = perfect balance)
    coverage_score: number;
}

export const QPQICard: React.FC<QPQIProps> = ({ score, bloom_distribution, difficulty_balance, coverage_score }) => {
    
    const getScoreColor = (sc: number) => {
        if (sc >= 8.0) return "text-green-600";
        if (sc >= 5.0) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Question Paper QA Index (QPQI)</span>
                    <Badge className={score >= 7.0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                        {score.toFixed(1)} / 10.0
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="text-center py-4">
                        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
                        <p className="text-sm text-gray-500 mt-1">Overall Quality Score</p>
                    </div>
                
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 mb-1">Bloom Balance</p>
                            <div className="flex gap-1 h-2 w-full bg-gray-200 mt-1 rounded overflow-hidden">
                                {Object.entries(bloom_distribution).map(([level, pct], idx) => (
                                    <div 
                                        key={level} 
                                        style={{ width: `${pct}%` }} 
                                        className={`h-full ${idx < 2 ? 'bg-blue-400' : idx < 4 ? 'bg-indigo-500' : 'bg-purple-600'}`}
                                        title={`${level}: ${pct}%`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-right mt-1 text-gray-400">Recall → Create</p>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 mb-1">Difficulty</p>
                            <span className="font-semibold">{Math.round(difficulty_balance * 100)}%</span>
                            <span className="text-xs text-gray-400 ml-1">Ideal Balance</span>
                        </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 italic border-t pt-2 mt-2">
                        * Based on correlation between Bloom levels and question complexity.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
