import { Button } from '@/components/ui/button';
import { Bell, LogOut, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AppRole } from '@/hooks/useAuth';

interface Profile {
  full_name: string;
  email: string;
}

interface HeaderProps {
  profile: Profile | null;
  role: AppRole | null;
  onSignOut: () => void;
}

export function Header({ profile, role, onSignOut }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students, subjects, exams..."
            className="pl-10 bg-background h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground capitalize">{role || 'Unknown'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
