import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Trigger instant progress on location change
    setVisible(true);
    setProgress(30);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setTimeout(() => {
      setProgress(75);
    }, 60);

    const completeTimer = setTimeout(() => {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(hideTimer);
    }, 220);

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(completeTimer);
    };
  }, [location.pathname, location.search]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '2.5px',
        zIndex: 999999,
        pointerEvents: 'none',
        background: 'transparent'
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--primary, #6E3FF3), #9065FA, var(--primary, #6E3FF3))',
          boxShadow: '0 0 10px var(--primary, #6E3FF3), 0 0 5px rgba(110, 63, 243, 0.5)',
          transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.2s ease-out' : 'width 0.25s cubic-bezier(0.1, 0.8, 0.2, 1)',
          opacity: visible ? 1 : 0
        }}
      />
    </div>
  );
}
