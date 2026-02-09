import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleProvider } from "@/components/auth/RoleContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import TeacherAssignments from "./pages/TeacherAssignments";
import GradeManagement from "./pages/GradeManagement";
import COPOAnalytics from "./pages/COPOAnalytics";
import Reports from "./pages/Reports";  // NEW: NAAC/NBA Reports
import AuditLogs from "./pages/AuditLogs";
import UserSeeder from "./pages/UserSeeder";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import BacklogManagement from "./pages/BacklogManagement";
import SemesterPromotions from "./pages/SemesterPromotions";
import ExternalResults from "./pages/ExternalResults";
import Units from "./pages/Units";
import AssessmentComponents from "./pages/AssessmentComponents";
import Colleges from "./pages/Colleges";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import ProgramOutcomes from "./pages/ProgramOutcomes";
import COPOMapping from "./pages/COPOMapping";

const queryClient = new QueryClient();

import { ThemeProvider } from "@/components/theme-provider";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RoleProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected: Any authenticated user */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><Settings /></ProtectedRoute>
            } />
            <Route path="/results" element={
              <ProtectedRoute><Results /></ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute><Notifications /></ProtectedRoute>
            } />
            
            {/* Protected: Teacher, HOD, Principal only */}
            <Route path="/marks-entry" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <MarksEntry />
              </ProtectedRoute>
            } />
            <Route path="/exams" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <Exams />
              </ProtectedRoute>
            } />
            <Route path="/grade-management" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <GradeManagement />
              </ProtectedRoute>
            } />
            <Route path="/units" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <Units />
              </ProtectedRoute>
            } />
            <Route path="/assessment-components" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <AssessmentComponents />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/co-po-analytics" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <COPOAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/program-outcomes" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <ProgramOutcomes />
              </ProtectedRoute>
            } />
            <Route path="/co-po-mapping" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal']}>
                <COPOMapping />
              </ProtectedRoute>
            } />
            <Route path="/performance" element={
              <ProtectedRoute allowedRoles={['teacher', 'hod', 'principal', 'student']}>
                <Performance />
              </ProtectedRoute>
            } />
            
            {/* Protected: HOD, Principal only */}
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/departments" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <Departments />
              </ProtectedRoute>
            } />
            <Route path="/programs" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <Programs />
              </ProtectedRoute>
            } />
            <Route path="/cohorts" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <Cohorts />
              </ProtectedRoute>
            } />
            <Route path="/subjects" element={
              <ProtectedRoute allowedRoles={['hod', 'principal', 'teacher']}>
                <Subjects />
              </ProtectedRoute>
            } />
            <Route path="/course-outcomes" element={
              <ProtectedRoute allowedRoles={['hod', 'principal', 'teacher']}>
                <CourseOutcomes />
              </ProtectedRoute>
            } />
            <Route path="/student-enrollments" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <StudentEnrollments />
              </ProtectedRoute>
            } />
            <Route path="/teacher-assignments" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <TeacherAssignments />
              </ProtectedRoute>
            } />
            <Route path="/audit-logs" element={
              <ProtectedRoute allowedRoles={['principal']}>
                <AuditLogs />
              </ProtectedRoute>
            } />
            <Route path="/backlog-management" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <BacklogManagement />
              </ProtectedRoute>
            } />
            <Route path="/semester-promotions" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <SemesterPromotions />
              </ProtectedRoute>
            } />
            <Route path="/external-results" element={
              <ProtectedRoute allowedRoles={['hod', 'principal']}>
                <ExternalResults />
              </ProtectedRoute>
            } />
            
            {/* Protected: Principal only */}
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['principal']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/seed-users" element={
              <ProtectedRoute allowedRoles={['principal']}>
                <UserSeeder />
              </ProtectedRoute>
            } />
            <Route path="/colleges" element={
              <ProtectedRoute allowedRoles={['principal']}>
                <Colleges />
              </ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoleProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

