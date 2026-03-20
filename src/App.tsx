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
import Students from "./pages/Students";
import TeacherAssignments from "./pages/TeacherAssignments";
import GradeManagement from "./pages/GradeManagement";
import COPOAnalytics from "./pages/COPOAnalytics";
import AuditLogs from "./pages/AuditLogs";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/approvals" element={<HODDashboard />} />
            <Route path="/marks-entry" element={<MarksEntry />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/users" element={<Users />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/results" element={<Results />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/cohorts" element={<Cohorts />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/feedback" element={<StudentFeedback />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/course-outcomes" element={<CourseOutcomes />} />
            <Route path="/program-outcomes" element={<ProgramOutcomes />} />
            <Route path="/student-enrollments" element={<StudentEnrollments />} />
            <Route path="/students" element={<Students />} />

            <Route path="/teacher-assignments" element={<TeacherAssignments />} />
            <Route path="/grade-management" element={<GradeManagement />} />
            <Route path="/co-po-analytics" element={<COPOAnalytics />} />
            <Route path="/attainment" element={<AttainmentDashboard />} />
            <Route path="/student-analytics" element={<StudentAnalytics />} />
            <Route path="/po-attainment" element={<POAttainmentDashboard />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/co-po-traceability" element={<COPOTraceability />} />
            
            {/* Feedback Template Management Routes (Admin/Principal/HOD) */}
            <Route path="/feedback/templates" element={<FeedbackTemplates />} />
            <Route path="/feedback/templates/create" element={<CreateFeedbackTemplate />} />
            <Route path="/feedback/templates/:id" element={<ViewFeedbackTemplate />} />
            <Route path="/feedback/templates/:templateId/results" element={<TemplateResults />} />
            
            {/* Teacher Feedback Routes */}
            <Route path="/feedback/teacher/assigned" element={<TeacherAssignedStudents />} />
            <Route path="/feedback/teacher/create/:studentId" element={<CreateFeedback />} />
            <Route path="/feedback/teacher/edit/:feedbackId" element={<EditFeedback />} />
            <Route path="/feedback/teacher/view/:feedbackId" element={<ViewFeedback />} />
            
            {/* HOD Analytics Routes */}
            <Route path="/analytics/hod/dashboard" element={<HODAnalyticsDashboard />} />
            <Route path="/analytics/hod/pending-approvals" element={<PendingApprovals />} />
            <Route path="/analytics/hod/at-risk" element={<AtRiskStudents />} />
            <Route path="/analytics/hod/student/:studentId" element={<StudentAnalyticsDetail />} />
            
            {/* Principal Analytics Routes */}
            <Route path="/analytics/principal/dashboard" element={<PrincipalAnalyticsDashboard />} />
            <Route path="/analytics/principal/final-approvals" element={<FinalApprovals />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
