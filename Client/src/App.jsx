import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { preloadAdminPanels, preloadStudentPanels } from "./utils/routePreloader";
import NavigationProgress from "./components/NavigationProgress";
const ForgotPassword = lazyWithRetry(() => import("./Pages/ForgotPassword"));
import AdminRoute from "./components/AdminRoute";
import PermissionRoute from "./components/PermissionRoute";
import SuperAdminRevenueRoute from "./components/SuperAdminRevenueRoute";


const AdminDashboard = lazyWithRetry(() => import("./admin/AdminDashboard"));
const CreateQuiz = lazyWithRetry(() => import("./admin/CreateQuiz"));
const EditQuiz = lazyWithRetry(() => import("./admin/EditQuiz"));
const ManageQuizzes = lazyWithRetry(() => import("./admin/ManageQuizzes"));
const AdminFlashcards = lazyWithRetry(() => import("./admin/AdminFlashcards"));
const CreateFlashcardSet = lazyWithRetry(() => import("./admin/CreateFlashcardSet"));
const ManageFlashcards = lazyWithRetry(() => import("./admin/ManageFlashcards"));
const AdminQuestions = lazyWithRetry(() => import("./admin/Questions"));
const AdminUsers = lazyWithRetry(() => import("./admin/Users"));
const AdminStudents = lazyWithRetry(() => import("./admin/Students"));
const AdminStaff = lazyWithRetry(() => import("./admin/Staff"));
const AdminResults = lazyWithRetry(() => import("./admin/Results"));
const Reports = lazyWithRetry(() => import("./admin/Reports"));
const Settings = lazyWithRetry(() => import("./admin/Settings"));
const VoiceSettings = lazyWithRetry(() => import("./admin/VoiceSettings"));


const AuditLog = lazyWithRetry(() => import("./admin/AuditLog"));
const AdminProfile = lazyWithRetry(() => import("./admin/components/AdminProfile"));
const PracticeQuizzes = lazyWithRetry(() => import("./admin/PracticeQuizzes"));
const CreatePracticeMulti = lazyWithRetry(() => import("./admin/CreatePracticeMulti"));
const RolesPermissions = lazyWithRetry(() => import("./admin/RolesPermissions"));
const AdminTickets = lazyWithRetry(() => import("./admin/AdminTickets"));
const ExamSeriesManager = lazyWithRetry(() => import("./admin/ExamSeriesManager"));
const CreateQuizMulti = lazyWithRetry(() => import("./admin/CreateQuizMulti"));
const AdminAttempts = lazyWithRetry(() => import("./admin/AdminAttempts"));
const AdminScoreAnalytics = lazyWithRetry(() => import("./admin/AdminScoreAnalytics"));
const AdminBanners = lazyWithRetry(() => import("./admin/AdminBanners"));
const LiveExamsList = lazyWithRetry(() => import("./admin/LiveExams/LiveExamsList"));
const LiveExamLobby = lazyWithRetry(() => import("./Pages/LiveExam/LiveExamLobby"));
const LiveExamPlayer = lazyWithRetry(() => import("./Pages/LiveExam/LiveExamPlayer"));
const StudentLiveExams = lazyWithRetry(() => import("./Pages/LiveExam/StudentLiveExams"));

