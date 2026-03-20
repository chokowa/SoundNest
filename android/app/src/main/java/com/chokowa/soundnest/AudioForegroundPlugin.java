package com.chokowa.soundnest;

import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioForeground")
public class AudioForegroundPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title", "SoundNest");
        String text = call.getString("text", "Audio playback in progress");

        try {
            Context context = getContext();
            Intent intent = new Intent(context, AudioForegroundService.class);
            intent.setAction(AudioForegroundService.ACTION_START);
            intent.putExtra(AudioForegroundService.EXTRA_TITLE, title);
            intent.putExtra(AudioForegroundService.EXTRA_TEXT, text);

            ContextCompat.startForegroundService(context, intent);

            JSObject result = new JSObject();
            result.put("running", true);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("Failed to start foreground service: " + ex.getMessage(), ex);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Context context = getContext();
            context.stopService(new Intent(context, AudioForegroundService.class));

            JSObject result = new JSObject();
            result.put("running", false);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("Failed to stop foreground service: " + ex.getMessage(), ex);
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("running", AudioForegroundService.isRunning());
        call.resolve(result);
    }
}
