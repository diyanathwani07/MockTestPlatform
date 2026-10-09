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


self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Extract intended link, default to app root if none provided
  const targetPath = (event.notification.data && event.notification.data.link) ? event.notification.data.link : '/';
  
  // Validate and construct absolute URL
  let urlToOpen;
  try {
    urlToOpen = new URL(targetPath, self.location.origin).href;
  } catch (e) {
    urlToOpen = self.location.origin;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If exact URL is not open, check if any app window is open and focus/navigate it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client && 'navigate' in client && client.url.startsWith(self.location.origin)) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      // If no suitable window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
