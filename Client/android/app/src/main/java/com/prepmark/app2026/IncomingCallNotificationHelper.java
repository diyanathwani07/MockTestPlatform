package com.prepmark.app2026;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import java.util.Map;

public class IncomingCallNotificationHelper {

    public static final String CALL_CHANNEL_ID = "prepmark_incoming_calls_channel";
    public static final String CALL_CHANNEL_NAME = "Incoming AI Voice Calls";
    public static final String ACTION_DECLINE = "com.prepmark.app2026.ACTION_DECLINE_CALL";
    public static final int CALL_NOTIFICATION_ID = 202699;

    public static void showIncomingCallNotification(Context context, Map<String, String> data) {
        if (data == null) return;

        String scheduleId = data.get("scheduleId");
        if (scheduleId == null || scheduleId.isEmpty()) {
            scheduleId = String.valueOf(System.currentTimeMillis());
        }

        String callerName = data.get("callerName");
        if (callerName == null || callerName.isEmpty()) {
            callerName = "PrepMark AI Mentor";
        }

        String taskTitle = data.get("taskTitle");
        if (taskTitle == null || taskTitle.isEmpty()) {
            taskTitle = "Incoming AI Voice Call";
        }

        String reminderAudioText = data.get("reminderAudioText");
        if (reminderAudioText == null) reminderAudioText = "";

        // 1. Wake screen up even if phone is asleep / locked
        wakeDevice(context);

        // 2. Setup high-priority calling channel
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        Uri defaultRingtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (defaultRingtoneUri == null) {
            defaultRingtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CALL_CHANNEL_ID,
                CALL_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("High priority incoming AI voice calls that ring and wake the screen");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{ 0, 1000, 1000, 1000, 1000 });
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            channel.setSound(defaultRingtoneUri, audioAttributes);

            nm.createNotificationChannel(channel);
        }

        // 3. Full Screen & Answer Intent (Launches MainActivity)
        Intent fullScreenIntent = new Intent(context, MainActivity.class);
        fullScreenIntent.setAction(Intent.ACTION_MAIN);
        fullScreenIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        fullScreenIntent.putExtra("scheduleId", scheduleId);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("taskTitle", taskTitle);
        fullScreenIntent.putExtra("reminderAudioText", reminderAudioText);
        fullScreenIntent.putExtra("type", "INCOMING_CALL");
        fullScreenIntent.putExtra("action", "incoming_call");

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            scheduleId.hashCode(),
            fullScreenIntent,
            flags
        );

        // 4. Decline Action Intent (Triggers CallActionReceiver)
        Intent declineIntent = new Intent(context, CallActionReceiver.class);
        declineIntent.setAction(ACTION_DECLINE);
        declineIntent.putExtra("scheduleId", scheduleId);
        declineIntent.putExtra("notificationId", CALL_NOTIFICATION_ID);

        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
            context,
            scheduleId.hashCode() + 1,
            declineIntent,
            flags
        );

        // 5. Build Notification
        int smallIcon = context.getApplicationInfo().icon;
        if (smallIcon == 0) {
            smallIcon = android.R.drawable.ic_dialog_info;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CALL_CHANNEL_ID)
            .setSmallIcon(smallIcon)
            .setContentTitle(callerName)
            .setContentText(taskTitle)
            .setSubText("Incoming Call")
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(true)
            .setSound(defaultRingtoneUri)
            .setVibrate(new long[]{ 0, 1000, 1000, 1000, 1000 })
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .addAction(android.R.drawable.ic_menu_call, "Answer", fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent);

        Notification notification = builder.build();
        notification.flags |= Notification.FLAG_INSISTENT;

        nm.notify(CALL_NOTIFICATION_ID, notification);
    }

    public static void dismissCallNotification(Context context) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(CALL_NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}
    }

    private static void wakeDevice(Context context) {
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "prepmark:incoming_call_wakelock"
                );
                wakeLock.acquire(15000); // Hold wake lock for 15s to ensure display turns on
            }
        } catch (Exception e) {
            // Wake lock might fail if restricted by battery saver, ignore safely
        }
    }
}

