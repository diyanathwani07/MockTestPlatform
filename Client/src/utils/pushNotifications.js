import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';

// Get base API URL
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Register device token with backend
 */
const registerTokenWithBackend = async (token, platform) => {
  try {
    const jwt = localStorage.getItem('token');
    if (!jwt) return; // User not logged in
    
    await axios.post(`${apiUrl}/api/devices/register`, { token, platform }, {
      headers: { Authorization: `Bearer ${jwt}` }
    });
    console.log(`[PushNotifications] Registered ${platform} device with backend`);
  } catch (error) {
    console.error(`[PushNotifications] Failed to register device:`, error);
  }
};

/**
 * Unregister device token with backend
 */
export const unregisterDeviceToken = async (token) => {
  try {
    const jwt = localStorage.getItem('token');
    if (!jwt) return;
    
    await axios.delete(`${apiUrl}/api/devices/unregister`, {
      data: { token },
      headers: { Authorization: `Bearer ${jwt}` }
    });
    console.log(`[PushNotifications] Unregistered device from backend`);
  } catch (error) {
    console.error(`[PushNotifications] Failed to unregister device:`, error);
  }
};

/**
 * Setup Push Notifications for Capacitor (Android/iOS)
 */
export const setupNativePushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  // Re-register cached native token with backend if already stored from previous permission grant
  const cachedToken = localStorage.getItem('fcm_token');
  if (cachedToken) {
    registerTokenWithBackend(cachedToken, 'android');
  }

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.log('[PushNotifications] User denied push permission');
    return;
  }

  // Register with Apple / Google to receive token
  await PushNotifications.register();

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration', (token) => {
    console.log('[PushNotifications] Native token received: ', token.value);
    localStorage.setItem('fcm_token', token.value);
    registerTokenWithBackend(token.value, 'android');
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[PushNotifications] Error on registration: ', JSON.stringify(error));
  });

  // Listen for notifications received in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[PushNotifications] Foreground push received: ', notification);
    // Real-time socket will usually handle foreground UI updates, so we don't strictly need to do much here
  });

  // Action performed when user taps on notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('[PushNotifications] Push action performed: ', notification);
    const data = notification.notification.data;
    if (data && data.link) {
      window.location.href = data.link;
    }
  });
};

/**
 * Setup Push Notifications for Web
 */
export const setupWebPushNotifications = async () => {
  if (Capacitor.isNativePlatform()) return; // Use native setup instead
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return;
  
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    
    // If no config provided, abort web push setup safely
    if (!firebaseConfig.apiKey) {
      return;
    }

    // Only proceed if already granted or explicitly permitted to avoid blocking FCP/LCP
    if (Notification.permission !== 'granted') {
      return;
    }

    // Dynamic import to keep bundle small
    const { getMessaging, getToken, onMessage } = await import("firebase/messaging");
    const { initializeApp } = await import("firebase/app");

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const swUrl = `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&projectId=${firebaseConfig.projectId}&messagingSenderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}`;
    await navigator.serviceWorker.register(swUrl);
    const registration = await navigator.serviceWorker.ready;
    
    const currentToken = await getToken(messaging, { 
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    
    if (currentToken) {
      console.log('[PushNotifications] Web token received: ', currentToken);
      localStorage.setItem('fcm_token_web', currentToken);
      registerTokenWithBackend(currentToken, 'web');
    }

    onMessage(messaging, (payload) => {
      console.log('[PushNotifications] Foreground web message received: ', payload);
    });
  } catch (error) {
    // Gracefully ignore subscription errors so it never blocks page lifecycle or audits
    console.warn("[PushNotifications] Web setup non-blocking warning:", error?.message || error);
  }
};

/**
 * Universal init function
 */
export const initPushNotifications = async () => {
  if (Capacitor.isNativePlatform()) {
    await setupNativePushNotifications();
  } else {
    // Automatically setup web push so the browser will prompt for permission
    await setupWebPushNotifications();
  }
};
