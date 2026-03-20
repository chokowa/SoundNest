package com.chokowa.soundnest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.util.concurrent.atomic.AtomicBoolean;

public class AudioForegroundService extends Service {
    public static final String ACTION_START = "com.chokowa.soundnest.action.START_AUDIO_FOREGROUND";
    public static final String ACTION_STOP = "com.chokowa.soundnest.action.STOP_AUDIO_FOREGROUND";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";

    private static final String CHANNEL_ID = "soundnest_playback";
    private static final int NOTIFICATION_ID = 1101;
    private static final AtomicBoolean RUNNING = new AtomicBoolean(false);

    private PowerManager.WakeLock wakeLock;

    public static boolean isRunning() {
        return RUNNING.get();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        final String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            stopForegroundAndSelf();
            return START_NOT_STICKY;
        }

        startForegroundWithWakeLock(intent);
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        RUNNING.set(false);
        super.onDestroy();
    }

    private void startForegroundWithWakeLock(Intent intent) {
        createNotificationChannel();

        final String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        final String text = intent != null ? intent.getStringExtra(EXTRA_TEXT) : null;
        final Notification notification = buildNotification(
            title != null ? title : "SoundNest",
            text != null ? text : "Audio playback in progress"
        );

        acquireWakeLock();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        RUNNING.set(true);
    }

    private Notification buildNotification(String title, String text) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "SoundNest Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps SoundNest playback active in background");
        manager.createNotificationChannel(channel);
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            return;
        }

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager == null) {
            return;
        }

        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, getPackageName() + ":audio_foreground");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }

    private void stopForegroundAndSelf() {
        releaseWakeLock();
        RUNNING.set(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }
}
