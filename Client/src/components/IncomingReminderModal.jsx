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
    if (!url) return;
    teardownCall();

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => {
      setSessionState('PLAYING');
    };

    audio.onended = () => {
      setSessionState('COMPLETED');
    };

    audio.onerror = (e) => {
      console.warn('[IncomingReminderModal] Audio playback error:', e);
      setErrorMessage('Audio playback failed. Please try replay.');
      setSessionState('ERROR');
    };

    try {
      await audio.play();
    } catch (err) {
      console.warn('[IncomingReminderModal] play() promise rejected:', err);
      setErrorMessage('Playback prevented by browser policy. Tap Replay to listen.');
      setSessionState('ERROR');
    }
  };

  const handleAccept = async () => {
    if (!reminder) return;
    setSessionState('CONNECTING');

    try {
      const session = await incomingReminderService.acceptReminder(reminder.scheduleId);
      const activeCallId = session?.callId;
      setCallId(activeCallId);

      if (!activeCallId) {
        setErrorMessage('Failed to initialize active voice session.');
        setSessionState('ERROR');
        return;
      }

      // Fetch the pre-generated 24kHz PCM wrapped as WAV
      const url = await incomingReminderService.fetchSessionAudioBlob(activeCallId);
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
          playAudio(url);
        }
      }, 1000);
    } catch (err) {
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
      playAudio(audioUrl);
    }
  };

  if (!reminder) return null;

  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incoming Study Reminder"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl border border-indigo-500/30 flex flex-col items-center text-center">
        {/* Animated background glow */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Top Header Tag */}
        <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-5 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {sessionState === 'RINGING' && 'Incoming AI Reminder'}
            {sessionState === 'CONNECTING' && 'Connecting Voice Call...'}
            {sessionState === 'COUNTDOWN' && 'Voice Session Connected'}
            {sessionState === 'PLAYING' && 'Teaching Pariksha AI Speaking'}
            {sessionState === 'COMPLETED' && 'Reminder Completed'}
            {sessionState === 'ERROR' && 'Call Warning'}
          </span>
        </div>

        {/* Center Visualizer & Avatar */}
        <div className="relative my-3 flex items-center justify-center">
          {sessionState === 'RINGING' && (
            <>
              <div className="absolute h-32 w-32 rounded-full bg-indigo-500/20 animate-ping opacity-75" />
              <div className="absolute h-24 w-24 rounded-full bg-indigo-500/30 animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/50 border-2 border-indigo-300/40">
                <Bell className="w-9 h-9 text-white animate-bounce" />
              </div>
            </>
          )}

          {sessionState === 'CONNECTING' && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-indigo-800/80 border-2 border-indigo-400 shadow-lg">
              <Loader2 className="w-9 h-9 text-indigo-300 animate-spin" />
            </div>
          )}

          {sessionState === 'COUNTDOWN' && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 border-2 border-indigo-300 shadow-lg shadow-indigo-500/40">
              <span className="text-3xl font-bold text-white animate-pulse">{countdownLeft}s</span>
            </div>
          )}

          {sessionState === 'PLAYING' && (
            <div className="relative flex flex-col items-center justify-center">
              <div className="absolute h-28 w-28 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/50 border-2 border-emerald-300/40">
                <Volume2 className="w-9 h-9 text-white animate-pulse" />
              </div>
              {/* Dynamic waveform simulation */}
              <div className="flex items-center gap-1 mt-4">
                <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-pulse" />
                <span className="w-1.5 h-10 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-1.5 h-8 bg-emerald-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-11 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                <span className="w-1.5 h-5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          {sessionState === 'COMPLETED' && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/30 border-2 border-emerald-400 shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
          )}

          {sessionState === 'ERROR' && (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/30 border-2 border-rose-400 shadow-lg">
              <PhoneOff className="w-9 h-9 text-rose-400" />
            </div>
          )}
        </div>

        {/* Caller Name */}
        <h2 className="text-xl font-bold tracking-tight text-white mt-1">
          {reminder.callerName || 'Teaching Pariksha AI'}
        </h2>
        <p className="text-sm text-indigo-200/80 mt-0.5">
          {sessionState === 'RINGING' && 'Calling for scheduled study session'}
          {sessionState === 'CONNECTING' && 'Initializing audio channel...'}
          {sessionState === 'COUNTDOWN' && `AI starting speech in ${countdownLeft}s...`}
          {sessionState === 'PLAYING' && `Active Call • ${formatDuration(callDuration)}`}
          {sessionState === 'COMPLETED' && `Call Ended • Total Duration ${formatDuration(callDuration)}`}
          {sessionState === 'ERROR' && errorMessage}
        </p>

        {/* Task Details Card */}
        <div className="w-full my-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-left backdrop-blur-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 block mb-1">
            Task Due Now
          </span>
          <h3 className="text-base font-semibold text-white leading-snug break-words">
            {reminder.taskTitle}
          </h3>
          {reminder.taskDescription && (
            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
              {reminder.taskDescription}
            </p>
          )}
        </div>

        {/* State Indicator */}
        {sessionState === 'RINGING' && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-5">
            <Clock className="w-3.5 h-3.5" />
            <span>Ringing expires in {secondsLeft}s</span>
          </div>
        )}

        {/* Action Controls */}
        {sessionState === 'RINGING' ? (
          <div className="w-full grid grid-cols-2 gap-4 mt-1">
            {/* Reject Button */}
            <button
              type="button"
              onClick={handleReject}
              className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 border border-rose-500/40 text-rose-300 font-medium transition-all group cursor-pointer"
              aria-label="Decline Reminder"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 group-hover:bg-rose-500 text-white shadow-md shadow-rose-600/40 transition-colors">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold">Decline</span>
            </button>

            {/* Accept Button */}
            <button
              type="button"
              onClick={handleAccept}
              className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-4 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/40 text-emerald-300 font-medium transition-all group cursor-pointer"
              aria-label="Accept and Listen"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 group-hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/40 transition-colors">
                <Phone className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-xs font-semibold">Accept</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center gap-4 mt-2">
            {/* Replay Button (available when completed or playing) */}
            <button
              type="button"
              onClick={handleReplay}
              disabled={sessionState === 'CONNECTING' || sessionState === 'COUNTDOWN'}
              className="flex flex-col items-center justify-center gap-1 py-3 px-5 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-95 border border-indigo-400/40 text-indigo-200 font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Replay Audio"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Replay</span>
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={handleEndCall}
              className="flex flex-col items-center justify-center gap-1 py-3 px-6 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 border border-rose-500/40 text-rose-300 font-medium transition-all cursor-pointer"
              aria-label="End Call"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/40">
                <PhoneOff className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">End Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
