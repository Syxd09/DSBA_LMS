import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AppRole } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  BarChart3,
  GraduationCap,
  ClipboardList,
  TrendingUp,
  Award,
  Building2,
  LogOut,
  UserCheck,
  Target,
  Settings,
  History,
  Grid3X3,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Profile {
  full_name: string;
  email: string;
}

interface SidebarProps {
  role: AppRole | null;
  profile: Profile | null;
  onSignOut: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Grouped navigation configuration for each role
const navigationConfig: Record<AppRole, NavSection[]> = {
  principal: [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Academic Structure',
      items: [
        { name: 'Departments', href: '/departments', icon: Building2 },
        { name: 'Programs', href: '/programs', icon: GraduationCap },
        { name: 'Cohorts', href: '/cohorts', icon: Users },
        { name: 'Subjects', href: '/subjects', icon: BookOpen },
      ],
    },
    {
      title: 'People',
      items: [
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Student Enrollments', href: '/student-enrollments', icon: UserCheck },
        { name: 'Teacher Assignments', href: '/teacher-assignments', icon: ClipboardList },
      ],
    },
    {
      title: 'Outcomes & Mapping',
      items: [
        { name: 'Program Outcomes', href: '/program-outcomes', icon: Target },
        { name: 'CO-PO Mapping', href: '/co-po-mapping', icon: Grid3X3 },
      ],
    },
    {
      title: 'Grades & Analytics',
      items: [
        { name: 'Grades & SGPA', href: '/grade-management', icon: Award },
        { name: 'CO-PO Analytics', href: '/co-po-analytics', icon: Target },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Audit Logs', href: '/audit-logs', icon: History },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ],
  hod: [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Academic Structure',
      items: [
        { name: 'Programs', href: '/programs', icon: GraduationCap },
        { name: 'Cohorts', href: '/cohorts', icon: Users },
        { name: 'Subjects', href: '/subjects', icon: BookOpen },
      ],
    },
    {
      title: 'People',
      items: [
        { name: 'Student Enrollments', href: '/student-enrollments', icon: UserCheck },
        { name: 'Teacher Assignments', href: '/teacher-assignments', icon: ClipboardList },
      ],
    },
    {
      title: 'Assessments',
      items: [
        { name: 'Exams', href: '/exams', icon: ClipboardList },
        { name: 'Course Outcomes', href: '/course-outcomes', icon: FileText },
      ],
    },
    {
      title: 'Outcomes & Mapping',
      items: [
        { name: 'Program Outcomes', href: '/program-outcomes', icon: Target },
        { name: 'CO-PO Mapping', href: '/co-po-mapping', icon: Grid3X3 },
      ],
    },
    {
      title: 'Grades & Analytics',
      items: [
        { name: 'Grades & SGPA', href: '/grade-management', icon: Award },
        { name: 'CO-PO Analytics', href: '/co-po-analytics', icon: Target },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      ],
    },
  ],
  teacher: [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Teaching',
      items: [
        { name: 'My Subjects', href: '/subjects', icon: BookOpen },
        { name: 'Course Outcomes', href: '/course-outcomes', icon: FileText },
      ],
    },
    {
      title: 'Assessments',
      items: [
        { name: 'Exams', href: '/exams', icon: ClipboardList },
        { name: 'Marks Entry', href: '/marks-entry', icon: PenTool },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { name: 'CO-PO Analytics', href: '/co-po-analytics', icon: Target },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      ],
    },
  ],
  student: [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Academics',
      items: [
        { name: 'My Results', href: '/results', icon: Award },
        { name: 'Performance', href: '/performance', icon: TrendingUp },
      ],
    },
  ],
};

export function Sidebar({ role, profile, onSignOut }: SidebarProps) {
  if (!role) return null;

  const sections = navigationConfig[role] || navigationConfig.student;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">EduMetrics</h1>
            <p className="text-xs text-muted-foreground capitalize">{role} Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-secondary-foreground">
              {profile?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email || ''}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
