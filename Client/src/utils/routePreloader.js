/**
 * High-performance route preloading engine for PrepMark.
 * Fetches route chunks on link hover or touch before the user clicks,
 * eliminating network lag and making panel switches instantaneous.
 */

// Cache of preloaded paths to avoid redundant network invocations
const preloadedPaths = new Set();

// Map of canonical route paths to their dynamic import loaders
const ROUTE_LOADERS = {
  // Admin Panel Routes
  '/admin': () => import('../admin/AdminDashboard'),
  '/admin/dashboard': () => import('../admin/AdminDashboard'),
  '/admin/manage-quizzes': () => import('../admin/ManageQuizzes'),
  '/admin/create-quiz': () => import('../admin/CreateQuiz'),
  '/admin/create-quiz-multi': () => import('../admin/CreateQuizMulti'),
  '/admin/staff': () => import('../admin/Staff'),
  '/admin/students': () => import('../admin/Students'),
  '/admin/revenue': () => import('../admin/RevenueDashboard'),
  '/admin/banners': () => import('../admin/AdminBanners'),
  '/admin/questions': () => import('../admin/Questions'),
  '/admin/practice': () => import('../admin/PracticeQuizzes'),
  '/admin/flashcards': () => import('../admin/AdminFlashcards'),
  '/admin/results': () => import('../admin/Results'),
  '/admin/reports': () => import('../admin/Reports'),
  '/admin/audit-log': () => import('../admin/AuditLog'),
  '/admin/tickets': () => import('../admin/AdminTickets'),
  '/admin/voice-settings': () => import('../admin/VoiceSettings'),
  '/admin/roles': () => import('../admin/RolesPermissions'),
  '/admin/live-exams': () => import('../admin/LiveExams/LiveExamsList'),

  // Student Panel Routes
  '/dashboard': () => import('../Pages/StudentDashboard'),
  '/dashboard/exams': () => import('../Pages/MyExams'),
  '/dashboard/exams-list': () => import('../Pages/ExamsPage'),
  '/dashboard/live-exams': () => import('../Pages/LiveExam/StudentLiveExams'),
  '/dashboard/practice': () => import('../Pages/PracticeDashboard'),
  '/dashboard/practice-list': () => import('../Pages/PracticePage'),
  '/dashboard/create-custom-quiz': () => import('../Pages/CreateCustomQuiz'),
  '/dashboard/results': () => import('../Pages/StudentResults'),
  '/dashboard/leaderboard': () => import('../Pages/Leaderboard'),
  '/dashboard/help': () => import('../Pages/HelpSupport'),
  '/dashboard/profile': () => import('../Pages/StudentProfile'),
  '/dashboard/pricing': () => import('../Pages/PricingPlans'),
  '/dashboard/subscriptions': () => import('../Pages/MySubscriptions'),
  '/dashboard/streak': () => import('../Pages/StreakPage'),
};

/**
 * Preload a specific route by path. Call on mouseEnter or touchStart.
 */
export function preloadRoute(path) {
  if (!path || typeof path !== 'string') return;
  const cleanPath = path.split('?')[0].split('#')[0];

  if (preloadedPaths.has(cleanPath)) return;

  const loader = ROUTE_LOADERS[cleanPath];
  if (loader) {
    preloadedPaths.add(cleanPath);
    loader().catch((err) => {
      // Allow retry later if it failed
      preloadedPaths.delete(cleanPath);
      console.warn(`[RoutePreloader] Could not preload ${cleanPath}:`, err?.message);
    });
  }
}

/**
 * Background preloader: quietly loads common panel bundles when browser is idle.
 */
export function preloadAdminPanels() {
  const adminRoutes = [
    '/admin/dashboard',
    '/admin/manage-quizzes',
    '/admin/staff',
    '/admin/students',
    '/admin/banners',
    '/admin/questions',
    '/admin/revenue',
    '/admin/practice',
    '/admin/tickets',
    '/admin/voice-settings'
  ];

  const run = () => {
    adminRoutes.forEach((route, idx) => {
      setTimeout(() => {
        preloadRoute(route);
      }, idx * 120);
    });
  };

  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 1000);
    }
  }
}

export function preloadStudentPanels() {
  const studentRoutes = [
    '/dashboard',
    '/dashboard/exams',
    '/dashboard/exams-list',
    '/dashboard/live-exams',
    '/dashboard/practice',
    '/dashboard/results',
    '/dashboard/leaderboard',
    '/dashboard/profile'
  ];

  const run = () => {
    studentRoutes.forEach((route, idx) => {
      setTimeout(() => {
        preloadRoute(route);
      }, idx * 120);
    });
  };

  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      setTimeout(run, 1000);
    }
  }
}
