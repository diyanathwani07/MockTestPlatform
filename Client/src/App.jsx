import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PreviewBanner from "./components/PreviewBanner";
import ForgotPassword from "./Pages/ForgotPassword";
import AdminRoute from "./components/AdminRoute";


import AdminDashboard from "./admin/AdminDashboard";
import CreateQuiz from "./admin/CreateQuiz";
import EditQuiz from "./admin/EditQuiz";
import ManageQuizzes from "./admin/ManageQuizzes";
import AdminQuestions from "./admin/Questions";
import AdminUsers from "./admin/Users";
import AdminResults from "./admin/Results";
import Reports from "./admin/Reports";
import Settings from "./admin/Settings";
import AdminTickets from "./admin/AdminTickets";


// ─── 🎯 FORENSICALLY CORRECTED PATHS ───
import AuditLog from "./admin/AuditLog"; // <── (Requires src/admin/AuditLog.jsx to exist!)
import AdminProfile from "./admin/components/AdminProfile"; // <── Re-routed into 'components'

import Login from "./Pages/Login";
import Register from "./Pages/Register";
import StudentDashboard from "./Pages/StudentDashboard";
import MyExams from "./Pages/MyExams";
import StudentProfile from "./Pages/StudentProfile";
import StudentResults from "./Pages/StudentResults";
import SubjectResults from "./Pages/SubjectResults";
import Leaderboard from "./Pages/Leaderboard";
import HelpSupport from "./Pages/HelpSupport";
import StartTest from "./Pages/StartTest";
import Quiz from "./Pages/Quiz";
import Result from "./Pages/Result";

function App() {
  return (
    <BrowserRouter>
      <PreviewBanner />
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard/exams"
          element={
            <ProtectedRoute>
              <MyExams />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard/help"
          element={
            <ProtectedRoute>
              <HelpSupport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute>
              <StudentProfile />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard/results"
          element={
            <ProtectedRoute>
              <StudentResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/results/:subject"
          element={
            <ProtectedRoute>
              <SubjectResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/start-test"
          element={
            <ProtectedRoute>
              <StartTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route path="/login" element={<Login />} />

        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:quizId"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />

        <Route
          path="/result"
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN ROUTES ================= */}

        {/* DOOR 1: Catches people typing localhost:5173/admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* DOOR 2: Catches the Sidebar clicking /admin/dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/create-quiz"
          element={
            <AdminRoute>
              <CreateQuiz />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/edit-quiz/:id"
          element={
            <AdminRoute>
              <EditQuiz />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/manage-quizzes"
          element={
            <AdminRoute>
              <ManageQuizzes />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/questions"
          element={
            <AdminRoute>
              <AdminQuestions />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/results"
          element={
            <AdminRoute>
              <AdminResults />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <Reports />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />

        {/* ─── 2. THE TWO MISSING DOORS UNLOCKED HERE ─── */}
        <Route
          path="/admin/audit-log"
          element={
            <AdminRoute>
              <AuditLog />
            </AdminRoute>
          }
        />
        
        <Route
          path="/admin/tickets"
          element={
            <AdminRoute>
              <AdminTickets />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/profile"
          element={
            <AdminRoute>
              <AdminProfile />
            </AdminRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;