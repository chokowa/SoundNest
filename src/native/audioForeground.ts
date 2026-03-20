import { Capacitor, registerPlugin } from '@capacitor/core';

type AudioForegroundStatus = {
    running: boolean;
};

type AudioForegroundPlugin = {
    start(options?: { title?: string; text?: string }): Promise<AudioForegroundStatus>;
    stop(): Promise<AudioForegroundStatus>;
    status(): Promise<AudioForegroundStatus>;
};

const AudioForeground = registerPlugin<AudioForegroundPlugin>('AudioForeground');

const isNativeAndroid = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const startAudioForegroundService = async (title?: string, text?: string): Promise<void> => {
    if (!isNativeAndroid()) {
        return;
    }
    await AudioForeground.start({ title, text });
};

export const stopAudioForegroundService = async (): Promise<void> => {
    if (!isNativeAndroid()) {
        return;
    }
    await AudioForeground.stop();
};

export const getAudioForegroundStatus = async (): Promise<AudioForegroundStatus> => {
    if (!isNativeAndroid()) {
        return { running: false };
    }
    return AudioForeground.status();
};
