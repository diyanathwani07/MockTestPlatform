import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Bell, Sparkles, Clock, RotateCcw, Volume2, Loader2, CheckCircle2 } from 'lucide-react';
import incomingReminderService from '../services/incomingReminderService';

export default function IncomingReminderModal() {
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

    audio.onplay = () => {
      if (isCallActiveRef.current) {
        setSessionState('PLAYING');
      }
    };

    audio.onended = () => {
      if (isCallActiveRef.current) {
        setSessionState('COMPLETED');
      }
    };

    audio.onerror = (e) => {
      console.warn('[IncomingReminderModal] Audio playback error:', e);
      if (isCallActiveRef.current) {
        setErrorMessage('Audio playback failed. Please try replay.');
        setSessionState('ERROR');
      }
    };

    try {
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

      // Start polite 2-second delay to give user time to bring phone to ear / adjust audio
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

  // Clean caller name: always display PrepMark as requested by user
  const callerDisplayName = 'PrepMark';

  // Clean description if redundant
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          borderRadius: '26px',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #181528 0%, #0f0d1b 100%)',
          border: '1px solid rgba(139, 92, 246, 0.28)',
          boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 35px rgba(124, 58, 237, 0.18)',
          padding: '24px 22px 28px 22px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        {/* Subtle decorative background ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            left: '-60px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            right: '-60px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '9999px',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            color: '#c4b5fd',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: '18px'
          }}
        >
          <Sparkles size={12} style={{ color: '#a78bfa' }} />
          <span>
            {sessionState === 'RINGING' && 'Incoming Reminder'}
            {sessionState === 'CONNECTING' && 'Connecting Call...'}
            {sessionState === 'COUNTDOWN' && 'Session Connected'}
            {sessionState === 'PLAYING' && 'PrepMark Speaking'}
            {sessionState === 'COMPLETED' && 'Reminder Finished'}
            {sessionState === 'ERROR' && 'Call Alert'}
          </span>
        </div>

        {/* Center Visualizer & Avatar */}
        <div
          style={{
            position: 'relative',
            marginTop: '4px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '84px'
          }}
        >
          {sessionState === 'RINGING' && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  width: '94px',
                  height: '94px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.15)',
                  animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)',
                  border: '2px solid rgba(196, 181, 253, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bell size={32} style={{ color: '#ffffff' }} />
              </div>
            </div>
          )}

          {sessionState === 'CONNECTING' && (
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'rgba(79, 70, 229, 0.3)',
                border: '2px solid rgba(167, 139, 250, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Loader2 size={34} style={{ color: '#c4b5fd', animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {sessionState === 'COUNTDOWN' && (
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                border: '2px solid rgba(196, 181, 253, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>{countdownLeft}s</span>
            </div>
          )}

          {sessionState === 'PLAYING' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
                  border: '2px solid rgba(167, 243, 208, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Volume2 size={32} style={{ color: '#ffffff' }} />
              </div>
              {/* Audio spectrum wave bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '18px', marginTop: '10px' }}>
                <span style={{ width: '4px', height: '12px', background: '#34d399', borderRadius: '4px', animation: 'pulse 1s infinite' }} />
                <span style={{ width: '4px', height: '18px', background: '#10b981', borderRadius: '4px', animation: 'pulse 0.7s infinite' }} />
                <span style={{ width: '4px', height: '14px', background: '#6ee7b7', borderRadius: '4px', animation: 'pulse 1.2s infinite' }} />
                <span style={{ width: '4px', height: '18px', background: '#10b981', borderRadius: '4px', animation: 'pulse 0.8s infinite' }} />
                <span style={{ width: '4px', height: '10px', background: '#34d399', borderRadius: '4px', animation: 'pulse 1.1s infinite' }} />
              </div>
            </div>
          )}

          {sessionState === 'COMPLETED' && (
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(52, 211, 153, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle2 size={38} style={{ color: '#34d399' }} />
            </div>
          )}

          {sessionState === 'ERROR' && (
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(248, 113, 113, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PhoneOff size={32} style={{ color: '#f87171' }} />
            </div>
          )}
        </div>

        {/* Caller Title */}
        <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.2px', color: '#ffffff', margin: '4px 0 2px 0' }}>
          {callerDisplayName}
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
          {sessionState === 'RINGING' && 'Calling for scheduled study session'}
          {sessionState === 'CONNECTING' && 'Initializing audio stream...'}
          {sessionState === 'COUNTDOWN' && `Starting reminder in ${countdownLeft}s...`}
          {sessionState === 'PLAYING' && `Active Call • ${formatDuration(callDuration)}`}
          {sessionState === 'COMPLETED' && `Call Ended • ${formatDuration(callDuration)}`}
          {sessionState === 'ERROR' && (errorMessage || 'Audio session interrupted')}
        </p>

        {/* Task Details Glass Card */}
        <div
          style={{
            width: '100%',
            margin: '16px 0 12px 0',
            padding: '14px 16px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'left'
          }}
        >
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#a78bfa',
              display: 'block',
              marginBottom: '4px'
            }}
          >
            Task Due Now
          </span>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#ffffff',
              margin: '0 0 4px 0',
              lineHeight: 1.35,
              wordBreak: 'break-word'
            }}
          >
            {reminder.taskTitle}
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              margin: 0,
              lineHeight: 1.45,
              wordBreak: 'break-word'
            }}
          >
            {displayDescription}
          </p>
        </div>

        {/* Ringing Timeout Indicator */}
        {sessionState === 'RINGING' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              color: '#94a3b8',
              marginBottom: '16px'
            }}
          >
            <Clock size={12} style={{ color: '#a78bfa' }} />
            <span>Ringing expires in {secondsLeft}s</span>
          </div>
        )}

        {/* Modern Call Dialer Action Controls */}
        {sessionState === 'RINGING' ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '40px',
              width: '100%',
              marginTop: '4px'
            }}
          >
            {/* Decline Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleReject}
                aria-label="Decline Reminder"
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  boxShadow: '0 8px 22px rgba(225, 29, 72, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <PhoneOff size={24} style={{ color: '#ffffff' }} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f87171', marginTop: '8px' }}>
                Decline
              </span>
            </div>

            {/* Accept Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleAccept}
                aria-label="Accept and Listen"
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 8px 22px rgba(16, 185, 129, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Phone size={24} style={{ color: '#ffffff' }} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', marginTop: '8px' }}>
                Accept
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '36px',
              width: '100%',
              marginTop: '8px'
            }}
          >
            {/* Replay Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleReplay}
                disabled={sessionState === 'CONNECTING' || sessionState === 'COUNTDOWN'}
                aria-label="Replay Audio"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(139, 92, 246, 0.45)',
                  background: 'rgba(139, 92, 246, 0.18)',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: sessionState === 'CONNECTING' || sessionState === 'COUNTDOWN' ? 'not-allowed' : 'pointer',
                  opacity: sessionState === 'CONNECTING' || sessionState === 'COUNTDOWN' ? 0.4 : 1,
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (sessionState !== 'CONNECTING' && sessionState !== 'COUNTDOWN') {
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <RotateCcw size={20} style={{ color: '#c4b5fd' }} />
              </button>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#c4b5fd', marginTop: '6px' }}>
                Replay
              </span>
            </div>

            {/* End Call Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleEndCall}
                aria-label="End Call"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  boxShadow: '0 8px 22px rgba(225, 29, 72, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <PhoneOff size={20} style={{ color: '#ffffff' }} />
              </button>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#f87171', marginTop: '6px' }}>
                End Call
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
