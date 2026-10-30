import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Stack of registered overlay dismissers (LIFO - last opened is dismissed first)
const overlayHandlers = [];

/**
 * Register a custom overlay dismissal function (modal, drawer, sheet, menu, etc.).
 * @param {Function} handler - Function returning true if it handled/dismissed an overlay, false otherwise.
 * @returns {Function} Unregister function.
 */
export function registerOverlayDismiss(handler) {
  if (typeof handler !== 'function') return () => {};
  overlayHandlers.push(handler);
  return () => {
    const idx = overlayHandlers.indexOf(handler);
    if (idx !== -1) overlayHandlers.splice(idx, 1);
  };
}

/**
 * Dispatches an Escape keydown event to dismiss standard dialogs/popups.
 */
export function dispatchEscapeKey() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const eventInit = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
  const escEvent = new KeyboardEvent('keydown', eventInit);
  document.dispatchEvent(escEvent);
  window.dispatchEvent(escEvent);
}

/**
 * Checks for and dismisses any active dismissible overlay (modals, drawers, dropdowns).
 * @returns {boolean} True if an overlay was dismissed, consuming the back action.
 */
export function dismissActiveOverlays() {
  if (typeof document === 'undefined') return false;

  // 1. Call registered overlay handlers in LIFO order
  for (let i = overlayHandlers.length - 1; i >= 0; i--) {
    try {
      const handled = overlayHandlers[i]();
      if (handled) return true;
    } catch (err) {
      console.warn('[BackNavigation] Error in registered overlay handler:', err);
    }
  }

  // 2. Check for open change-exam modal in DOM
  const changeExamModal = document.querySelector('.change-exam-modal-overlay, [data-change-exam-modal]');
  if (changeExamModal) {
    const closeBtn = changeExamModal.querySelector('button[aria-label="Close"], button.modal-close, button:has(svg.lucide-x)');
    if (closeBtn) {
      closeBtn.click();
      return true;
    }
  }

  // 3. Check for open ConfirmModal
  const confirmModal = document.querySelector('.confirm-modal-overlay');
  if (confirmModal) {
    const cancelBtn = confirmModal.querySelector('button:last-child, button.btn-cancel, button:has-text("Cancel")');
    if (cancelBtn) {
      cancelBtn.click();
      return true;
    }
    dispatchEscapeKey();
    return true;
  }

  // 4. Check for active dialogs / open modals with backdrop
  const activeDialog = document.querySelector('dialog[open], [role="dialog"][data-state="open"], .tp-drawer-backdrop, .tp-picker-overlay');
  if (activeDialog) {
    dispatchEscapeKey();
    const closeBtn = activeDialog.querySelector('button.btn-cancel, button[aria-label="Close"], button:has(svg.lucide-x)');
    if (closeBtn) closeBtn.click();
    return true;
  }

  // 5. Check for active fixed dropdowns / context menus (e.g. ManageQuizzes 3-dots menu)
  const activeBackdrop = document.querySelector('[style*="position: fixed"][style*="z-index: 99"][style*="background: transparent"]');
  if (activeBackdrop) {
    activeBackdrop.click();
    return true;
  }

  // 6. Global Escape key fallback for any remaining open modal/dialog elements
  const genericModal = document.querySelector('[role="dialog"], .modal.open, .dialog-backdrop, [data-overlay-container]');
  if (genericModal) {
    dispatchEscapeKey();
    return true;
  }

  return false;
}

let toastTimeout = null;

/**
 * Displays a clean, non-intrusive native-style bottom pill toast notification.
 * @param {string} message 
 */
export function showExitToast(message = "Press back again to exit") {
  if (typeof document === 'undefined') return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  let toast = document.getElementById('prepmark-back-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'prepmark-back-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 84px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(23, 23, 39, 0.94);
      color: #FFFFFF;
      padding: 10px 22px;
      border-radius: 50px;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: 0.2px;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      opacity: 0;
      transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  toastTimeout = setTimeout(() => {
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }
  }, 2000);
}

/**
 * Checks whether the current path is a top-level root screen where back triggers exit policy.
 */
