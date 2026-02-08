/**
 * Approval Notifications Component
 * Provides toast notifications for approval/rejection events
 */
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Bell, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  type: 'approval' | 'rejection' | 'pending' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Simulated notifications for demo - in production, fetch from API
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'approval',
    title: 'Marks Approved',
    message: 'Internal Assessment 1 marks for CS101 have been approved by HOD.',
    timestamp: new Date(),
    read: false,
  },
  {
    id: '2',
    type: 'pending',
    title: 'Approval Required',
    message: 'New marks submission for CS201 awaiting your approval.',
    timestamp: new Date(Date.now() - 3600000),
    read: false,
  },
];

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejection':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <DropdownMenuItem 
              key={notification.id}
              className={`flex gap-3 p-3 cursor-pointer ${!notification.read ? 'bg-muted/50' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              {getIcon(notification.type)}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{notification.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                <p className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</p>
              </div>
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Utility functions for showing notification toasts
export const showApprovalToast = (title: string, description: string) => {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>{title}</span>
      </div>
    ) as any,
    description,
  });
};

export const showRejectionToast = (title: string, description: string) => {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-red-500" />
        <span>{title}</span>
      </div>
    ) as any,
    description,
    variant: 'destructive',
  });
};

export const showPendingToast = (title: string, description: string) => {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-yellow-500" />
        <span>{title}</span>
      </div>
    ) as any,
    description,
  });
};

export default NotificationBell;
