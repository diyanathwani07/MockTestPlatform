# FIREBASE NOTIFICATION SYSTEM VERIFICATION AUDIT

## 1. Firebase Admin
**Status:** PASS
- `firebase-admin` (^14.5.0) is installed.
- The service account file is securely placed at `Server/config/firebase-admin-key.json`.
- `.gitignore` explicitly ignores `firebase-admin-key.json`.
- `Server/config/firebaseAdmin.js` initializes the SDK only once via standard CommonJS syntax and gracefully catches errors.

## 2. NotificationDevice Model
**Status:** PASS
- Model exists with `userId` (ObjectId, ref: 'User'), `token` (String, unique), `platform` (enum: ['web', 'android', 'ios']), and `lastActive` timestamp.
- Supports multiple devices per user safely (upserts using the unique FCM token as the filter).

## 3. Device Registration API
**Status:** PASS
- `POST /api/devices/register` and `DELETE /api/devices/unregister` exist.
- Auth middleware (`protect`) is correctly applied.
- The token is securely tied to `req.user._id`, preventing users from registering tokens for other accounts.
- Upsert logic prevents redundant duplicate entries for the same token.

## 4. notificationService.js Architecture
**Status:** PASS
- MongoDB notification creation remains intact.
- Socket.IO `emitToUser` events remain perfectly intact.
- Preferences are verified gracefully: `user.notificationPreferences?.push !== false` defaults to `true` for older users who haven't set preferences yet.
- Multicast targeting only retrieves tokens linked to the requested user IDs.
- Delivery errors are handled correctly (`messaging/invalid-registration-token` triggers deletion).
- Isolated `try/catch` block for Firebase prevents Firebase timeouts from aborting the MongoDB creation or the Socket.IO emit.

## 5. User notificationPreferences
**Status:** PASS
- Structure added: `notificationPreferences: { push: { type: Boolean, default: true }, email: { type: Boolean, default: true } }`.
- Valid mongoose syntax safely extends existing collections.

## 6. MobileProfileFlow.jsx (Settings UI)
**Status:** WARNING
- **Working:** Fetches preferences correctly on mount via Context/API. Sends correct `PUT /api/auth/profile` updates to the backend. Automatically invokes web push registration when toggled to true.
- **Problem:** "Optimistic Updates". The UI toggles state *before* the API call completes. If the API fails (e.g., network error), the UI remains visually toggled but the backend hasn't updated.
- *Recommendation:* Implement a `.catch()` block that reverts the local state toggle if the API request fails, or show an error toast.

## 7. Android / Capacitor Push Notifications
**Status:** PASS
- `@capacitor/push-notifications` is correctly installed.
- `google-services.json` securely placed at `Client/android/app/google-services.json`.
- Android 13+ `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` added to `AndroidManifest.xml`.
- `build.gradle` contains the Google Services plugin application.
- Permissions requested via Capacitor SDK, tokens fetched properly and submitted to `/api/devices/register`.

## 8. Web Push SDK
**Status:** PASS
- `firebase-messaging-sw.js` created and configured to intercept background payloads safely.
- Optional loading logic applied; web SDK won't crash the application if environment variables are missing. 
- Prompt requests happen asynchronously only when triggered via UI.

## 9. Environment Variables
**Status:** PASS
- Required frontend variables:
  - `VITE_FIREBASE_API_KEY` (Web API Key)
  - `VITE_FIREBASE_PROJECT_ID` (Project ID)
  - `VITE_FIREBASE_MESSAGING_SENDER_ID` (Sender ID)
  - `VITE_FIREBASE_APP_ID` (Web App ID)
  - `VITE_FIREBASE_VAPID_KEY` (Cloud Messaging Web Push Key)
- No private key variables leaked to the Vite environment. The backend key securely resides strictly in the `Server/config` folder.

## 10. Device Unregistration / Logout Safety
**Status:** ERROR
- **File:** `Client/src/context/AuthContext.jsx` (and potentially `Client/src/utils/pushNotifications.js`)
- **Problem:** The `logout` function simply clears `localStorage` and local React state. It does *not* fire a `DELETE /api/devices/unregister` request to the backend. If User A logs out and User B logs in on the same phone, User A's FCM token remains tied to User A in the backend, meaning User B's device will continue receiving push alerts meant for User A.
- **Recommended Fix:** 
  1. Add an `unregisterDeviceToken(localStorage.getItem('fcm_token'))` call to the `logout` function before `localStorage.clear()` is called.