const Login = lazyWithRetry(() => import("./Pages/Login"));
const StudentOnboarding = lazyWithRetry(() => import("./Pages/StudentOnboarding"));
const Register = lazyWithRetry(() => import("./Pages/Register"));
const StreakPage = lazyWithRetry(() => import("./Pages/StreakPage"));
const StudentDashboard = lazyWithRetry(() => import("./Pages/StudentDashboard"));
const StartTest = lazyWithRetry(() => import("./Pages/StartTest"));
const Quiz = lazyWithRetry(() => import("./Pages/Quiz"));
const Result = lazyWithRetry(() => import("./Pages/Result"));
const MyExams = lazyWithRetry(() => import("./Pages/MyExams"));
const ExamSeriesDetails = lazyWithRetry(() => import("./Pages/ExamSeriesDetails"));
const FlashcardStudyView = lazyWithRetry(() => import("./Pages/FlashcardStudyView"));
const PracticeDashboard = lazyWithRetry(() => import("./Pages/PracticeDashboard"));
const PracticeTest = lazyWithRetry(() => import("./Pages/PracticeTest"));
const PracticeResult = lazyWithRetry(() => import("./Pages/PracticeResult"));
const StudentResults = lazyWithRetry(() => import("./Pages/StudentResults"));
const SubjectResults = lazyWithRetry(() => import("./Pages/SubjectResults"));
const Leaderboard = lazyWithRetry(() => import("./Pages/Leaderboard"));
const SharedResult = lazyWithRetry(() => import("./Pages/SharedResult"));
const HelpSupport = lazyWithRetry(() => import("./Pages/HelpSupport"));
const StudentProfile = lazyWithRetry(() => import("./Pages/StudentProfile"));
const ExamsPage = lazyWithRetry(() => import("./Pages/ExamsPage"));
const PracticePage = lazyWithRetry(() => import("./Pages/PracticePage"));
const CreateCustomQuiz = lazyWithRetry(() => import("./Pages/CreateCustomQuiz"));
const PricingPlans = lazyWithRetry(() => import("./Pages/PricingPlans"));
const MySubscriptions = lazyWithRetry(() => import("./Pages/MySubscriptions"));
const AdminAiPlans = lazyWithRetry(() => import("./admin/AiPlans"));
const RevenueDashboard = lazyWithRetry(() => import("./admin/RevenueDashboard"));
const AiSubscribers = lazyWithRetry(() => import("./admin/AiSubscribers"));
const AdminLibrary = lazyWithRetry(() => import("./admin/AdminLibrary"));
import ThemeButton from "./components/ThemeButton";
import ThemePicker from "./components/ThemePicker";
import GlobalBackButtonHandler from "./components/GlobalBackButtonHandler";
import { SocketProvider, useSocket } from "./context/SocketContext";
import incomingReminderService from "./services/incomingReminderService";
import IncomingReminderModal from "./components/IncomingReminderModal";

function IncomingReminderSocketListener() {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      console.log("[Socket] Received incoming-call event:", data);
      incomingReminderService.handleIncomingReminder(data);
    };

    socket.on("incoming-call", handleIncomingCall);
    return () => {
      socket.off("incoming-call", handleIncomingCall);
    };
  }, [socket]);

  return null;
}
const TermsConditions = lazyWithRetry(() => import("./Pages/TermsConditions"));
const PrivacyPolicy = lazyWithRetry(() => import("./Pages/PrivacyPolicy"));
const RefundPolicy = lazyWithRetry(() => import("./Pages/RefundPolicy"));

