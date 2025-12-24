import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, Maximize2 } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  newData?: any;
  oldData?: any;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  };
}

export function RecentActivity({ limit = 5 }: { limit?: number }) {
  // Fetch small list for card
  const { data: logs, isLoading } = useQuery({
    queryKey: ["recent-activity", limit],
    queryFn: async () => {
      const { data } = await api.get(`/audit-logs?limit=${limit}`);
      return data;
    },
    refetchInterval: 30000, 
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Recent Activity
          </div>
          <ViewAllDialog />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
             {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                   <div className="w-8 h-8 rounded-full bg-muted" />
                   <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                   </div>
                </div>
             ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No recent activity found.
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log: AuditLog) => (
              <ActivityItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function ActivityItem({ log }: { log: AuditLog }) {
    const details = log.newData || log.oldData || {};
    // Extract meaningful target info based on available keys
    const target = details.studentName || details.email || details.name || details.target || details.rollNumber || (details.fieldUpdated ? `Updated: ${details.fieldUpdated}` : '');

    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 p-2 bg-muted rounded-full shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                    <span className="font-semibold text-foreground">{log.user?.fullName || 'System User'}</span> 
                    <span className="font-normal text-muted-foreground"> {formatAction(log.action)}</span>
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                    {target && ` • ${target}`}
                </div>
            </div>
        </div>
    );
}

function ViewAllDialog() {
    const { data: allLogs, isLoading } = useQuery({
        queryKey: ["all-activity"],
        queryFn: async () => {
            const { data } = await api.get(`/audit-logs?limit=50`);
            return data;
        },
        enabled: false // Lazy load? actually Trigger will load if we don't enable false? 
        // DialogContent doesn't mount until open? 
        // Let's just create a component that calls useQuery inside content
    });

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">View All</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Activity Log</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                    <FullActivityList />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FullActivityList() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ["all-activity"],
        queryFn: async () => {
            const { data } = await api.get(`/audit-logs?limit=50`);
            return data;
        }
    });

    if (isLoading) return <div className="py-8 text-center">Loading activity...</div>;
    
    return (
        <div className="space-y-6 py-4">
            {logs?.map((log: AuditLog) => (
               <ActivityItem key={log.id} log={log} />
            ))}
        </div>
    );
}

function formatAction(action: string) {
    return action.toLowerCase().replace(/_/g, ' ');
}
