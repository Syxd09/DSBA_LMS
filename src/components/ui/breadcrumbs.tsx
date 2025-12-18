import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// Map of path segments to human-readable labels
const pathLabels: Record<string, string> = {
  'dashboard': 'Dashboard',
  'departments': 'Departments',
  'programs': 'Programs',
  'cohorts': 'Cohorts',
  'subjects': 'Subjects',
  'course-outcomes': 'Course Outcomes',
  'exams': 'Exams',
  'marks-entry': 'Marks Entry',
  'student-enrollments': 'Student Enrollments',
  'teacher-assignments': 'Teacher Assignments',
  'results': 'Results',
  'performance': 'Performance',
  'analytics': 'Analytics',
  'copo-analytics': 'CO-PO Analytics',
  'attainment': 'Attainment Dashboard',
  'grade-management': 'Grade Management',
  'users': 'Users',
  'audit-logs': 'Audit Logs',
  'messages': 'Messages',
  'feedback': 'Feedback',
  'hod-dashboard': 'HOD Dashboard',
};

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from current path if items not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    let currentPath = '';

    return pathSegments.map((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      return {
        label: pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        href: isLast ? undefined : currentPath,
      };
    });
  })();

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm', className)}>
      <ol className="flex items-center gap-1">
        {showHome && (
          <>
            <li>
              <Link
                to="/dashboard"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            {breadcrumbItems.length > 0 && (
              <li className="text-muted-foreground">
                <ChevronRight className="w-4 h-4" />
              </li>
            )}
          </>
        )}

        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
            )}
            {item.href ? (
              <Link
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <Breadcrumbs items={breadcrumbs} className="mb-3" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
