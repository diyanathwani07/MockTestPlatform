package com.prepmark.app2026;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IncomingReminder")
public class IncomingReminderPlugin extends Plugin {

    private static final String CHANNEL_ID = "incoming_reminders_channel";
    private static final String CHANNEL_NAME = "Incoming Study Reminders";
    private static final int NOTIFICATION_ID = 202601;

    private static IncomingReminderPlugin activeInstance = null;
    private Ringtone currentRingtone = null;
    private Vibrator vibrator = null;

    @Override
    public void load() {
        super.load();
        activeInstance = this;
    }

    public static void stopAudioAndVibrationStatic(Context context) {
        if (activeInstance != null) {
            activeInstance.stopCurrentAudioAndVibration();
        }
    }

    @PluginMethod
    public void getPendingCall(PluginCall call) {
        JSObject ret = new JSObject();
        if (MainActivity.pendingCallPayload != null) {
            ret.put("hasPending", true);
            ret.put("call", MainActivity.pendingCallPayload);
            // Clear once retrieved to avoid repeat triggering
            MainActivity.pendingCallPayload = null;
        } else {
            ret.put("hasPending", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void playRingtone(PluginCall call) {
        try {
            stopCurrentAudioAndVibration();

            Context context = getContext();
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            currentRingtone = RingtoneManager.getRingtone(context, ringtoneUri);
            if (currentRingtone != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                    currentRingtone.setAudioAttributes(attributes);
                }
                currentRingtone.play();
            }

            long[] pattern = { 0, 600, 400, 600, 400, 600, 400 };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    vibrator = vm.getDefaultVibrator();
                }
            } else {
                vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }

            JSObject ret = new JSObject();
            ret.put("playing", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to play ringtone: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopRingtone(PluginCall call) {
        try {
            stopCurrentAudioAndVibration();
            IncomingCallNotificationHelper.dismissCallNotification(getContext());
            JSObject ret = new JSObject();
            ret.put("stopped", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop ringtone: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void showIncomingNotification(PluginCall call) {
        try {
            Context context = getContext();
            String taskTitle = call.getString("taskTitle", "Study Reminder");
            String callerName = call.getString("callerName", "PrepMark AI");
            String scheduleId = call.getString("scheduleId", "");

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) {
                call.reject("NotificationManager unavailable");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("High priority incoming call reminders for scheduled study tasks");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{ 0, 500, 250, 500 });
                nm.createNotificationChannel(channel);
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra("scheduleId", scheduleId);
            openIntent.putExtra("action", "open_reminder");

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingOpen = PendingIntent.getActivity(context, 0, openIntent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(callerName)
                .setContentText(taskTitle)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setAutoCancel(true)
                .setContentIntent(pendingOpen)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            nm.notify(NOTIFICATION_ID, builder.build());

            JSObject ret = new JSObject();
            ret.put("posted", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to show notification: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void dismissNotification(PluginCall call) {
        try {
            stopCurrentAudioAndVibration();
            Context context = getContext();
            IncomingCallNotificationHelper.dismissCallNotification(context);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
            JSObject ret = new JSObject();
            ret.put("dismissed", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to dismiss notification: " + e.getMessage(), e);
        }
    }

    public synchronized void stopCurrentAudioAndVibration() {
        if (currentRingtone != null) {
            try {
                if (currentRingtone.isPlaying()) {
                    currentRingtone.stop();
                }
            } catch (Exception ignored) {}
            currentRingtone = null;
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {}
            vibrator = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopCurrentAudioAndVibration();
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.handleOnDestroy();
    }
}
