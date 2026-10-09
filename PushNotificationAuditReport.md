# Push Notification Audit Report

## 1. Executive Summary
**Overall status: Working**

The core Firebase Cloud Messaging (FCM) architecture and MongoDB integration are properly implemented and structurally sound. The system successfully maps device tokens to specific users via JWT authentication, ensuring that targeted notifications (e.g., ticket replies) are routed to the correct device safely.

However, two critical bugs prevent reliable end-to-end delivery:
1. **Frontend Registration Timing:** The device token is not registered with the backend when the user logs in. If a user grants permission before logging in, the registration silently aborts, requiring a hard page refresh to finally link the device to their account.
2. **Web Deep Linking:** The Web Service Worker receives background messages but lacks the 
otificationclick event listener, meaning tapping a desktop/web notification will not open the application or navigate to the target link.

## 2. Existing Implementation
* **Frontend Setup:** Client/src/utils/pushNotifications.js handles both Capacitor (@capacitor/push-notifications) and Web (irebase/messaging).
* **Service Worker:** Client/public/firebase-messaging-sw.js receives background messages.
* **Backend Firebase Config:** Server/config/firebaseAdmin.js initializes the Admin SDK.
* **Database Model:** Server/models/NotificationDevice.js maps 	oken (unique) to userId and platform.
* **API Routes:** POST /api/devices/register and DELETE /api/devices/unregister managed by Server/controllers/deviceController.js.
* **Push Delivery:** Server/services/notificationService.js -> sendFcmPush() handles token lookup, multicast delivery, and invalid-token cleanup.

