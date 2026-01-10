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
  // TEMPORARILY DISABLED - Audit logs endpoint requires database investigation
  // Component will be re-enabled after proper fix
  return null;
}
