import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, CheckCircle, Archive } from 'lucide-react';

interface ExamTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    drafts: number;
    scheduled: number;
    published: number;
    completed: number;
  };
}

export function ExamTabs({ activeTab, onTabChange, counts }: ExamTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
        <TabsTrigger value="drafts" className="relative">
          <FileText className="w-4 h-4 mr-2" />
          Drafts
          {counts.drafts > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
              {counts.drafts}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="scheduled" className="relative">
          <Calendar className="w-4 h-4 mr-2" />
          Scheduled
          {counts.scheduled > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
              {counts.scheduled}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="published" className="relative">
          <CheckCircle className="w-4 h-4 mr-2" />
          Published
          {counts.published > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
              {counts.published}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="relative">
          <Archive className="w-4 h-4 mr-2" />
          Completed
          {counts.completed > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
              {counts.completed}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
