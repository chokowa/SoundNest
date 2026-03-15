// ===== オーディオエンジン型定義 =====

/** ノイズの種類 */
export type NoiseType = 'pink' | 'brown' | 'white' | 'sub';

/** 各ノイズチャンネルのゲイン値 (0.0 ~ 1.0) */
export interface NoiseBlend {
    pink: number;
    brown: number;
    white: number;
    sub: number;
}

/** EQ設定 */
export interface EQSettings {
    /** ローシェルフゲイン (dB) : -6 ~ +12 */
    lowShelfGain: number;
    /** ピーキングフィルタゲイン (dB): 63Hz帯 : -6 ~ +12 */
    peakGain: number;
    /** ローパスフィルタのカットオフ周波数 (Hz) : 300 ~ 2000 */
    lowpassFrequency: number;
}

/** 仮想低音（ハーモニックエキサイター）設定 */
export interface HarmonicExciterSettings {
    /** 有効/無効 */
    enabled: boolean;
    /** dry/wet バランス (0.0=dry ~ 1.0=wet) */
    mix: number;
}

/** トーン（音色）ID */
export type ToneId = 'deep' | 'muffled' | 'clear' | 'natural';

/** トーン設定（EQ + Exciterの組み合わせ） */
export interface ToneSetting {
    id: ToneId;
    name: string;
    eq: EQSettings;
    harmonicExciter: HarmonicExciterSettings;
}

/** フェード設定 */
export interface FadeSettings {
    /** フェード有効/無効 */
    enabled: boolean;
    /** フェード時間（秒）: 1 ~ 15 */
    duration: number;
}

/** マスター出力設定 */
export interface MasterSettings {
    /** マスターボリューム (0.0 ~ 1.0) */
    volume: number;
    /** 環境音（Sounds）のマスターボリューム (0.0 ~ 1.0) */
    ambientMasterVolume: number;
}

/** サウンドスケープ（自然音）レイヤー */
export interface SoundscapeLayer {
    /** レイヤーID */
    id: string;
    /** 表示名 */
    name: string;
    /** 音源ファイルパス or オブジェクトURL */
    src: string;
    /** ボリューム (0.0 ~ 1.0) */
    volume: number;
    /** ループ再生 */
    loop: boolean;
}

/** カスタム音源ファイルエントリ（リスト管理用） */
export interface CustomFileEntry {
    /** ID */
    id: string;
    /** 表示名 */
    name: string;
    /** Object URL */
    src: string;
}

/** プリセット定義 */
export interface Preset {
    /** プリセットID */
    id: string;
    /** プリセット名 */
    name: string;
    /** プリセット説明 */
    description: string;
    /** ノイズバランス設定 */
    blend: NoiseBlend;
    /** (オプショナル) 対応するTone ID。空の場合はEQ/Exciterが直接保持される */
    toneId?: ToneId;
    /** EQ設定 */
    eq: EQSettings;
    /** 仮想低音設定 */
    harmonicExciter: HarmonicExciterSettings;
    /** (オプショナル) サウンドスケープ（環境音）レイヤー */
    /** (オプショナル) サウンドスケープ（環境音）レイヤー */
    soundscapeLayers?: SoundscapeLayer[];
    /** (オプショナル) マスター設定 */
    master?: MasterSettings;
    /** 組み込みプリセットか */
    builtIn: boolean;
}

/** オーディオエンジン全体の状態 */
export interface AudioEngineState {
    /** 再生中かどうか */
    isPlaying: boolean;
    /** 現在のノイズブレンド */
    blend: NoiseBlend;
    /** EQ設定 */
    eq: EQSettings;
    /** 仮想低音設定 */
    harmonicExciter: HarmonicExciterSettings;
    /** フェード設定 */
    fade: FadeSettings;
    /** マスター設定 */
    master: MasterSettings;
    /** アクティブなプリセットID (null = カスタム) */
    activePresetId: string | null;
    /** アクティブなトーンID (null = カスタム) */
    activeToneId: ToneId | null;
    /** サウンドスケープレイヤー */
    soundscapeLayers: SoundscapeLayer[];
    /** カスタム音源ファイル一覧 */
    customFiles: CustomFileEntry[];
}

/** オーディオエンジンアクション */
export type AudioEngineAction =
    | { type: 'SET_PLAYING'; payload: boolean }
    | { type: 'SET_BLEND'; payload: Partial<NoiseBlend> }
    | { type: 'SET_EQ'; payload: Partial<EQSettings> }
    | { type: 'SET_HARMONIC_EXCITER'; payload: Partial<HarmonicExciterSettings> }
    | { type: 'SET_TONE'; payload: ToneId }
    | { type: 'SET_FADE'; payload: Partial<FadeSettings> }
    | { type: 'SET_MASTER'; payload: Partial<MasterSettings> }
    | { type: 'APPLY_PRESET'; payload: Preset }
    | { type: 'ADD_SOUNDSCAPE_LAYER'; payload: SoundscapeLayer }
    | { type: 'REMOVE_SOUNDSCAPE_LAYER'; payload: string }
    | { type: 'UPDATE_SOUNDSCAPE_LAYER'; payload: { id: string } & Partial<SoundscapeLayer> }
    | { type: 'ADD_CUSTOM_FILE'; payload: CustomFileEntry }
    | { type: 'REMOVE_CUSTOM_FILE'; payload: string }
    | { type: 'LOAD_CUSTOM_FILES'; payload: CustomFileEntry[] }
    | { type: 'LOAD_STATE'; payload: AudioEngineState }
    | { type: 'SET_AMBIENT_MASTER_VOLUME'; payload: number }
    | { type: 'CLEAR_ACTIVE_PRESET'; payload: string };
