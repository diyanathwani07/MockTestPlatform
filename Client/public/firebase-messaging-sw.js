importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// We need some minimal config here for the worker, but typically it doesn't need the full secret keys.
// Usually, it's injected or we pass just the sender ID.
firebase.initializeApp({
  apiKey: "AIzaSyDex1pWfzcrXMTOzpjMOPgRtTFWXDlB-EI", // Note: The SW sometimes needs these to compile if we use the compat library
  projectId: "prepmark-notifications",
  messagingSenderId: "178312273007", // We would need the real one here
  appId: "1:178312273007:web:6fa9bd067002929d4c819a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png",
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
