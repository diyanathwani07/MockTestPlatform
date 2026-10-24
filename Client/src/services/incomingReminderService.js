import { registerPlugin, Capacitor } from '@capacitor/core';
import axios from 'axios';

const IncomingReminder = registerPlugin('IncomingReminder');
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class IncomingReminderService {
  constructor() {
    this.activeReminder = null;
    this.listeners = new Set();
    this.timeoutTimer = null;
    this.webAudioContext = null;
    this.webAudioOscillators = [];
    this.handledDispatchIds = new Set();

    // Load previously handled dispatch IDs from sessionStorage to prevent re-triggering across page reloads
    try {
      const stored = sessionStorage.getItem('handled_reminder_dispatch_ids');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => this.handledDispatchIds.add(id));
        }
      }
    } catch (_) {}
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.activeReminder);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeReminder);
      } catch (err) {
        console.error('[IncomingReminderService] Listener error:', err);
      }
    });
  }

  /**
   * Main entrypoint for incoming call reminders from either Socket.IO or PushNotifications.
   */
  async handleIncomingReminder(payload) {
    if (!payload || typeof payload !== 'object') return false;

    const { scheduleId, dispatchId, taskTitle, callerName, taskDescription, reminderAudioText } = payload;

    // Validate required fields
    if (!scheduleId || !dispatchId) {
      console.warn('[IncomingReminderService] Ignored malformed payload missing scheduleId or dispatchId:', payload);
      return false;
    }

    // Deduplication check: ignore if this exact dispatch has already been processed or is active
    if (this.handledDispatchIds.has(dispatchId)) {
      console.log('[IncomingReminderService] Ignored duplicate dispatchId:', dispatchId);
      return false;
    }

    // Record dispatch ID in memory and session storage
    this.handledDispatchIds.add(dispatchId);
    try {
      const list = Array.from(this.handledDispatchIds).slice(-100); // keep last 100
      sessionStorage.setItem('handled_reminder_dispatch_ids', JSON.stringify(list));
    } catch (_) {}

    // Set active reminder
    this.activeReminder = {
      scheduleId,
      dispatchId,
      taskTitle: taskTitle || 'Scheduled Study Task',
      callerName: callerName || 'Teaching Pariksha AI',
      taskDescription: taskDescription || '',
      reminderAudioText: reminderAudioText || '',
      receivedAt: new Date().toISOString()
    };

    // Notify UI components
    this.notifyListeners();

    // Start ringtone & vibration
    await this.startRingtone(taskTitle, callerName, scheduleId);

    // Set 60-second auto-timeout
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = setTimeout(() => {
      console.log('[IncomingReminderService] Reminder timed out after 60 seconds.');
      this.dismiss('TIMEOUT');
    }, 60000);

    return true;
  }

  /**
   * Starts native ringtone and vibration, or falls back to Web Audio synthesis in desktop browsers.
   */
  async startRingtone(taskTitle, callerName, scheduleId) {
    if (Capacitor.isNativePlatform()) {
      try {
        await IncomingReminder.playRingtone();
        await IncomingReminder.showIncomingNotification({
          taskTitle: taskTitle || 'Study Reminder',
          callerName: callerName || 'Teaching Pariksha AI',
          scheduleId: scheduleId || ''
        });
        return;
      } catch (err) {
        console.warn('[IncomingReminderService] Native ringtone error, falling back to Web Audio:', err);
      }
    }

    // Web Audio Fallback: Modern pleasant electronic two-tone phone chime
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.stopWebRingtone();
      this.webAudioContext = new AudioCtx();
      if (this.webAudioContext.state === 'suspended') {
        await this.webAudioContext.resume();
      }

      const ctx = this.webAudioContext;
      const playTonePair = () => {
        if (!this.webAudioContext) return;
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // A4
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now); // B4

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      };

      playTonePair();
      const interval = setInterval(() => {
        if (!this.activeReminder || !this.webAudioContext) {
          clearInterval(interval);
        } else {
          playTonePair();
        }
      }, 3000);
      this.webAudioInterval = interval;
    } catch (e) {
      console.warn('[IncomingReminderService] Web Audio fallback unavailable:', e);
    }
  }

  stopWebRingtone() {
    if (this.webAudioInterval) {
      clearInterval(this.webAudioInterval);
      this.webAudioInterval = null;
    }
    if (this.webAudioContext) {
      try {
        this.webAudioContext.close();
      } catch (_) {}
      this.webAudioContext = null;
    }
  }

  async stopRingtone() {
    this.stopWebRingtone();
    if (Capacitor.isNativePlatform()) {
      try {
        await IncomingReminder.stopRingtone();
        await IncomingReminder.dismissNotification();
      } catch (_) {}
    }
  }

  /**
   * User Accept action (Transitions to Phase 5 Voice Session).
   */
  async acceptReminder(scheduleId) {
    await this.stopRingtone();
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);

    const token = localStorage.getItem('token');
    let sessionResult = null;

    if (token && scheduleId) {
      try {
        const response = await axios.post(
          `${API_URL}/api/ai-voice/schedule/${scheduleId}/accept`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sessionResult = response.data;
      } catch (err) {
        console.warn('[IncomingReminderService] Backend accept notification warning:', err.message);
      }
    }

    const callId = sessionResult?.callId || sessionResult?.data?.call?._id;
    if (this.activeReminder) {
      this.activeReminder.callId = callId;
      this.activeReminder.status = 'ACCEPTED';
    }

    return {
      success: true,
      callId,
      scheduleId,
      taskTitle: sessionResult?.data?.schedule?.taskTitle || this.activeReminder?.taskTitle,
      reminderAudioText: sessionResult?.data?.schedule?.reminderAudioText || this.activeReminder?.reminderAudioText
    };
  }

  /**
   * Ends an active voice session cleanly.
   */
  async endCall(callId, terminationReason = 'USER_HANGUP') {
    await this.stopRingtone();
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);

    const token = localStorage.getItem('token');
    if (token && callId) {
      try {
        await axios.post(
          `${API_URL}/api/ai-voice/session/${callId}/end`,
          { terminationReason },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.warn('[IncomingReminderService] Backend endCall warning:', err.message);
      }
    }

    if (this.currentAudioBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentAudioBlobUrl);
      } catch (_) {}
      this.currentAudioBlobUrl = null;
    }

    this.activeReminder = null;
    this.notifyListeners();
  }

  /**
   * Fetches the authenticated WAV audio stream for the active call session.
   */
  async fetchSessionAudioBlob(callId) {
    const token = localStorage.getItem('token');
    if (!token || !callId) {
      throw new Error('Authentication token or callId missing.');
    }

    const response = await axios.get(`${API_URL}/api/ai-voice/session/${callId}/audio`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });

    if (this.currentAudioBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentAudioBlobUrl);
      } catch (_) {}
    }

    this.currentAudioBlobUrl = URL.createObjectURL(response.data);
    return this.currentAudioBlobUrl;
  }

  /**
   * User Reject / Decline action.
   */
  async rejectReminder(scheduleId) {
    await this.stopRingtone();
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);

    const token = localStorage.getItem('token');
    if (token && scheduleId) {
      try {
        await axios.post(
          `${API_URL}/api/ai-voice/schedule/${scheduleId}/reject`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.warn('[IncomingReminderService] Backend reject notification warning:', err.message);
      }
    }

    const current = this.activeReminder;
    this.activeReminder = null;
    this.notifyListeners();
    return current;
  }

  dismiss(reason = 'DISMISSED') {
    this.stopRingtone();
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.activeReminder = null;
    this.notifyListeners();
  }
}

export const incomingReminderService = new IncomingReminderService();
export default incomingReminderService;