export function isRootRoute(pathname) {
  const path = (pathname || '').replace(/\/+$/, '') || '/';

  // Public / Auth root screens
  if (path === '' || path === '/' || path === '/login') return true;

  // Student root dashboard
  if (path === '/dashboard') return true;

  // Admin / Faculty / Staff root dashboard
  if (path === '/admin' || path === '/admin/dashboard') return true;

  return false;
}

/**
 * Checks whether the current route is an active test/exam where back must be guarded.
 */
export function isExamRoute(pathname) {
  const path = pathname || '';
  return path.startsWith('/quiz') || path.startsWith('/live-exam/play');
}

/**
 * Deterministic parent route mapping for PrepMark's entire route hierarchy.
 * Used when direct entry, page refresh, or history gaps exist.
 */
export function getParentRoute(pathname, userRole) {
  const path = (pathname || '').replace(/\/+$/, '') || '/';

  // If already at root, no parent
  if (isRootRoute(path, userRole)) return null;

  // Auth & Policy subpages
  if (['/register', '/forgot-password', '/onboarding'].includes(path)) {
    return '/login';
  }
  if (['/terms', '/terms-conditions', '/terms-and-conditions', '/privacy', '/privacy-policy', '/refunds', '/refund', '/refund-policy'].includes(path)) {
    return userRole ? (userRole === 'admin' || userRole === 'superadmin' || userRole === 'faculty' ? '/admin/dashboard' : '/dashboard') : '/login';
  }

  // Active exam routes
  if (isExamRoute(path)) {
    return null; // Handled specially by isExamRoute guard
  }
  if (path.startsWith('/live-exam/')) {
    return '/dashboard/live-exams';
  }
  if (path === '/start-test') {
    return '/dashboard';
  }

  // Student nested routes
  if (path.startsWith('/student/exams/')) {
    return '/dashboard/exams';
  }
  if (path.startsWith('/dashboard/results/')) {
    return '/dashboard/results';
  }
  if (path.startsWith('/result') || path.startsWith('/results') || path.startsWith('/student/result/') || path.startsWith('/share-result/')) {
    return '/dashboard/results';
  }
  if (path.startsWith('/dashboard/practice/test/') || path.startsWith('/dashboard/practice/result/') || path.startsWith('/practice-result/')) {
    return '/dashboard/practice';
  }
  if (path === '/dashboard/create-custom-quiz') {
    return '/dashboard/practice';
  }
  if (path.startsWith('/dashboard/flashcards/')) {
    return '/dashboard';
  }
  if (path === '/student/profile') {
    return '/dashboard/profile';
  }

  // Top-level student secondary tabs -> parent is /dashboard
  const studentTabs = [
    '/dashboard/exams',
    '/dashboard/practice',
    '/dashboard/results',
    '/dashboard/profile',
    '/dashboard/leaderboard',
    '/dashboard/streak',
    '/dashboard/help',
    '/dashboard/pricing',
    '/dashboard/subscriptions',
    '/dashboard/live-exams',
    '/live-exams',
    '/dashboard/exams-list',
    '/dashboard/practice-list'
  ];
  if (studentTabs.includes(path)) {
    return '/dashboard';
  }

  // Admin nested routes
  if (
    path.startsWith('/admin/edit-quiz/') ||
    path.startsWith('/admin/quizzes/') ||
    path.startsWith('/admin/edit-quiz-multi/') ||
    path === '/admin/create-quiz' ||
    path === '/admin/create-quiz-multi'
  ) {
    return '/admin/manage-quizzes';
  }
  if (path.startsWith('/admin/edit-practice/') || path === '/admin/create-practice') {
    return '/admin/practice';
  }
  if (path.startsWith('/admin/exams/')) {
    return '/admin/exams';
  }
  if (path.startsWith('/admin/flashcards/')) {
    return '/admin/flashcards';
  }
  if (path.startsWith('/admin/users/')) {
    return '/admin/users';
  }
  if (path.startsWith('/admin/tickets/')) {
    return '/admin/tickets';
  }

  // Admin secondary panels -> parent is /admin/dashboard
  if (path.startsWith('/admin/')) {
    return '/admin/dashboard';
  }

  // Default fallback
  return userRole === 'admin' || userRole === 'superadmin' || userRole === 'faculty'
    ? '/admin/dashboard'
    : '/dashboard';
}
