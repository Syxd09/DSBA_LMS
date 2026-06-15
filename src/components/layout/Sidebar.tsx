import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AppRole } from '@/hooks/useAuth';
import { useMessaging } from '@/contexts/MessagingContext';
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
  LogOut,
  Target,
  History,
  UserCheck2,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  Building2,
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

const navigationConfig: Record<AppRole, Array<{ name: string; href: string; icon: any }>> = {
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Departments', href: '/departments', icon: Building2},
    { name: 'Programs', href: '/programs', icon: GraduationCap },
    { name: 'Cohorts', href: '/cohorts', icon: Users },
    { name: 'Subjects', href: '/subjects', icon: BookOpen },
    { name: 'Student Enrollments', href: '/student-enrollments', icon: UserCheck },
    { name: 'Teacher Assignments', href: '/teacher-assignments', icon: ClipboardList },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Grades & SGPA', href: '/grade-management', icon: Award },
    { name: 'Course Outcomes (CO)', href: '/course-outcomes', icon: FileText },
    { name: 'Program Outcomes (PO)', href: '/program-outcomes', icon: Target },
    { name: 'CO-PO Traceability', href: '/co-po-traceability', icon: TrendingUp },
    { name: 'CO-PO Analytics', href: '/co-po-analytics', icon: BarChart3 },
    { name: 'Student Analytics', href: '/student-analytics', icon: UserCheck2 },
    { name: 'Feedback Templates', href: '/feedback/templates', icon: CheckCircle2 },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Audit Logs', href: '/audit-logs', icon: History },
  ],
  principal: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Departments', href: '/departments', icon: Building2},
    { name: 'Programs', href: '/programs', icon: GraduationCap },
    { name: 'Cohorts', href: '/cohorts', icon: Users },
    { name: 'Subjects', href: '/subjects', icon: BookOpen },
    { name: 'Student Enrollments', href: '/student-enrollments', icon: UserCheck },
    { name: 'Teacher Assignments', href: '/teacher-assignments', icon: ClipboardList },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Grades & SGPA', href: '/grade-management', icon: Award },
    { name: 'Course Outcomes (CO)', href: '/course-outcomes', icon: FileText },
    { name: 'Program Outcomes (PO)', href: '/program-outcomes', icon: Target },
    { name: 'CO-PO Traceability', href: '/co-po-traceability', icon: TrendingUp },
    { name: 'CO-PO Analytics', href: '/co-po-analytics', icon: BarChart3 },
    { name: 'Student Analytics', href: '/student-analytics', icon: UserCheck2 },
    { name: 'Feedback Templates', href: '/feedback/templates', icon: CheckCircle2 },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Audit Logs', href: '/audit-logs', icon: History },
  ],
  hod: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Department Analytics', href: '/analytics/hod/dashboard', icon: BarChart3 },
    { name: 'Cohorts', href: '/cohorts', icon: Users },
    { name: 'Subjects', href: '/subjects', icon: BookOpen },
    { name: 'Student Enrollments', href: '/student-enrollments', icon: UserCheck },
    { name: 'Teacher Assignments', href: '/teacher-assignments', icon: ClipboardList },
    { name: 'Course Outcomes (CO)', href: '/course-outcomes', icon: FileText },
    { name: 'Program Outcomes (PO)', href: '/program-outcomes', icon: Target },
    { name: 'CO-PO Traceability', href: '/co-po-traceability', icon: TrendingUp },
    { name: 'Exams', href: '/exams', icon: ClipboardList },
    { name: 'Grades & SGPA', href: '/grade-management', icon: Award },
    { name: 'CO-PO Analytics', href: '/co-po-analytics', icon: BarChart3 },
    { name: 'Student Analytics', href: '/student-analytics', icon: UserCheck2 },
    { name: 'Feedback Templates', href: '/feedback/templates', icon: CheckCircle2 },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/reports', icon: FileText },
  ],
  teacher: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Subjects', href: '/subjects', icon: BookOpen },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Student Feedback', href: '/feedback/teacher/assigned', icon: FileText },
    { name: 'Course Outcomes', href: '/course-outcomes', icon: FileText },
    { name: 'Exams', href: '/exams', icon: ClipboardList },
    { name: 'Marks Entry', href: '/marks-entry', icon: ClipboardList },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Analytics', href: '/co-po-analytics', icon: UserCheck2 },
  ],
  student: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'My Results', href: '/results', icon: Award },
    { name: 'Performance', href: '/performance', icon: TrendingUp },
  ],
};

const TRANSLATIONS = {
  appName: "DSBA_OBE Manager",
  portalSuffix: "Portal",
  signOut: "Sign Out"
};

export function Sidebar({ role, profile, onSignOut }: SidebarProps) {
  const { totalUnreadCount } = useMessaging();
  
  if (!role) return null;

  // Safe allow-list check to prevent dynamic key bracket notation attacks or prototype pollution
  const validRoles: AppRole[] = ['admin', 'principal', 'hod', 'teacher', 'student'];
  const safeRole = validRoles.includes(role) ? role : 'student';

  const navigation = navigationConfig[safeRole] || navigationConfig.student;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{TRANSLATIONS.appName}</h1>
            <p className="text-xs text-muted-foreground capitalize">{role} {TRANSLATIONS.portalSuffix}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded-md group relative',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{item.name}</span>
            {item.name === 'Messages' && totalUnreadCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground animate-pulse shadow-sm">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary flex items-center justify-center">
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
          {TRANSLATIONS.signOut}
        </Button>
      </div>
    </aside>
  );
}