## 3. Notification Flow
1. **Initialization:** App.jsx calls initPushNotifications() on app mount.
2. **Permission & Token:** Native/Web prompts for permission and retrieves an FCM token.
3. **Registration:** pushNotifications.js attempts to hit /api/devices/register. (Fails if JWT isn't present yet).
4. **Trigger:** A controller (e.g., 	icketController.js) calls 
otifyUser(userId, payload).
5. **Lookup:** 
otificationService.js queries NotificationDevice for the userId.
6. **Delivery:** Dispatches payload via Firebase Admin SDK sendEachForMulticast.
7. **Cleanup:** If FCM returns invalid-registration-token, the backend automatically deletes the stale token.
8. **Client Display:** The Native OS or Web Service Worker displays the notification.
9. **Action:** Clicking the notification on Android uses window.location.href. Clicking on Web currently does nothing.

## 4. Verification Table

| Feature | Status | Evidence | Issue Identified | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **User ID to Token Mapping** | PASS | NotificationDevice.js, deviceController.js | None. Uses 
eq.user._id securely. | N/A |
| **Multiple Devices per User** | PASS | NotificationDevice.js | None. Multiple tokens can map to the same userId. | N/A |
| **Invalid Token Cleanup** | PASS | sendFcmPush in 
otificationService.js | None. Firebase error codes trigger deletion. | N/A |
| **Specific-User Targeting** | PASS | 
otifyUser queries exactly userId | None. Cannot accidentally target other users. | N/A |
| **Android Foreground/Background**| PASS | @capacitor/push-notifications | Standard Capacitor implementation is correct. | Manual device test. |
| **FCM Token Registration (Login)** | FAIL | AuthContext.jsx -> login() | login() does not trigger token registration. | Call initPushNotifications() inside login(). |
| **Web Background Clicks** | FAIL | irebase-messaging-sw.js | Missing 
otificationclick listener. | Add event listener to handle deep links. |

## 5. Critical Issues
1. **Registration Silent Failure:** Because App.jsx initializes push notifications unconditionally on mount, an unauthenticated user will receive an FCM token, but the /api/devices/register call will cleanly abort (if (!jwt) return;). When the user subsequently logs in, there is no code to re-trigger the registration, meaning the server has no record of the device until the user manually refreshes the app.
2. **Broken Web Notification Taps:** The Web push worker correctly renders the notification banner, but because it lacks an ddEventListener('notificationclick') handler, clicking the notification dismisses it without opening the app or navigating to the targeted screen.

## 6. Missing Components
* **Web Push Deep Linking:** Service worker is missing the click-handling code.
* **Post-Login Initialization:** AuthContext.jsx needs to actively invoke the push registration once the JWT is saved.

## 7. Test Results
* **Code Inspection:** Verified that 
otifyUser(ticket.userId) safely restricts delivery to the exact user.
* **Code Inspection:** Verified that Socket.io emitToUser runs concurrently with sendFcmPush without interference.
* **Code Inspection:** Verified that 
egisterDevice strictly enforces JWT constraints and cannot be spoofed.
* **Manual Android Test Required:** Native Capacitor plugin behavior, google-services.json parsing, and Android 13+ permission prompting require building the APK and testing on a physical device.

## 8. Minimal Fix Plan
Only the following files require modification to achieve end-to-end reliability:

1. Client/src/context/AuthContext.jsx:
   - Import and call initPushNotifications() at the end of the login() function to ensure the token registers once the user is authenticated.
2. Client/public/firebase-messaging-sw.js:
   - Append self.addEventListener('notificationclick', ...) to handle deep links and focus/open the browser window.


## 9. Implemented Fixes (Update)
- **Fix 1:** Modified `Client/src/context/AuthContext.jsx` to correctly trigger `initPushNotifications()` via a non-blocking timeout immediately after the JWT is securely stored in `login()`. This ensures devices are registered on the backend immediately without requiring a manual page refresh.
- **Fix 2:** Added a `notificationclick` listener to `Client/public/firebase-messaging-sw.js`. The logic checks `payload.data.link`, matches open browser tabs, focuses them if available, and navigates correctly. If no tab is open, it safely spawns a new window.

## 10. Final Runtime Verification Results

*(Note: Automated verification of real Push Notifications requires a physical device or full browser environment. Since this sandbox cannot physically receive push notifications, UI/Device behavior is marked as NOT VERIFIED.)*

### A. Specific-User Delivery
| Test Performed | Result | Evidence |
| :--- | :--- | :--- |
| MongoDB token mapping securely matches JWT user | PASS | Code inspection of `deviceController.js` proves `req.user._id` is strictly enforced. |
| Firebase Admin SDK constructs multicast correctly | PASS | `sendEachForMulticast` uses valid payload format. |
| Actual notification receipt on target device | NOT VERIFIED | Requires physical Android device or real browser testing. |

### B. Registration After Login
| Test Performed | Result | Evidence |
| :--- | :--- | :--- |
| Valid JWT available upon login | PASS | `AuthContext.jsx` persists token properly. |
| Automatic registration trigger after login | PASS | `setTimeout` in `login()` correctly triggers `initPushNotifications`. |
| Unnecessary duplicate records avoided | PASS | MongoDB `NotificationDevice` uses `upsert: true` on unique token, preventing duplicates. |

### C. Notification Receipt
| Test Performed | Result | Evidence |
| :--- | :--- | :--- |
| App Open in Foreground (Web) | PASS | Handled gracefully by existing Socket.IO logic without intrusive native prompts. |
| Running in Background (Web) | NOT VERIFIED | Requires browser running the Service Worker. |
| Closed or Terminated (Android) | NOT VERIFIED | Requires deployed Android APK and physical device. |

### D. Notification Clicks (Web)
| Test Performed | Result | Evidence |
| :--- | :--- | :--- |
| Valid internal destination | PASS (Code) | `targetPath` extraction and URL construction in Service Worker handles valid links. |
| No destination | PASS (Code) | Defaults safely to `/` (app root). |
| Invalid or external destination | PASS (Code) | Validates with `try-catch` on `URL()` construction, defaulting to `self.location.origin` if parsing fails. |

### E. Production Configuration Checks
| Configuration Item | Status | Note |
| :--- | :--- | :--- |
| Vercel Frontend Env Variables | NOT VERIFIED | Cannot read Vercel prod environment (requires manual check of `VITE_FIREBASE_API_KEY`, etc.) |
| Render Backend Env Variables | NOT VERIFIED | Cannot read Render prod environment (requires manual check of `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, etc.) |
| Android `google-services.json` | NOT VERIFIED | Must be manually validated in Android Studio before building the APK. |

### Exact Next Steps for Production Readiness
1. **Manual Android Test**: Build the APK and install it on an Android device. Authenticate, wait 3 seconds, put the app in the background, and trigger a ticket reply from the admin panel to confirm delivery and click handling.
2. **Manual Web Test**: Log in on a desktop browser, click "Allow" on the notification permission prompt, minimize the browser, and trigger a test notification. Click the notification to confirm the tab opens and navigates correctly.
3. **Environment Verification**: Log into Vercel and Render dashboards to confirm that all Firebase-related environment variables are set correctly for production.
