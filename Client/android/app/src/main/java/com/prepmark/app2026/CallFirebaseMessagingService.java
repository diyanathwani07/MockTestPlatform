package com.prepmark.app2026;

import androidx.annotation.NonNull;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class CallFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (data != null && "INCOMING_CALL".equals(data.get("type"))) {
            // High-priority call signal: wake screen and ring full-screen notification
            IncomingCallNotificationHelper.showIncomingCallNotification(getApplicationContext(), data);

            // Also forward to Capacitor PushNotificationsPlugin so active app sessions handle it via JS listeners
            try {
                PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
            } catch (Exception ignored) {}
        } else {
            // General push notification (exam updates, system alerts)
            try {
                PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        try {
            PushNotificationsPlugin.onNewToken(token);
        } catch (Exception ignored) {}
    }
}

