/**
 * EduMetrics - Question Analysis Component
 * F-06: Per-question analysis with attempt %, avg marks, difficulty index
 * 
 * Features:
 * - Difficulty index visualization (color-coded)
 * - Attempt rate bars
 * - Average marks display
 * - Bloom level distribution
 * - Hardest/Easiest questions highlight
 * - Expandable sections
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Loader2, AlertTriangle, ChevronDown, ChevronRight,
  TrendingDown, TrendingUp, HelpCircle, BarChart3
} from 'lucide-react';
import apiClient from '@/lib/api';

// =============================================================================
// TYPES
// =============================================================================

interface SubQuestionData {
  sub_question_id: string;
  label: string;
  max_marks: number;
  avg_marks: number;
  attempt_percentage: number;
  avg_percentage: number;
  difficulty_index: number;
  bloom_level: string | null;
  co_code: string | null;
  topic_name: string | null;
}

interface QuestionData {
  question_id: string;
  question_no: number;
  question_text: string;
  max_marks: number;
  avg_marks: number;
  attempt_percentage: number;
  difficulty_index: number;
  sub_questions: SubQuestionData[];
}

interface SectionData {
  section_id: string;
  section_name: string;
  max_marks: number;
  avg_marks: number;
  question_count: number;
  avg_difficulty: number;
  questions: QuestionData[];
}

interface AnalysisData {
  exam_id: string;
  exam_type: string;
  subject_code: string;
  subject_name: string;
  total_students: number;
  total_marks: number;
  avg_marks: number;
  avg_percentage: number;
  sections: SectionData[];
  hardest_questions: Array<{ label: string; difficulty: number; bloom: string }>;
  easiest_questions: Array<{ label: string; difficulty: number; bloom: string }>;
  bloom_analysis: Record<string, { count: number; avg_difficulty: number }>;
}

// =============================================================================
// UTILITIES
// =============================================================================

const getDifficultyColor = (index: number): string => {
  // Lower = harder, Higher = easier
  if (index >= 0.8) return 'text-emerald-600 bg-emerald-100';
  if (index >= 0.6) return 'text-green-600 bg-green-100';
  if (index >= 0.4) return 'text-yellow-600 bg-yellow-100';
  if (index >= 0.2) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
};

const getDifficultyLabel = (index: number): string => {
  if (index >= 0.8) return 'Very Easy';
  if (index >= 0.6) return 'Easy';
  if (index >= 0.4) return 'Moderate';
  if (index >= 0.2) return 'Hard';
  return 'Very Hard';
};

const getBloomColor = (bloom: string | null): string => {
  if (!bloom) return 'bg-gray-100 text-gray-600';
  const level = bloom.toLowerCase();
  switch (level) {
    case 'remember': return 'bg-blue-100 text-blue-700';
    case 'understand': return 'bg-cyan-100 text-cyan-700';
    case 'apply': return 'bg-green-100 text-green-700';
    case 'analyze': return 'bg-yellow-100 text-yellow-700';
    case 'evaluate': return 'bg-orange-100 text-orange-700';
    case 'create': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const QuestionRow = ({ question }: { question: QuestionData }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <TableRow className="cursor-pointer hover:bg-muted/50">
          <TableCell className="font-medium">
            {isOpen ? <ChevronDown className="inline w-4 h-4 mr-2" /> : <ChevronRight className="inline w-4 h-4 mr-2" />}
            Q{question.question_no}
          </TableCell>
          <TableCell className="max-w-xs truncate" title={question.question_text}>
            {question.question_text || '-'}
          </TableCell>
          <TableCell className="text-center">{question.max_marks}</TableCell>
          <TableCell className="text-center">{question.avg_marks}</TableCell>
          <TableCell className="text-center">
            <div className="flex items-center gap-2">
              <Progress value={question.attempt_percentage} className="w-16 h-2" />
              <span className="text-sm">{question.attempt_percentage}%</span>
            </div>
          </TableCell>
          <TableCell className="text-center">
            <Badge className={getDifficultyColor(question.difficulty_index)}>
              {getDifficultyLabel(question.difficulty_index)}
            </Badge>
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-muted/20 p-4 ml-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Part</TableHead>
                    <TableHead className="w-20">Marks</TableHead>
                    <TableHead className="w-20">Avg</TableHead>
                    <TableHead className="w-28">Attempt %</TableHead>
                    <TableHead className="w-24">Difficulty</TableHead>
                    <TableHead>Bloom</TableHead>
                    <TableHead>CO</TableHead>
                    <TableHead>Topic</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {question.sub_questions.map((sq) => (
                    <TableRow key={sq.sub_question_id}>
                      <TableCell className="font-mono">{sq.label}</TableCell>
                      <TableCell>{sq.max_marks}</TableCell>
                      <TableCell>{(Number(sq.avg_marks) || 0).toFixed(1)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Progress value={sq.attempt_percentage} className="w-12 h-2" />
                          <span className="text-xs">{sq.attempt_percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getDifficultyColor(sq.difficulty_index)}>
                          {(Number(sq.difficulty_index) || 0).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sq.bloom_level && (
                          <Badge className={getBloomColor(sq.bloom_level)}>
                            {sq.bloom_level}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sq.co_code && (
                          <Badge variant="outline">{sq.co_code}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-28" title={sq.topic_name || ''}>
                        {sq.topic_name || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
};

const SectionCard = ({ section }: { section: SectionData }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{section.section_name}</CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {section.question_count} Questions
            </Badge>
            <Badge variant="outline" className={getDifficultyColor(section.avg_difficulty)}>
              Avg Difficulty: {(Number(section.avg_difficulty) || 0).toFixed(2)}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Max: {section.max_marks} marks | Avg: {section.avg_marks} marks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Q.No</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="w-20 text-center">Max</TableHead>
              <TableHead className="w-20 text-center">Avg</TableHead>
              <TableHead className="w-32 text-center">Attempt %</TableHead>
              <TableHead className="w-28 text-center">Difficulty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.questions.map((q) => (
              <QuestionRow key={q.question_id} question={q} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface QuestionAnalysisProps {
  examId: string;
}

export default function QuestionAnalysis({ examId }: QuestionAnalysisProps) {
  // Fetch analysis data
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['questionAnalysis', examId],
    queryFn: () => apiClient.get(`/analytics/role/faculty/question-analysis/${examId}`).then(r => r.data),
    enabled: !!examId,
  });
  
  const analysis: AnalysisData | null = response?.data || null;
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
          <p>Unable to load question analysis</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!analysis) {
    return null;
  }
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Question Analysis
            </h2>
            <p className="text-muted-foreground">
              {analysis.subject_code} - {analysis.subject_name} ({analysis.exam_type})
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              <strong>{analysis.total_students}</strong> students evaluated
            </p>
            <p className="text-sm text-muted-foreground">
              Avg: {analysis.avg_marks}/{analysis.total_marks} ({analysis.avg_percentage}%)
            </p>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hardest Questions */}
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <TrendingDown className="w-4 h-4" />
                Hardest Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.hardest_questions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{q.label}</span>
                    <div className="flex items-center gap-2">
                      {q.bloom && (
                        <Badge variant="outline" className="text-xs">
                          {q.bloom}
                        </Badge>
                      )}
                      <Badge className="bg-red-500 text-white">
                        {(Number(q.difficulty * 100) || 0).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Easiest Questions */}
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
                Easiest Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.easiest_questions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{q.label}</span>
                    <div className="flex items-center gap-2">
                      {q.bloom && (
                        <Badge variant="outline" className="text-xs">
                          {q.bloom}
                        </Badge>
                      )}
                      <Badge className="bg-emerald-500 text-white">
                        {(Number(q.difficulty * 100) || 0).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Bloom Analysis */}
        {Object.keys(analysis.bloom_analysis).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Bloom Level Analysis
              </CardTitle>
              <CardDescription>
                Average difficulty by cognitive level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(analysis.bloom_analysis).map(([bloom, data]) => (
                  <Tooltip key={bloom}>
                    <TooltipTrigger>
                      <div className={`px-4 py-2 rounded-lg ${getBloomColor(bloom)}`}>
                        <p className="font-medium capitalize">{bloom}</p>
                        <p className="text-sm">
                          {data.count} questions • {(Number(data.avg_difficulty * 100) || 0).toFixed(0)}% easy
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Average Difficulty Index: {(Number(data.avg_difficulty) || 0).toFixed(3)}</p>
                      <p>{data.count} questions at this level</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Difficulty Legend */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Difficulty Index:</span>
              <Badge className="bg-red-100 text-red-600">Very Hard (0-0.2)</Badge>
              <Badge className="bg-orange-100 text-orange-600">Hard (0.2-0.4)</Badge>
              <Badge className="bg-yellow-100 text-yellow-600">Moderate (0.4-0.6)</Badge>
              <Badge className="bg-green-100 text-green-600">Easy (0.6-0.8)</Badge>
              <Badge className="bg-emerald-100 text-emerald-600">Very Easy (0.8-1.0)</Badge>
            </div>
          </CardContent>
        </Card>
        
        {/* Sections */}
        {analysis.sections.map((section) => (
          <SectionCard key={section.section_id} section={section} />
        ))}
      </div>
    </TooltipProvider>
  );
}
