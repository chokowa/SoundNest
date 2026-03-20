package com.chokowa.soundnest;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioForegroundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
