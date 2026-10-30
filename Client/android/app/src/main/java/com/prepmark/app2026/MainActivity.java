package com.prepmark.app2026;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {

    public static JSObject pendingCallPayload = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingReminderPlugin.class);
        super.onCreate(savedInstanceState);

        // Turn screen on and show over lock screen for incoming calls
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        handleCallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleCallIntent(intent);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;

        String scheduleId = intent.getStringExtra("scheduleId");
        String action = intent.getStringExtra("action");
        String type = intent.getStringExtra("type");

        if (scheduleId != null && !scheduleId.isEmpty()) {
            JSObject payload = new JSObject();
            payload.put("scheduleId", scheduleId);
            payload.put("callerName", intent.getStringExtra("callerName"));
            payload.put("taskTitle", intent.getStringExtra("taskTitle"));
            payload.put("reminderAudioText", intent.getStringExtra("reminderAudioText"));
            payload.put("action", action != null ? action : "incoming_call");
            payload.put("type", type != null ? type : "INCOMING_CALL");
            payload.put("dispatchId", "native-" + scheduleId);

            pendingCallPayload = payload;

            // Dismiss the tray notification since the full UI is opening
            IncomingCallNotificationHelper.dismissCallNotification(this);
        }
    }
}
