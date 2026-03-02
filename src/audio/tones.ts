import type { ToneId, ToneSetting } from '../types/audio';

export const TONE_SETTINGS: Record<ToneId, ToneSetting> = {
    deep: {
        id: 'deep',
        name: 'Deep',
        eq: { lowShelfGain: 10, peakGain: 8, lowpassFrequency: 400 },
        harmonicExciter: { enabled: true, mix: 0.4 },
    },
    muffled: {
        id: 'muffled',
        name: 'Muffled',
        eq: { lowShelfGain: 4, peakGain: 2, lowpassFrequency: 500 },
        harmonicExciter: { enabled: false, mix: 0.0 },
    },
    clear: {
        id: 'clear',
        name: 'Clear',
        eq: { lowShelfGain: -4, peakGain: 0, lowpassFrequency: 1500 },
        harmonicExciter: { enabled: false, mix: 0.0 },
    },
    natural: {
        id: 'natural',
        name: 'Natural',
        eq: { lowShelfGain: 0, peakGain: 0, lowpassFrequency: 20000 },
        harmonicExciter: { enabled: false, mix: 0.0 },
    }
};

export const TONE_IDS: ToneId[] = ['deep', 'muffled', 'clear', 'natural'];
