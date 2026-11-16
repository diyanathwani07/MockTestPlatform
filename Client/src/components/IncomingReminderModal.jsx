import React, { useEffect, useState, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Bell,
  Clock,
  RotateCcw,
  Volume2,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import incomingReminderService from '../services/incomingReminderService';
import '../css/IncomingReminderModal.css';

export default function IncomingReminderModal() {
  const themeContext = useTheme();
  const isDark = Boolean(
    themeContext?.isDark ||
    themeContext?.mode === 'dark' ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
       document.body.classList.contains('dark-mode') ||
       document.documentElement.getAttribute('data-theme') === 'dark'))
  );

  const [reminder, setReminder] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [sessionState, setSessionState] = useState('RINGING'); // 'RINGING' | 'CONNECTING' | 'COUNTDOWN' | 'PLAYING' | 'COMPLETED' | 'ERROR'
  const [callId, setCallId] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [countdownLeft, setCountdownLeft] = useState(2);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const audioRef = useRef(null);
  const callTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const isCallActiveRef = useRef(false);

  // Subscribe to incoming reminder events from push/socket service
  useEffect(() => {
    const unsubscribe = incomingReminderService.subscribe((active) => {
      setReminder(active);
      if (active) {
        setSecondsLeft(60);
        setSessionState('RINGING');
        setCallId(null);
        setAudioUrl(null);
        setCallDuration(0);
        setErrorMessage('');
      } else {
        teardownCall();
      }
    });
    return () => {
      unsubscribe();
      teardownCall();
    };
  }, []);

  // 60-second ringing timeout countdown
  useEffect(() => {
    if (!reminder || sessionState !== 'RINGING') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [reminder, sessionState]);

  // Elapsed active call timer
  useEffect(() => {
    if (sessionState === 'PLAYING' || sessionState === 'COMPLETED') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [sessionState]);

  const teardownCall = () => {
    isCallActiveRef.current = false;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (_) {}
      audioRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const playAudio = async (url) => {
    if (!url || !isCallActiveRef.current) return;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (_) {}
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      if (isCallActiveRef.current) {
        setSessionState('COMPLETED');
      }
    };

    audio.onerror = (e) => {
      console.warn('[IncomingReminderModal] Audio playback error:', e);
      if (isCallActiveRef.current) {
        setErrorMessage('Failed to play reminder audio.');
        setSessionState('ERROR');
      }
    };

    try {
      setSessionState('PLAYING');
      await audio.play();
    } catch (err) {
      console.warn('[IncomingReminderModal] play() promise rejected:', err);
      if (isCallActiveRef.current) {
        setErrorMessage('Playback prevented by browser policy. Tap Replay to listen.');
        setSessionState('ERROR');
      }
    }
  };

  const handleAccept = async () => {
    if (!reminder) return;
    isCallActiveRef.current = true;
    setSessionState('CONNECTING');

    try {
      const session = await incomingReminderService.acceptReminder(reminder.scheduleId);
      if (!isCallActiveRef.current) return; // User hung up while accept was in-flight

      const activeCallId = session?.callId;
      setCallId(activeCallId);

      if (!activeCallId) {
        setErrorMessage('Failed to initialize active voice session.');
        setSessionState('ERROR');
        return;
      }

      // Fetch the pre-generated 24kHz PCM wrapped as WAV
      const url = await incomingReminderService.fetchSessionAudioBlob(activeCallId);
      if (!isCallActiveRef.current) return; // User hung up while audio blob was downloading
      setAudioUrl(url);

      // Start polite 2-second delay to give user time to listen / adjust audio
      setSessionState('COUNTDOWN');
      setCountdownLeft(2);

      let count = 2;
      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        setCountdownLeft(count);
        if (count <= 0) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          if (isCallActiveRef.current) {
            playAudio(url);
          }
        }
      }, 1000);
    } catch (err) {
      if (!isCallActiveRef.current) return;
      console.error('[IncomingReminderModal] Accept error:', err);
      setErrorMessage('Could not load reminder audio.');
      setSessionState('ERROR');
    }
  };

  const handleReject = async () => {
    if (!reminder) return;
    teardownCall();
    await incomingReminderService.rejectReminder(reminder.scheduleId);
  };

  const handleEndCall = async () => {
    teardownCall();
    if (callId) {
      await incomingReminderService.endCall(callId, 'USER_HANGUP');
    } else {
      incomingReminderService.dismiss('USER_HANGUP');
    }
  };

  const handleReplay = () => {
    if (audioUrl) {
      isCallActiveRef.current = true;
      setCallDuration(0);
      playAudio(audioUrl);
    }
  };

  if (!reminder) return null;

  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const callerDisplayName = 'PrepMark';

  const displayDescription = reminder.taskDescription
    ? reminder.taskDescription
        .replace(/Teaching Pariksha(\s*AI)?/gi, 'PrepMark')
        .replace(/\bAI\b/g, '')
        .trim()
    : `Scheduled study reminder for ${reminder.taskTitle || 'upcoming exam'}.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incoming Study Reminder"
      className="irm-overlay"
    >
      <div
        className="irm-modal-card"
        style={{
          color: isDark ? '#ffffff' : 'var(--text-primary, #0f172a)'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={sessionState === 'RINGING' ? handleReject : handleEndCall}
          className="irm-close-btn"
          aria-label="Close reminder modal"
          style={{
            color: isDark ? '#94a3b8' : 'var(--text-secondary, #64748b)'
          }}
        >
          <X size={18} />
        </button>

        {/* Status Pill with Live Pulsing Dot */}
        <div className="irm-status-pill">
          <span className="irm-live-dot" />
          <span>
            {sessionState === 'RINGING' && 'Incoming Reminder'}
            {sessionState === 'CONNECTING' && 'Connecting...'}
            {sessionState === 'COUNTDOWN' && 'Starting Call'}
            {sessionState === 'PLAYING' && 'Audio Playing'}
            {sessionState === 'COMPLETED' && 'Reminder Completed'}
            {sessionState === 'ERROR' && 'Call Alert'}
          </span>
        </div>

        {/* Center Visualizer & Avatar */}
        <div className="irm-avatar-wrapper">
          {sessionState === 'RINGING' && (
            <>
              <div className="irm-pulse-ring" />
              <div className="irm-avatar-circle">
                <Bell size={30} />
              </div>
            </>
          )}

          {sessionState === 'CONNECTING' && (
            <div className="irm-avatar-circle connecting">
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {sessionState === 'COUNTDOWN' && (
            <div className="irm-avatar-circle countdown">
              <span style={{ fontSize: '24px', fontWeight: 800 }}>{countdownLeft}s</span>
            </div>
          )}

          {sessionState === 'PLAYING' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="irm-avatar-circle playing">
                <Volume2 size={30} />
              </div>
              <div className="irm-spectrum-bars">
                <span className="irm-spectrum-bar" />
                <span className="irm-spectrum-bar" />
                <span className="irm-spectrum-bar" />
                <span className="irm-spectrum-bar" />
                <span className="irm-spectrum-bar" />
              </div>
            </div>
          )}

          {sessionState === 'COMPLETED' && (
            <div className="irm-avatar-circle completed">
              <CheckCircle2 size={36} />
            </div>
          )}

          {sessionState === 'ERROR' && (
            <div className="irm-avatar-circle error">
              <PhoneOff size={30} />
            </div>
          )}
        </div>

        {/* Caller Title & Subtitle */}
        <h2
          className="irm-caller-name"
          style={{ color: isDark ? '#ffffff' : 'var(--text-primary, #0f172a)' }}
        >
          {callerDisplayName}
        </h2>
        <p
          className="irm-session-status"
          style={{ color: isDark ? '#cbd5e1' : 'var(--text-secondary, #64748b)' }}
        >
          {sessionState === 'RINGING' && 'Scheduled exam reminder'}
          {sessionState === 'CONNECTING' && 'Connecting audio...'}
          {sessionState === 'COUNTDOWN' && `Playing voice reminder in ${countdownLeft}s...`}
          {sessionState === 'PLAYING' && `Active Call • ${formatDuration(callDuration)}`}
          {sessionState === 'COMPLETED' && `Finished • ${formatDuration(callDuration)}`}
          {sessionState === 'ERROR' && (errorMessage || 'Audio session ended')}
        </p>

        {/* Task Details Card */}
        <div className="irm-task-card">
          <span className="irm-task-badge">Study Reminder</span>
          <h3
            className="irm-task-title"
            style={{ color: isDark ? '#ffffff' : 'var(--text-primary, #0f172a)' }}
          >
            {reminder.taskTitle}
          </h3>
          <p
            className="irm-task-desc"
            style={{ color: isDark ? '#cbd5e1' : 'var(--text-secondary, #64748b)' }}
          >
            {displayDescription}
          </p>
        </div>

        {/* Ringing Timeout Indicator */}
        {sessionState === 'RINGING' && (
          <div
            className="irm-ringing-timer"
            style={{ color: isDark ? '#94a3b8' : 'var(--text-secondary, #64748b)' }}
          >
            <Clock size={13} />
            <span>Expires in {secondsLeft}s</span>
          </div>
        )}

        {/* Actions Controls */}
        {sessionState === 'RINGING' ? (
          <div className="irm-dialer-row">
            {/* Decline Button */}
            <div className="irm-action-item">
              <button
                type="button"
                onClick={handleReject}
                aria-label="Decline Reminder"
                className="irm-circle-btn decline"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <PhoneOff size={22} style={{ color: '#ffffff', stroke: '#ffffff' }} />
              </button>
              <span
                className="irm-action-label decline"
                style={{
                  color: isDark ? '#f87171' : '#ef4444',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginTop: '8px'
                }}
              >
                Decline
              </span>
            </div>

            {/* Accept Button */}
            <div className="irm-action-item">
              <button
                type="button"
                onClick={handleAccept}
                aria-label="Accept and Listen"
                className="irm-circle-btn accept"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Phone size={22} style={{ color: '#ffffff', stroke: '#ffffff' }} />
              </button>
              <span
                className="irm-action-label accept"
                style={{
                  color: isDark ? '#34d399' : '#10b981',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginTop: '8px'
                }}
              >
                Accept
              </span>
            </div>
          </div>
        ) : (
          <div className="irm-dialer-row">
            {/* Replay Button - Crisp Solid White Circle */}
            <div className="irm-action-item">
              <button
                type="button"
                onClick={handleReplay}
                disabled={sessionState === 'CONNECTING' || sessionState === 'COUNTDOWN'}
                aria-label="Replay Audio"
                className="irm-circle-btn replay"
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid rgba(0, 0, 0, 0.12)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: sessionState === 'CONNECTING' || sessionState === 'COUNTDOWN' ? 'not-allowed' : 'pointer',
                  opacity: sessionState === 'CONNECTING' || sessionState === 'COUNTDOWN' ? 0.45 : 1
                }}
              >
                <RotateCcw size={22} style={{ color: '#0f172a', stroke: '#0f172a', strokeWidth: 2.3 }} />
              </button>
              <span
                className="irm-action-label replay"
                style={{
                  color: isDark ? '#ffffff' : '#0f172a',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginTop: '8px'
                }}
              >
                Replay
              </span>
            </div>

            {/* End Call Button - Solid Bright Red Call Button */}
            <div className="irm-action-item">
              <button
                type="button"
                onClick={handleEndCall}
                aria-label="End Call"
                className="irm-circle-btn decline"
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <PhoneOff size={22} style={{ color: '#ffffff', stroke: '#ffffff', strokeWidth: 2.2 }} />
              </button>
              <span
                className="irm-action-label decline"
                style={{
                  color: isDark ? '#f87171' : '#ef4444',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginTop: '8px'
                }}
              >
                End Call
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
