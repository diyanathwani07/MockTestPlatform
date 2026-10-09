importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// We need some minimal config here for the worker. 
// We are passing these dynamically through URL query parameters during registration to avoid hardcoding secrets.
const urlParams = new URLSearchParams(location.search);
firebase.initializeApp({
  apiKey: urlParams.get('apiKey') || "dummy_api_key", 
  projectId: urlParams.get('projectId') || "dummy_project_id",
  messagingSenderId: urlParams.get('messagingSenderId') || "dummy_sender_id", 
  appId: urlParams.get('appId') || "dummy_app_id"
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
