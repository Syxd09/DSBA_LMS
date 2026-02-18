import { Button } from '@/components/ui/button';
import { LogOut, Search, User, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AppRole } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentsApi } from '@/lib/api';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isStaff = role === 'principal' || role === 'hod' || role === 'teacher';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2 && isStaff) {
        setIsSearching(true);
        try {
          const data = await enrollmentsApi.list({ search: searchTerm });
          setResults(data.slice(0, 5)); // Limit to 5 results
          setShowResults(true);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, isStaff]);

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between z-50">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isStaff ? "Search students by name or USN..." : "Search subjects, exams..."}
            className="pl-10 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Search Results Dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-card border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="p-2 border-b bg-muted/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Student Profiles</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {results.map((student) => (
                  <button
                    key={student.id || student.user_id}
                    className="w-full text-left p-3 hover:bg-secondary/50 flex items-center gap-3 transition-colors border-b last:border-0 group"
                    onClick={() => {
                      navigate(`/student-360/${student.user_id}`);
                      setShowResults(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.usn}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

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
