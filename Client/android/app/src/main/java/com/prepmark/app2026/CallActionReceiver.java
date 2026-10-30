package com.prepmark.app2026;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class CallActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if (IncomingCallNotificationHelper.ACTION_DECLINE.equals(action)) {
            // Dismiss active call notification
            IncomingCallNotificationHelper.dismissCallNotification(context);

            // Notify plugin instance if active
            IncomingReminderPlugin.stopAudioAndVibrationStatic(context);
        }
    }
}

