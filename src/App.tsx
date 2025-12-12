import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AuditLogs from "./pages/AuditLogs";
import UserSeeder from "./pages/UserSeeder";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
          <Route path="/course-outcomes" element={<CourseOutcomes />} />
          <Route path="/student-enrollments" element={<StudentEnrollments />} />
          <Route path="/teacher-assignments" element={<TeacherAssignments />} />
          <Route path="/grade-management" element={<GradeManagement />} />
          <Route path="/co-po-analytics" element={<COPOAnalytics />} />
          <Route path="/seed-users" element={<UserSeeder />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
