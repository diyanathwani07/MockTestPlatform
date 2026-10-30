import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { useExam } from '../context/ExamContext';
import { useSidebar } from '../context/SidebarContext';
import {
  dismissActiveOverlays,
  isRootRoute,
  isExamRoute,
  getParentRoute,
  showExitToast
} from '../utils/backNavigation';

export default function GlobalBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user } = useAuth() || {};
  const currentRole = role || user?.role;

  // Global Contexts for overlays
  const examContext = useExam();
  const sidebarContext = useSidebar();

  // Internal history tracking within PrepMark
  const historyStackRef = useRef([]);
  const isNavigatingBackRef = useRef(false);
  const lastBackPressTimeRef = useRef(0);
  const currentPathRef = useRef(location.pathname + location.search);

  // Maintain internal route history stack
  useEffect(() => {
    const fullPath = location.pathname + location.search;

    if (isNavigatingBackRef.current) {
      // Back action initiated by our handler; reset flag and update current path
      isNavigatingBackRef.current = false;
      currentPathRef.current = fullPath;
      return;
    }

    if (currentPathRef.current && currentPathRef.current !== fullPath) {
      const prevPath = currentPathRef.current;
      // Do not store duplicate consecutive entries
      const lastEntry = historyStackRef.current[historyStackRef.current.length - 1];
      if (lastEntry !== prevPath) {
        historyStackRef.current.push(prevPath);
        // Limit stack size to prevent unbounded memory growth
        if (historyStackRef.current.length > 50) {
          historyStackRef.current.shift();
        }
      }
    }

    currentPathRef.current = fullPath;
  }, [location.pathname, location.search]);

  // Register single centralized Android Back Button listener
  useEffect(() => {
    // Only activate on native Android platform
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const onBackButton = async () => {
      // 1. Check ExamContext ChangeExamModal
      if (examContext?.isChangeExamOpen) {
        examContext.closeChangeExamModal();
        return;
      }

      // 2. Check Sidebar mobile drawer
      if (sidebarContext?.mobileOpen) {
        sidebarContext.setMobileOpen(false);
        return;
      }

      // 3. Check for any generic active modals/drawers/dropdowns
      const overlayDismissed = dismissActiveOverlays();
      if (overlayDismissed) {
        return;
      }

      // 4. Guard active exam session to prevent accidental abandonment
      if (isExamRoute(location.pathname)) {
        showExitToast("Active exam in progress. Please submit to finish.");
        return;
      }

      // 5. Check if at root screen
      const atRoot = isRootRoute(location.pathname, currentRole);
      if (atRoot) {
        const now = Date.now();
        if (now - lastBackPressTimeRef.current < 2000) {
          // Double-back within 2 seconds: clean app exit
          await App.exitApp();
        } else {
          lastBackPressTimeRef.current = now;
          showExitToast("Press back again to exit");
        }
        return;
      }

      // 6. Navigate backwards through internal PrepMark history stack
      let targetPath = null;
      while (historyStackRef.current.length > 0) {
        const candidate = historyStackRef.current.pop();
        // Candidate must be different from current route
        if (candidate && candidate !== (location.pathname + location.search)) {
          targetPath = candidate;
          break;
        }
      }

      if (targetPath) {
        isNavigatingBackRef.current = true;
        navigate(targetPath);
        return;
      }

      // 7. Fallback to deterministic route hierarchy (e.g. after refresh, deep link, or direct entry)
      const parentRoute = getParentRoute(location.pathname, currentRole);
      if (parentRoute && parentRoute !== location.pathname) {
        isNavigatingBackRef.current = true;
        navigate(parentRoute);
      } else {
        // At the root of the hierarchy; trigger root exit policy
        const now = Date.now();
        if (now - lastBackPressTimeRef.current < 2000) {
          await App.exitApp();
        } else {
          lastBackPressTimeRef.current = now;
          showExitToast("Press back again to exit");
        }
      }
    };

    const listenerPromise = App.addListener('backButton', onBackButton);

    return () => {
      listenerPromise.then(handle => handle.remove()).catch(() => {});
    };
  }, [location.pathname, location.search, currentRole, examContext, sidebarContext, navigate]);

  return null;
}
