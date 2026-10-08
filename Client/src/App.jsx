import React, { Suspense, lazy, useEffect } from "react";
import { initPushNotifications } from './utils/pushNotifications';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
const ForgotPassword = lazy(() => import("./Pages/ForgotPassword"));
import AdminRoute from "./components/AdminRoute";


const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const CreateQuiz = lazy(() => import("./admin/CreateQuiz"));
const EditQuiz = lazy(() => import("./admin/EditQuiz"));
const ManageQuizzes = lazy(() => import("./admin/ManageQuizzes"));
const AdminFlashcards = lazy(() => import("./admin/AdminFlashcards"));
const CreateFlashcardSet = lazy(() => import("./admin/CreateFlashcardSet"));
const ManageFlashcards = lazy(() => import("./admin/ManageFlashcards"));
const AdminQuestions = lazy(() => import("./admin/Questions"));
const AdminUsers = lazy(() => import("./admin/Users"));
const AdminResults = lazy(() => import("./admin/Results"));
const Reports = lazy(() => import("./admin/Reports"));
const Settings = lazy(() => import("./admin/Settings"));


const AuditLog = lazy(() => import("./admin/AuditLog")); // <── (Requires src/admin/AuditLog.jsx to exist!)
const AdminProfile = lazy(() => import("./admin/components/AdminProfile")); // <── Re-routed into 'components'
const PracticeQuizzes = lazy(() => import("./admin/PracticeQuizzes"));
const CreatePracticeMulti = lazy(() => import("./admin/CreatePracticeMulti"));
const RolesPermissions = lazy(() => import("./admin/RolesPermissions"));
const AdminTickets = lazy(() => import("./admin/AdminTickets"));
const ExamSeriesManager = lazy(() => import("./admin/ExamSeriesManager"));
const CreateQuizMulti = lazy(() => import("./admin/CreateQuizMulti"));
const AdminAttempts = lazy(() => import("./admin/AdminAttempts"));
const AdminScoreAnalytics = lazy(() => import("./admin/AdminScoreAnalytics"));
const AdminBanners = lazy(() => import("./admin/AdminBanners"));

const Login = lazy(() => import("./Pages/Login"));
const StudentOnboarding = lazy(() => import("./Pages/StudentOnboarding"));
const Register = lazy(() => import("./Pages/Register"));
const StreakPage = lazy(() => import("./Pages/StreakPage"));
const StudentDashboard = lazy(() => import("./Pages/StudentDashboard"));
const StartTest = lazy(() => import("./Pages/StartTest"));
const Quiz = lazy(() => import("./Pages/Quiz"));
const Result = lazy(() => import("./Pages/Result"));
const MyExams = lazy(() => import("./Pages/MyExams"));
const ExamSeriesDetails = lazy(() => import("./Pages/ExamSeriesDetails"));
const FlashcardStudyView = lazy(() => import("./Pages/FlashcardStudyView"));
const PracticeDashboard = lazy(() => import("./Pages/PracticeDashboard"));
const PracticeTest = lazy(() => import("./Pages/PracticeTest"));
const PracticeResult = lazy(() => import("./Pages/PracticeResult"));
const StudentResults = lazy(() => import("./Pages/StudentResults"));
const SubjectResults = lazy(() => import("./Pages/SubjectResults"));
const Leaderboard = lazy(() => import("./Pages/Leaderboard"));
const SharedResult = lazy(() => import("./Pages/SharedResult"));
const HelpSupport = lazy(() => import("./Pages/HelpSupport"));
const StudentProfile = lazy(() => import("./Pages/StudentProfile"));
const ExamsPage = lazy(() => import("./Pages/ExamsPage"));
const PracticePage = lazy(() => import("./Pages/PracticePage"));
const CreateCustomQuiz = lazy(() => import("./Pages/CreateCustomQuiz"));
const PricingPlans = lazy(() => import("./Pages/PricingPlans"));
const MySubscriptions = lazy(() => import("./Pages/MySubscriptions"));
const AdminAiPlans = lazy(() => import("./admin/AiPlans"));
const RevenueDashboard = lazy(() => import("./admin/RevenueDashboard"));
const AiSubscribers = lazy(() => import("./admin/AiSubscribers"));
import ThemeButton from "./components/ThemeButton";
import ThemePicker from "./components/ThemePicker";
import { SocketProvider } from "./context/SocketContext";
const TermsConditions = lazy(() => import("./Pages/TermsConditions"));
const PrivacyPolicy = lazy(() => import("./Pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./Pages/RefundPolicy"));

function App() {
  useEffect(() => {
    // Initialize native push notifications (Capacitor only)
    initPushNotifications();
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <Suspense fallback={<div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0B0A10)' }}><div className="loader" style={{ width: '48px', height: '48px', border: '5px solid #4A358A', borderBottomColor: 'transparent', borderRadius: '50%', display: 'inline-block', boxSizing: 'border-box', animation: 'rotation 1s linear infinite' }}></div><style>{`@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style></div>}>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<StudentOnboarding />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />

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
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results/:resultId"
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          }
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
          element={
            <AdminRoute>
              <AdminAiPlans />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/revenue"
          element={
            <AdminRoute>
              <RevenueDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/ai-subscribers"
          element={
            <AdminRoute>
              <AiSubscribers />
            </AdminRoute>
          }
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
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users/:userId"
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
          path="/admin/roles"
          element={
            <AdminRoute>
              <RolesPermissions />
            </AdminRoute>
          }
        />

      </Routes>
      </Suspense>
      
      <ThemePicker />
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;