function App() {
  useEffect(() => {
    // Proactive background preloading to ensure instant sub-10ms navigation
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        preloadAdminPanels();
      } else if (path.startsWith('/dashboard') || path.startsWith('/student') || path === '/') {
        preloadStudentPanels();
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <NavigationProgress />
      <GlobalBackButtonHandler />
      <SocketProvider>
        <Suspense fallback={<div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0B0A10)' }}><div className="loader" style={{ width: '48px', height: '48px', border: '5px solid #4A358A', borderBottomColor: 'transparent', borderRadius: '50%', display: 'inline-block', boxSizing: 'border-box', animation: 'rotation 1s linear infinite' }}></div><style>{`@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style></div>}>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<StudentOnboarding />} />
        {/* ================= LEGAL & POLICY ROUTES ================= */}
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/terms-and-conditions" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refunds" element={<RefundPolicy />} />
        <Route path="/refund" element={<RefundPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />

        {/* ================= LIVE EXAMINATION ROUTES ================= */}
        <Route path="/live-exam/:slugOrToken" element={<LiveExamLobby />} />
        <Route
          path="/live-exam/play/:attemptId"
          element={
            <ProtectedRoute>
              <LiveExamPlayer />
            </ProtectedRoute>
          }
        />


        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboard />
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
          path="/result/:resultId"
          element={<Result />}
        />

        <Route
          path="/results/:resultId"
          element={<Result />}
        />

        <Route
          path="/student/result/:shareId"
          element={
            <ProtectedRoute>
              <Result />
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

        {/* ================= STUDENT SUBPAGE ROUTES ================= */}
        <Route
          path="/dashboard/exams"
          element={
            <ProtectedRoute>
              <MyExams />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/exams/:examSeriesId"
          element={
            <ProtectedRoute>
              <ExamSeriesDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/flashcards/:setId"
          element={
            <ProtectedRoute>
              <FlashcardStudyView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/live-exams"
          element={
            <ProtectedRoute>
              <StudentLiveExams />
            </ProtectedRoute>
          }
        />

        <Route
          path="/live-exams"
          element={
            <ProtectedRoute>
              <StudentLiveExams />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/exams-list"
          element={
            <ProtectedRoute>
              <ExamsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/practice-list"
          element={
            <ProtectedRoute>
              <PracticePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/create-custom-quiz"
          element={
            <ProtectedRoute>
              <CreateCustomQuiz />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/practice"
          element={
            <ProtectedRoute>
              <PracticeDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/practice/test/:quizId"
          element={
            <ProtectedRoute>
              <PracticeTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/practice/result/:resultId"
          element={
            <ProtectedRoute>
              <PracticeResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practice-result/:resultId"
          element={
            <ProtectedRoute>
              <PracticeResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/share-result/:shareId"
          element={<SharedResult />}
        />
        <Route
          path="/result/share/:shareId"
          element={<SharedResult />}
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
          path="/dashboard/streak"
          element={
            <ProtectedRoute>
              <StreakPage />
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
          path="/student/profile"
          element={
            <ProtectedRoute>
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/pricing"
          element={
            <ProtectedRoute>
              <PricingPlans />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/subscriptions"
          element={
            <ProtectedRoute>
              <MySubscriptions />
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN ROUTES ================= */}

        <Route
          path="/admin/ai-plans"
          element={<Navigate to="/admin/revenue?tab=ai-plans&subtab=manage-plans" replace />}
        />

        <Route
          path="/admin/revenue"
          element={
            <SuperAdminRevenueRoute>
              <RevenueDashboard />
            </SuperAdminRevenueRoute>
          }
        />

        <Route
          path="/admin/library"
          element={<Navigate to="/admin/manage-quizzes?tab=library" replace />}
        />

        <Route
          path="/admin/ai-subscribers"
          element={<Navigate to="/admin/revenue?tab=ai-plans&subtab=subscribers" replace />}
        />

        {/* DOOR 1: Catches people typing /admin */}
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
          path="/admin/quizzes/:quizId/edit"
          element={
            <AdminRoute>
              <EditQuiz />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/create-quiz-multi"
          element={
            <AdminRoute>
              <CreateQuizMulti />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/edit-quiz-multi/:id"
          element={
            <AdminRoute>
              <CreateQuizMulti />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/quizzes/:quizId/edit-multi"
          element={
            <AdminRoute>
              <CreateQuizMulti />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/practice"
          element={
            <AdminRoute>
              <PracticeQuizzes />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/edit-practice/:id"
          element={
            <AdminRoute>
              <EditQuiz />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/create-practice"
          element={
            <AdminRoute>
              <CreatePracticeMulti />
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
          path="/admin/live-exams"
          element={
            <AdminRoute>
              <LiveExamsList />
            </AdminRoute>
          }
        />
        <Route path="/admin/flashcards" element={<AdminRoute><AdminFlashcards /></AdminRoute>} />
        <Route path="/admin/flashcards/create" element={<AdminRoute><CreateFlashcardSet /></AdminRoute>} />
        <Route path="/admin/flashcards/edit/:id" element={<AdminRoute><CreateFlashcardSet /></AdminRoute>} />
        <Route path="/admin/flashcards/:id/manage" element={<AdminRoute><ManageFlashcards /></AdminRoute>} />



        <Route
          path="/admin/questions"
          element={
            <AdminRoute>
              <AdminQuestions />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/students"
          element={
            <AdminRoute>
              <AdminStudents />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/students/:userId"
          element={
            <AdminRoute>
              <AdminStudents />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/staff"
          element={
            <AdminRoute>
              <AdminStaff />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/staff/:userId"
          element={
            <AdminRoute>
              <AdminStaff />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={<Navigate to="/admin/students" replace />}
        />

        <Route
          path="/admin/users/:userId"
          element={
            <AdminRoute>
              <AdminStudents />
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
          path="/admin/attempts"
          element={
            <AdminRoute>
              <AdminAttempts />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/score-analytics"
          element={
            <AdminRoute>
              <AdminScoreAnalytics />
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
          path="/admin/profile"
          element={
            <AdminRoute>
              <AdminProfile />
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
          path="/admin/tickets/:ticketId"
          element={
            <AdminRoute>
              <AdminTickets />
            </AdminRoute>
          }
        />

        <Route
            path="/admin/exams"
            element={
              <AdminRoute>
                <ExamSeriesManager />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/banners"
            element={
              <AdminRoute>
                <AdminBanners />
              </AdminRoute>
            }
          />

        <Route
          path="/admin/exams/:examId"
          element={
            <AdminRoute>
              <ExamSeriesManager />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/exams/:examId/edit"
          element={
            <AdminRoute>
              <ExamSeriesManager />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/voice-settings"
          element={
            <AdminRoute>
              <VoiceSettings />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/roles"
          element={
            <AdminRoute>
              <RolesPermissions />
            </AdminRoute>
          }
        />

        {/* Catch-all route to prevent blank screens */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
      </Suspense>
      
      <IncomingReminderSocketListener />
      <IncomingReminderModal />
      <ThemePicker />
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;

