import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  GraduationCap,
  ClipboardList,
  TrendingUp,
  Award,
  Building2,
} from 'lucide-react';

const navigationConfig = {
  principal: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Departments', href: '/departments', icon: Building2 },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Curriculum', href: '/curriculum', icon: BookOpen },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Transcripts', href: '/transcripts', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ],
  hod: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Teachers', href: '/teachers', icon: Users },
    { name: 'Subjects', href: '/subjects', icon: BookOpen },
    { name: 'Exams', href: '/exams', icon: ClipboardList },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'At-Risk Students', href: '/at-risk', icon: TrendingUp },
  ],
  teacher: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Subjects', href: '/subjects', icon: BookOpen },
    { name: 'Marks Entry', href: '/marks-entry', icon: ClipboardList },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Students', href: '/students', icon: GraduationCap },
  ],
  student: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Results', href: '/results', icon: Award },
    { name: 'Performance', href: '/performance', icon: TrendingUp },
    { name: 'Transcripts', href: '/transcripts', icon: FileText },
  ],
};

export function Sidebar() {
  const { user } = useAuth();
  
  if (!user) return null;

  const navigation = navigationConfig[user.role];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">EduMetrics</h1>
            <p className="text-xs text-muted-foreground capitalize">{user.role} Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary flex items-center justify-center">
            <span className="text-sm font-medium text-secondary-foreground">
              {user.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
