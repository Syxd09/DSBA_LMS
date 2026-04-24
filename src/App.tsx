import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AcademicContextProvider } from "@/contexts/AcademicContext";
import { FeedbackProvider } from "@/contexts/FeedbackContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MarksEntry from "./pages/MarksEntry";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import Departments from "./pages/Departments";
import Subjects from "./pages/Subjects";
import Results from "./pages/Results";
import Performance from "./pages/Performance";
import Programs from "./pages/Programs";
import Cohorts from "./pages/Cohorts";
import Exams from "./pages/Exams";
import CourseOutcomes from "./pages/CourseOutcomes";
import StudentEnrollments from "./pages/StudentEnrollments";
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Students from "./pages/Students";
import TeacherAssignments from "./pages/TeacherAssignments";
import GradeManagement from "./pages/GradeManagement";
import COPOAnalytics from "./pages/COPOAnalytics";
import HODDashboard from "./pages/HODDashboard";
import StudentFeedback from "./pages/StudentFeedback";
import Messages from "./pages/Messages";
import AttainmentDashboard from "./pages/AttainmentDashboard";
import StudentAnalytics from "./pages/StudentAnalytics";
import POAttainmentDashboard from "./pages/POAttainmentDashboard";
import ProgramOutcomes from "./pages/ProgramOutcomes";
import COPOTraceability from "./pages/COPOTraceability";
import TeacherAssignedStudents from "./pages/feedback/teacher/TeacherAssignedStudents";
import CreateFeedback from "./pages/feedback/teacher/CreateFeedback";
import EditFeedback from "./pages/feedback/teacher/EditFeedback";
import ViewFeedback from "./pages/feedback/teacher/ViewFeedback";
import FeedbackTemplates from "./pages/feedback/FeedbackTemplates";
import CreateFeedbackTemplate from "./pages/feedback/CreateFeedbackTemplate";
import ViewFeedbackTemplate from "./pages/feedback/ViewFeedbackTemplate";
import TemplateResults from './pages/feedback/TemplateResults';
import HODAnalyticsDashboard from "./pages/analytics/hod/HODAnalyticsDashboard";
import PendingApprovals from "./pages/analytics/hod/PendingApprovals";
import AtRiskStudents from "./pages/analytics/hod/AtRiskStudents";
import StudentAnalyticsDetail from "./pages/analytics/hod/StudentAnalyticsDetail";
import PrincipalAnalyticsDashboard from "./pages/analytics/principal/PrincipalAnalyticsDashboard";
import FinalApprovals from "./pages/analytics/principal/FinalApprovals";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AcademicContextProvider>
      <FeedbackProvider>
        <AnalyticsProvider>
          <MessagingProvider>
            <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/students" element={<AuthGuard><Students /></AuthGuard>} />
            <Route path="/attendance" element={<AuthGuard><Attendance /></AuthGuard>} />
            <Route path="/reports" element={<AuthGuard><Reports /></AuthGuard>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/approvals" element={<AuthGuard><HODDashboard /></AuthGuard>} />
            <Route path="/marks-entry" element={<AuthGuard><MarksEntry /></AuthGuard>} />
            <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
            <Route path="/users" element={<AuthGuard allowedRoles={['admin','principal','hod']}><Users /></AuthGuard>} />
            <Route path="/departments" element={<AuthGuard><Departments /></AuthGuard>} />
            <Route path="/subjects" element={<AuthGuard><Subjects /></AuthGuard>} />
            <Route path="/results" element={<AuthGuard><Results /></AuthGuard>} />
            <Route path="/performance" element={<AuthGuard><Performance /></AuthGuard>} />
            <Route path="/programs" element={<AuthGuard><Programs /></AuthGuard>} />
            <Route path="/cohorts" element={<AuthGuard><Cohorts /></AuthGuard>} />
            <Route path="/exams" element={<AuthGuard><Exams /></AuthGuard>} />
            <Route path="/feedback" element={<AuthGuard><StudentFeedback /></AuthGuard>} />
            <Route path="/messages" element={<AuthGuard><Messages /></AuthGuard>} />
            <Route path="/course-outcomes" element={<AuthGuard><CourseOutcomes /></AuthGuard>} />
            <Route path="/program-outcomes" element={<AuthGuard><ProgramOutcomes /></AuthGuard>} />
            <Route path="/student-enrollments" element={<AuthGuard><StudentEnrollments /></AuthGuard>} />
            <Route path="/teacher-assignments" element={<AuthGuard><TeacherAssignments /></AuthGuard>} />
            <Route path="/grade-management" element={<AuthGuard><GradeManagement /></AuthGuard>} />
            <Route path="/co-po-analytics" element={<AuthGuard><COPOAnalytics /></AuthGuard>} />
            <Route path="/attainment" element={<AuthGuard><AttainmentDashboard /></AuthGuard>} />
            <Route path="/student-analytics" element={<AuthGuard><StudentAnalytics /></AuthGuard>} />
            <Route path="/po-attainment" element={<AuthGuard><POAttainmentDashboard /></AuthGuard>} />
            <Route path="/audit-logs" element={<AuthGuard allowedRoles={['admin','principal']}><AuditLogs /></AuthGuard>} />
            <Route path="/co-po-traceability" element={<AuthGuard><COPOTraceability /></AuthGuard>} />

            {/* Feedback Template Routes */}
            <Route path="/feedback/templates" element={<AuthGuard><FeedbackTemplates /></AuthGuard>} />
            <Route path="/feedback/templates/create" element={<AuthGuard><CreateFeedbackTemplate /></AuthGuard>} />
            <Route path="/feedback/templates/:id" element={<AuthGuard><ViewFeedbackTemplate /></AuthGuard>} />
            <Route path="/feedback/templates/:templateId/results" element={<AuthGuard><TemplateResults /></AuthGuard>} />

            {/* Teacher Feedback Routes */}
            <Route path="/feedback/teacher/assigned" element={<AuthGuard allowedRoles={['teacher']}><TeacherAssignedStudents /></AuthGuard>} />
            <Route path="/feedback/teacher/create/:studentId" element={<AuthGuard allowedRoles={['teacher']}><CreateFeedback /></AuthGuard>} />
            <Route path="/feedback/teacher/edit/:feedbackId" element={<AuthGuard allowedRoles={['teacher']}><EditFeedback /></AuthGuard>} />
            <Route path="/feedback/teacher/view/:feedbackId" element={<AuthGuard allowedRoles={['teacher']}><ViewFeedback /></AuthGuard>} />

            {/* HOD Analytics Routes */}
            <Route path="/analytics/hod/dashboard" element={<AuthGuard allowedRoles={['hod','admin','principal']}><HODAnalyticsDashboard /></AuthGuard>} />
            <Route path="/analytics/hod/pending-approvals" element={<AuthGuard allowedRoles={['hod','admin','principal']}><PendingApprovals /></AuthGuard>} />
            <Route path="/analytics/hod/at-risk" element={<AuthGuard allowedRoles={['hod','admin','principal']}><AtRiskStudents /></AuthGuard>} />
            <Route path="/analytics/hod/student/:studentId" element={<AuthGuard allowedRoles={['hod','admin','principal']}><StudentAnalyticsDetail /></AuthGuard>} />

            {/* Principal Analytics Routes */}
            <Route path="/analytics/principal/dashboard" element={<AuthGuard allowedRoles={['principal','admin']}><PrincipalAnalyticsDashboard /></AuthGuard>} />
            <Route path="/analytics/principal/final-approvals" element={<AuthGuard allowedRoles={['principal','admin']}><FinalApprovals /></AuthGuard>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
          </ErrorBoundary>
          </TooltipProvider>
        </MessagingProvider>
        </AnalyticsProvider>
      </FeedbackProvider>
    </AcademicContextProvider>
  </QueryClientProvider>
);

export default App;
