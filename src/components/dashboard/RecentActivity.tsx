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
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['recent-activity', limit],
    queryFn: async () => {
      const { data } = await api.get(`/audit-logs?limit=${limit}`);
      return data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Activity className="h-6 w-6 animate-pulse opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Loading Ledger...</p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Clock className="h-6 w-6 opacity-10" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {logs.map((log, index) => (
        <div key={log.id} className="group p-5 hover:bg-slate-900 transition-all duration-500">
          <div className="flex items-start gap-4">
            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-700 group-hover:bg-white group-hover:border-white transition-all shadow-sm" />
            <div className="flex-1 space-y-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-foreground group-hover:text-white transition-colors">
                {log.action.replace(/_/g, ' ')}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-muted-foreground group-hover:text-white/60">
                  {log.user.fullName}
                </span>
                <span className="w-1 h-1 bg-border/40 rounded-full group-hover:bg-white/20" />
                <span className="text-[9px] font-medium text-muted-foreground group-hover:text-white/40">
                  {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                </span>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white transition-all">
                   <Maximize2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border/40">
                <DialogHeader>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Audit Detail: {log.id}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] mt-4 rounded-xl border border-border/40 p-4 bg-slate-950/5">
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-muted-foreground">Action</p>
                           <p className="text-sm font-bold">{log.action}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase text-muted-foreground">Principal</p>
                           <p className="text-sm font-bold">{log.user.fullName} ({log.user.email})</p>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Modification Delta</p>
                        <pre className="text-[10px] p-4 rounded-lg bg-slate-900 text-slate-300 overflow-auto font-mono">
                           {JSON.stringify({ old: log.oldData, new: log.newData }, null, 2)}
                        </pre>
                     </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ))}
    </div>
  );
}
