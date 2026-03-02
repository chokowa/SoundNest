import type { Preset } from '../types/audio';

/**
 * 組み込みプリセット定義
 * 各プリセットは具体的な利用シーンに合わせて最適化されたパラメータセットを持つ。
 */
export const BUILT_IN_PRESETS: Preset[] = [
    {
        id: 'footstep-strong',
        name: '足音対策（強）',
        description: '上階からの足音・重量床衝撃音を最大限マスキング。ブラウンノイズ主体で低域を強力にブースト。',
        blend: { brown: 0.55, pink: 0.15, white: 0, sub: 0.30 },
        eq: { lowShelfGain: 10, peakGain: 8, lowpassFrequency: 400 },
        harmonicExciter: { enabled: true, mix: 0.4 },
        toneId: 'deep',
        builtIn: true,
    },
    {
        id: 'footstep-mild',
        name: '足音対策（マイルド）',
        description: '足音をカバーしつつ耳に優しい設定。長時間の使用に適している。',
        blend: { brown: 0.50, pink: 0.30, white: 0, sub: 0.20 },
        eq: { lowShelfGain: 6, peakGain: 4, lowpassFrequency: 600 },
        harmonicExciter: { enabled: true, mix: 0.25 },
        toneId: 'deep',
        builtIn: true,
    },
    {
        id: 'conversation-mask',
        name: '会話マスキング',
        description: '隣室の会話や生活音をカバー。ピンクノイズ主体で中音域を強化。',
        blend: { brown: 0.20, pink: 0.60, white: 0.20, sub: 0 },
        eq: { lowShelfGain: 2, peakGain: 0, lowpassFrequency: 1200 },
        harmonicExciter: { enabled: false, mix: 0.0 },
        toneId: 'clear',
        builtIn: true,
    },
    {
        id: 'relax-sleep',
        name: 'リラックス・就寝',
        description: '穏やかなブラウンノイズで睡眠環境を整える。低音量で長時間再生向け。',
        blend: { brown: 0.70, pink: 0.20, white: 0, sub: 0.10 },
        eq: { lowShelfGain: 4, peakGain: 2, lowpassFrequency: 500 },
        harmonicExciter: { enabled: false, mix: 0.0 },
        toneId: 'muffled',
        builtIn: true,
    },
    {
        id: 'focus-work',
        name: '集中・作業用',
        description: 'フラットなピンクノイズで環境音をニュートラルにマスキング。',
        blend: { brown: 0.20, pink: 0.50, white: 0.30, sub: 0 },
        eq: { lowShelfGain: 0, peakGain: 0, lowpassFrequency: 2000 },
        harmonicExciter: { enabled: false, mix: 0.0 },
        toneId: 'natural',
        builtIn: true,
    },
];

/** デフォルトプリセットIDを取得 */
export const DEFAULT_PRESET_ID = 'footstep-strong';

const CUSTOM_PRESETS_KEY = 'noisemamire-custom-presets';

export function loadCustomPresets(): Preset[] {
    try {
        const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function saveCustomPresets(presets: Preset[]): void {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}

/** IDからプリセットを組み込み・カスタム両方から検索 */
export function findPresetById(id: string): Preset | undefined {
    // 組み込みから探す
    const builtIn = BUILT_IN_PRESETS.find(p => p.id === id);
    if (builtIn) return builtIn;

    // カスタムから探す
    const custom = loadCustomPresets().find(p => p.id === id);
    return custom;
}
