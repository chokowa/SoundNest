/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useContext,
    useReducer,
    useRef,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import type {
    AudioEngineState,
    AudioEngineAction,
    NoiseBlend,
    EQSettings,
    HarmonicExciterSettings,
    FadeSettings,
    MasterSettings,
    SoundscapeLayer,
    CustomFileEntry,
    Preset,
    ToneId,
} from '../types/audio';
import { TONE_SETTINGS } from './tones';
import { FilterChain } from './FilterChain';
import { HarmonicExciter } from './HarmonicExciter';
import { MasterBus } from './MasterBus';
import { FadeController } from './FadeController';
import { BUILT_IN_PRESETS, DEFAULT_PRESET_ID, findPresetById, loadCustomPresets, saveCustomPresets } from './presets';
import { addLog } from './AudioLogger';
import { useState } from 'react';
import { customFilesDb } from './customFilesDb';

// ===== localStorage キー =====
const STORAGE_KEY = 'soundnest-state';

// ===== 初期状態 =====
const defaultPreset = findPresetById(DEFAULT_PRESET_ID)!;

const initialState: AudioEngineState = {
    isPlaying: false,
    blend: { ...defaultPreset.blend, white: defaultPreset.blend.white ?? 0, sub: defaultPreset.blend.sub ?? 0 },
    eq: { ...defaultPreset.eq },
    harmonicExciter: { ...defaultPreset.harmonicExciter },
    fade: { enabled: true, duration: 5 },
    master: { volume: 0.5 },
    activePresetId: DEFAULT_PRESET_ID,
    activeToneId: defaultPreset.toneId ?? null,
    soundscapeLayers: [],
    customFiles: [],
};

// ===== Reducer =====
function audioReducer(state: AudioEngineState, action: AudioEngineAction): AudioEngineState {
    switch (action.type) {
        case 'SET_PLAYING':
            return { ...state, isPlaying: action.payload };
        case 'SET_BLEND':
            return { ...state, blend: { ...state.blend, ...action.payload }, activePresetId: null };
        case 'SET_EQ':
            return { ...state, eq: { ...state.eq, ...action.payload }, activePresetId: null, activeToneId: null };
        case 'SET_HARMONIC_EXCITER':
            return {
                ...state,
                harmonicExciter: { ...state.harmonicExciter, ...action.payload },
                activePresetId: null,
                activeToneId: null,
            };
        case 'SET_TONE': {
            const tone = TONE_SETTINGS[action.payload];
            return {
                ...state,
                eq: { ...tone.eq },
                harmonicExciter: { ...tone.harmonicExciter },
                activeToneId: action.payload,
                activePresetId: null,
            };
        }
        case 'SET_FADE':
            return { ...state, fade: { ...state.fade, ...action.payload } };
        case 'SET_MASTER':
            return { ...state, master: { ...state.master, ...action.payload }, activePresetId: null };
        case 'APPLY_PRESET': {
            return {
                ...state,
                blend: { ...action.payload.blend },
                eq: { ...action.payload.eq },
                harmonicExciter: { ...action.payload.harmonicExciter },
                activePresetId: action.payload.id,
                activeToneId: action.payload.toneId ?? null,
                // 環境音が保存されている場合はそれを適用、なければ空（すべて停止）にする
                soundscapeLayers: action.payload.soundscapeLayers ?? [],
            };
        }
        case 'ADD_SOUNDSCAPE_LAYER':
            return {
                ...state,
                soundscapeLayers: [...state.soundscapeLayers, action.payload],
            };
        case 'REMOVE_SOUNDSCAPE_LAYER':
            return {
                ...state,
                soundscapeLayers: state.soundscapeLayers.filter(l => l.id !== action.payload),
            };
        case 'UPDATE_SOUNDSCAPE_LAYER':
            return {
                ...state,
                soundscapeLayers: state.soundscapeLayers.map(l =>
                    l.id === action.payload.id ? { ...l, ...action.payload } : l
                ),
            };
        case 'ADD_CUSTOM_FILE':
            return {
                ...state,
                customFiles: [...(state.customFiles ?? []), action.payload],
            };
        case 'LOAD_CUSTOM_FILES':
            return {
                ...state,
                customFiles: action.payload,
            };
        case 'REMOVE_CUSTOM_FILE':
            return {
                ...state,
                customFiles: (state.customFiles ?? []).filter(f => f.id !== action.payload),
            };
        case 'LOAD_STATE':
            return { ...action.payload, customFiles: action.payload.customFiles ?? [] };
        default:
            return state;
    }
}

// ===== Context 型定義 =====
interface AudioEngineContextValue {
    state: AudioEngineState;
    // 操作メソッド
    play: () => Promise<void>;
    stop: () => Promise<void>;
    setBlend: (blend: Partial<NoiseBlend>) => void;
    setEQ: (eq: Partial<EQSettings>) => void;
    setHarmonicExciter: (settings: Partial<HarmonicExciterSettings>) => void;
    setTone: (toneId: ToneId) => void;
    setFade: (fade: Partial<FadeSettings>) => void;
    setMaster: (master: Partial<MasterSettings>) => void;
    applyPreset: (preset: Preset) => void;
    addSoundscapeFromFile: (file: File) => void;
    addSoundscapeLayer: (layer: SoundscapeLayer) => void;
    removeSoundscape: (id: string) => void;
    updateSoundscape: (id: string, updates: Partial<SoundscapeLayer>) => void;
    getRMSLevel: () => number;
    presets: Preset[];
    saveCustomPreset: (preset: Preset) => void;
    deleteCustomPreset: (id: string) => void;
    addCustomFile: (entry: CustomFileEntry) => void;
    removeCustomFile: (id: string) => void;
}

const AudioEngineCtx = createContext<AudioEngineContextValue | null>(null);

// ===== Provider =====
export function AudioEngineProvider({ children }: { children: ReactNode }) {
    const [customPresets, setCustomPresets] = useState<Preset[]>(loadCustomPresets);

    // 保存された状態を復元
    const loadedState = (() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as AudioEngineState;
                // 不正な値のバリデーション・フォールバック
                if (!parsed.blend || typeof parsed.blend.brown !== 'number') {
                    throw new Error('Invalid state'); // catchに落として初期化させる
                }
                // 存在しないプリセットIDが保存されている場合はnullにフォールバック（状態は保持）
                if (parsed.activePresetId && !findPresetById(parsed.activePresetId)) {
                    parsed.activePresetId = null;
                }
                // 再生状態と一時ファイルはリセット
                return { ...parsed, isPlaying: false, soundscapeLayers: [], customFiles: [] };
            }
        } catch {
            console.warn('保存された状態が破損していたため、初期状態にリセットしました。');
        }
        return initialState;
    })();

    const [state, dispatch] = useReducer(audioReducer, loadedState);

    // Web Audio API ノード群 (ref で管理、再レンダリング不要)
    const audioCtxRef = useRef<AudioContext | null>(null);
    const workletNodesRef = useRef<Map<string, AudioWorkletNode>>(new Map());
    const filterChainRef = useRef<FilterChain | null>(null);
    const harmonicExciterRef = useRef<HarmonicExciter | null>(null);
    const masterBusRef = useRef<MasterBus | null>(null);
    const fadeControllerRef = useRef<FadeController | null>(null);
    const mixerGainRef = useRef<GainNode | null>(null);
    const soundscapeSourcesRef = useRef<Map<string, { source: MediaElementAudioSourceNode; gain: GainNode; element: HTMLAudioElement }>>(new Map());

    // === バックグラウンド再生維持用・KeepAlive用 ===
    const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
    const keepAliveNodeRef = useRef<AudioWorkletNode | null>(null);
    
    // isPlaying の最新値を Ref で保持（コールバック内のクロージャ問題を回避）
    const isPlayingRef = useRef<boolean>(false);

    // === 状態の永続化 ===
    useEffect(() => {
        // 再生状態と一時ファイル群は保存しない
        const toSave = { ...state, isPlaying: false, soundscapeLayers: [], customFiles: [] };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }, [state]);

    // === IndexedDB からカスタム音源を復元 ===
    useEffect(() => {
        let mounted = true;
        customFilesDb.loadAll().then(files => {
            if (!mounted) return;
            const entries = files.map(f => ({
                id: f.id,
                name: f.name,
                src: URL.createObjectURL(f.blob)
            }));
            if (entries.length > 0) {
                dispatch({ type: 'LOAD_CUSTOM_FILES', payload: entries });
            }
        }).catch(err => {
            console.error('カスタム音源の復元に失敗:', err);
        });
        return () => { mounted = false; };
    }, []);

    // === AudioContext の初期化 ===
    const ensureAudioContext = useCallback(async (): Promise<AudioContext> => {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
            }
            return audioCtxRef.current;
        }

        const ctx = new AudioContext();

        // === AudioContext 自動サスペンド検知・復帰 ===
        // Android/iOS のバックグラウンド移行・通知音割り込みで AudioContext が
        // 予告なく 'suspended' になることがある。onstatechange で検知して自動復帰する。
        ctx.onstatechange = () => {
            addLog('warn', `[AudioContext] state 変化: ${ctx.state}`);
            // 再生中に suspended になった場合のみ復帰を試みる
            if (ctx.state === 'suspended' && isPlayingRef.current) {
                addLog('warn', '[AudioContext] 再生中に suspended → resume() を試みます');
                ctx.resume()
                    .then(() => addLog('info', '[AudioContext] resume() 成功 → 再生継続'))
                    .catch((err) => {
                        addLog('error', `[AudioContext] resume() 失敗: ${String(err)}`);
                        console.warn('[AudioEngine] AudioContext 自動復帰に失敗しました:', err);
                    });
            }
        };

        // AudioWorklet モジュールの登録
        await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/white-noise-processor.js`);
        await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/pink-noise-processor.js`);
        await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/brown-noise-processor.js`);
        await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/sub-bass-processor.js`);
        await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/keep-alive-processor.js`);

        // ミキサーゲインノード（3つのWorkletをまとめる）
        const mixerGain = ctx.createGain();
        mixerGainRef.current = mixerGain;

        // フィルタチェーン
        const filterChain = new FilterChain(ctx);
        filterChainRef.current = filterChain;

        // ハーモニックエキサイター
        const exciter = new HarmonicExciter(ctx);
        harmonicExciterRef.current = exciter;

        // フェードコントローラ
        const fade = new FadeController(ctx);
        fadeControllerRef.current = fade;

        // マスターバス
        const master = new MasterBus(ctx);
        masterBusRef.current = master;

        // シグナルフロー接続:
        // [WorkletNodes] → mixerGain → filterChain → exciter → fade → masterBus → destination
        mixerGain.connect(filterChain.input);
        filterChain.output.connect(exciter.input);
        exciter.output.connect(fade.input);
        fade.output.connect(master.input);

        // AudioWorkletNode の作成（4チャンネル）
        const noiseTypes = ['pink', 'brown', 'white', 'sub'] as const;
        const workletNames: Record<string, string> = {
            pink: 'pink-noise-processor',
            brown: 'brown-noise-processor',
            white: 'white-noise-processor',
            sub: 'sub-bass-processor',
        };
        for (const type of noiseTypes) {
            const node = new AudioWorkletNode(ctx, workletNames[type]);
            node.connect(mixerGain);
            workletNodesRef.current.set(type, node);
        }

        // Keep-Alive ノードの作成（10秒間隔でPing送信）
        const keepAliveNode = new AudioWorkletNode(ctx, 'keep-alive-processor');
        keepAliveNode.port.postMessage({ type: 'setSampleRate', sampleRate: ctx.sampleRate });
        keepAliveNode.port.postMessage({ type: 'setInterval', interval: 10 });
        
        keepAliveNode.port.onmessage = (event) => {
            if (event.data.type === 'ping' && isPlayingRef.current) {
                // サスペンド回避のためのログ出力（メインスレッドを動かす）
                addLog('info', `[KeepAlive] Worker Ping received (Time: ${event.data.time.toFixed(1)}s)`);
            }
        };
        
        // destination にダミー接続しないと process() が駆動しない場合があるため接続
        // ※プロセッサ側で無音出力にしているため、実際の音には影響しない
        keepAliveNode.connect(ctx.destination);
        keepAliveNodeRef.current = keepAliveNode;

        audioCtxRef.current = ctx;
        return ctx;
    }, []);

    // === オーディオパラメータの同期 ===
    const syncAudioParams = useCallback((s: AudioEngineState) => {
        // ノイズブレンド（4チャンネル）
        const blendMap: Record<string, number> = {
            pink: s.blend.pink,
            brown: s.blend.brown,
            white: s.blend.white ?? 0,
            sub: s.blend.sub ?? 0,
        };
        for (const [type, gain] of Object.entries(blendMap)) {
            const node = workletNodesRef.current.get(type);
            if (node) {
                const param = node.parameters.get('gain');
                if (param) {
                    const now = audioCtxRef.current!.currentTime;
                    // クリックノイズ防止: 現在のスケジュールをキャンセルし現在位置から開始
                    param.cancelScheduledValues(now);
                    param.setValueAtTime(param.value, now);
                    param.setTargetAtTime(gain, now, 0.05);
                }
            }
        }

        // EQ
        filterChainRef.current?.setAll(s.eq.lowShelfGain, s.eq.peakGain, s.eq.lowpassFrequency);

        // ハーモニックエキサイター
        harmonicExciterRef.current?.setEnabled(s.harmonicExciter.enabled);
        harmonicExciterRef.current?.setMix(s.harmonicExciter.mix);

        // フェード
        fadeControllerRef.current?.setDuration(s.fade.duration);

        // マスター
        masterBusRef.current?.setVolume(s.master.volume);
    }, []);

    // === 状態変更時にオーディオパラメータを同期 ===
    useEffect(() => {
        // isPlayingRef を state と同期（onstatechange コールバック用）
        isPlayingRef.current = state.isPlaying;

        if (state.isPlaying && audioCtxRef.current) {
            syncAudioParams(state);
        }
    }, [state, syncAudioParams]);

    // === 再生 ===
    const play = useCallback(async () => {
        const ctx = await ensureAudioContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // バックグラウンド再生維持ハック：ユーザーアクション起因でメディア要素を再生する
        // iOS/Android 両対応: crossOrigin は data:URI に設定しない（CORSエラー回避）
        if (!backgroundAudioRef.current) {
            const audio = new Audio();
            // iOS Safari は OGG 非対応のため、WAV を優先し OGG をフォールバックとして使用する
            // canPlayType で対応フォーマットを動的に判定する
            const canPlayWav = audio.canPlayType('audio/wav') !== '';
            if (canPlayWav) {
                // 無音WAV (44バイト): iOS/Androidの両方で動作
                audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            } else {
                // フォールバック: OGG（Android Chrome 等）
                // eslint-disable-next-line max-len
                audio.src = 'data:audio/ogg;base64,T2dnUwACAAAAAAAAAADqnjMlAAAAAOyyzAEBHgF2b3JiaXMAAAAAAUAfAABAHwAAQB8AAIAJAARB//////////8JTGAVGAAAAAAQBmNvbW1lbnQAAABgeGlwaC5vcmcAAAAAAAAAAAAAAAAAAAAA';
            }
            audio.loop = true;
            audio.volume = 0.001; // 事実上の無音だが再生中とみなされる音量
            backgroundAudioRef.current = audio;
        }
        backgroundAudioRef.current.play().catch((err) => {
            addLog('warn', `[backgroundAudio] play() 失敗: ${String(err)}`);
        });

        addLog('info', `▶ 再生開始 (fade: ${state.fade.enabled ? `有効 ${state.fade.duration}s` : '無効'})`);
        syncAudioParams(state);
        isPlayingRef.current = true; // onstatechange が参照する Ref を即座に更新
        dispatch({ type: 'SET_PLAYING', payload: true });
        // フェード有効時はフェードイン、無効時は即再生
        if (state.fade.enabled) {
            await fadeControllerRef.current?.fadeIn();
        } else {
            fadeControllerRef.current?.unmute();
        }
    }, [ensureAudioContext, syncAudioParams, state]);

    // === 停止 ===
    const stop = useCallback(async () => {
        addLog('info', `⏹ 停止 (fade: ${state.fade.enabled ? `有効 ${state.fade.duration}s` : '無効'})`);
        if (fadeControllerRef.current) {
            // フェード有効時はフェードアウト、無効時は即停止
            if (state.fade.enabled) {
                await fadeControllerRef.current.fadeOut();
            } else {
                fadeControllerRef.current.mute();
            }
        }
        if (backgroundAudioRef.current) {
            backgroundAudioRef.current.pause();
        }
        isPlayingRef.current = false; // onstatechange が参照する Ref を即座に更新
        dispatch({ type: 'SET_PLAYING', payload: false });
    }, [state.fade.enabled]);

    // === 各種セッター ===
    const setBlend = useCallback((blend: Partial<NoiseBlend>) => {
        dispatch({ type: 'SET_BLEND', payload: blend });
    }, []);

    const setEQ = useCallback((eq: Partial<EQSettings>) => {
        dispatch({ type: 'SET_EQ', payload: eq });
    }, []);

    const setHarmonicExciter = useCallback((settings: Partial<HarmonicExciterSettings>) => dispatch({ type: 'SET_HARMONIC_EXCITER', payload: settings }), []);
    const setTone = useCallback((toneId: ToneId) => dispatch({ type: 'SET_TONE', payload: toneId }), []);
    const setFade = useCallback((fade: Partial<FadeSettings>) => dispatch({ type: 'SET_FADE', payload: fade }), []);

    const setMaster = useCallback((master: Partial<MasterSettings>) => {
        dispatch({ type: 'SET_MASTER', payload: master });
    }, []);

    const applyPreset = useCallback((preset: Preset) => {
        dispatch({ type: 'APPLY_PRESET', payload: preset });
    }, []);

    // === Media Session API 連携（ロック画面コントロール） ===
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        if (state.isPlaying) {
            navigator.mediaSession.playbackState = 'playing';

            // 現在のプリセット名を取得（カスタムの場合は「Your Custom Mix」）
            let title = 'Your Custom Mix';
            if (state.activePresetId) {
                const p = BUILT_IN_PRESETS.find(p => p.id === state.activePresetId);
                if (p) title = p.name;
            }

            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: 'Noisemamire',
                album: 'サウンドマスキング',
                artwork: [
                    // アプリアイコンが存在する前提（後で設定）
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
                ]
            });

            // ロック画面からの操作ハンドラ
            navigator.mediaSession.setActionHandler('play', () => play());
            navigator.mediaSession.setActionHandler('pause', () => stop());
            navigator.mediaSession.setActionHandler('stop', () => stop());
        } else {
            navigator.mediaSession.playbackState = 'paused';
            // 再生停止中はハンドラを解除しない（ロック画面から再開できるようにするため）
        }
    }, [state.isPlaying, state.activePresetId, play, stop]);

    const connectSoundscapeLayer = useCallback((layer: SoundscapeLayer) => {
        if (!audioCtxRef.current || !fadeControllerRef.current) return;
        const ctx = audioCtxRef.current;

        // 音源長に応じた動的なクロスフェード時間(秒)を計算する関数
        // 最長2.0秒、または音源全体の長さの10%の短い方を採用
        const calcCrossfadeDuration = (duration: number) => {
            if (!duration || !Number.isFinite(duration)) return 1.0;
            return Math.min(2.0, duration * 0.1);
        };

        // 音量コントロール用ゲイン
        const masterGain = ctx.createGain();
        masterGain.gain.value = layer.volume;
        masterGain.connect(fadeControllerRef.current.input);

        // 2つのAudio要素と関連ノードを保持する
        // _onTimeUpdate / _onEnded はリスナーの参照を保持し、後で解除するために使う
        const createPlayer = (): {
            audio: HTMLAudioElement;
            source: MediaElementAudioSourceNode;
            fadeGain: GainNode;
            _onTimeUpdate: ((e: Event) => void) | null;
            _onEnded: ((e: Event) => void) | null;
        } => {
            const audio = new Audio(layer.src);
            // カスタム音源 (blob:) の場合は CORS エラーを避けるため crossOrigin を設定しない
            if (!layer.src.startsWith('blob:')) {
                audio.crossOrigin = 'anonymous';
            }
            // ループは手動で制御するため false にする
            audio.loop = false;

            const source = ctx.createMediaElementSource(audio);
            const fadeGain = ctx.createGain();
            fadeGain.gain.value = 0; // 初期状態は無音（フェードイン用）
            source.connect(fadeGain);
            fadeGain.connect(masterGain);

            return { audio, source, fadeGain, _onTimeUpdate: null, _onEnded: null };
        };

        const playerA = createPlayer();
        const playerB = createPlayer();

        let activePlayer = playerA;
        let inactivePlayer = playerB;
        let isStopped = false;

        /**
         * クロスフェード切り替えを実行する関数。
         * timeupdate と ended の両方から呼び出される可能性があるため、
         * hasTriggered フラグで二重起動を防止する。
         */
        const triggerCrossfade = (currentActive: typeof playerA, currentInactive: typeof playerA, hasTriggered: { value: boolean }, trigger: 'timeupdate' | 'ended') => {
            if (isStopped || hasTriggered.value) return;
            hasTriggered.value = true;

            if (trigger === 'ended') {
                // ended フォールバック発動は timeupdate が届かなかった証拠—バックグラウンド制限の影響の可能性が高い
                addLog('warn', `[SC: ${layer.name}] ⚠ ended フォールバック発動 (クロスフェード開始点で timeupdate 不到達の履歴あり)`);
            } else {
                addLog('info', `[SC: ${layer.name}] クロスフェード開始 (timeupdate)`);
            }

            // イベントリスナーを全て解除（チークリーンアップ）
            currentActive.audio.removeEventListener('timeupdate', currentActive._onTimeUpdate!);
            currentActive.audio.removeEventListener('ended', currentActive._onEnded!);

            // 次のプレイヤーの準備と再生
            currentInactive.audio.currentTime = 0;
            currentInactive.audio.play().catch(console.error);

            // クロスフェード時間の算出
            const duration = currentActive.audio.duration;
            const crossfadeDuration = calcCrossfadeDuration(duration);

            // 等電力 (Equal-Power) カーブの生成
            // 直線的な音量変化ではなくサイン・コサイン波を用いることで、交差時の音量減衰を防ぐ
            const steps = 32;
            const fadeInCurve = new Float32Array(steps);
            const fadeOutCurve = new Float32Array(steps);
            for (let i = 0; i < steps; i++) {
                const t = i / (steps - 1); // 0.0 ~ 1.0
                fadeInCurve[i] = Math.sin(t * (Math.PI / 2));
                fadeOutCurve[i] = Math.cos(t * (Math.PI / 2));
            }

            // クロスフェードのスケジュール
            const now = ctx.currentTime;
            
            // 新しい音源をフェードイン
            currentInactive.fadeGain.gain.cancelScheduledValues(now);
            currentInactive.fadeGain.gain.setValueCurveAtTime(fadeInCurve, now, crossfadeDuration);

            // 古い音源をフェードアウト
            currentActive.fadeGain.gain.cancelScheduledValues(now);
            currentActive.fadeGain.gain.setValueCurveAtTime(fadeOutCurve, now, crossfadeDuration);

            // 役割交代
            activePlayer = currentInactive;
            inactivePlayer = currentActive;

            // 新しいアクティブプレイヤーのメタデータがロードされたら次のスケジューリングを開始
            if (activePlayer.audio.readyState >= 1) {
                // 既にメタデータあり
                attachListeners(activePlayer, inactivePlayer);
            } else {
                activePlayer.audio.addEventListener('loadedmetadata', () => {
                    attachListeners(activePlayer, inactivePlayer);
                }, { once: true });
            }
        };

        /**
         * アクティブプレイヤーに timeupdate + ended の両方のリスナーを登録する。
         * - timeupdate: 展開中に残り時間がクロスフェード開始点以下になったら起動
         * - ended: バックグラウンドで timeupdate が止まった場合のボールト（安全答）
         */
        const attachListeners = (ap: typeof playerA, ip: typeof playerA) => {
            if (isStopped) return;
            const hasTriggered = { value: false };

            const onTimeUpdate = () => {
                if (isStopped || hasTriggered.value) return;
                const duration = ap.audio.duration;
                if (
                    duration &&
                    (duration - ap.audio.currentTime) <= calcCrossfadeDuration(duration)
                ) {
                    triggerCrossfade(ap, ip, hasTriggered, 'timeupdate');
                }
            };

            // ended イベント: timeupdate が発火されずに音源が終わった場合のフォールバック
            const onEnded = () => {
                triggerCrossfade(ap, ip, hasTriggered, 'ended');
            };

            // リスナーをインスタンスに保存（後で解除するため）
            ap._onTimeUpdate = onTimeUpdate;
            ap._onEnded = onEnded;

            ap.audio.addEventListener('timeupdate', onTimeUpdate);
            ap.audio.addEventListener('ended', onEnded);
        };

        // 初期再生の開始
        activePlayer.fadeGain.gain.value = 1; // 最初はフェードイン完了状態から始める
        activePlayer.audio.play().catch(console.error);

        // メタデータ（Audioオブジェクトのduration等）がロードされたらスケジューリング開始
        activePlayer.audio.addEventListener('loadedmetadata', () => {
            attachListeners(activePlayer, inactivePlayer);
        }, { once: true });

        // 停止などのクリーンアップ用に複数要素をまとめたカスタムオブジェクトを保持
        soundscapeSourcesRef.current.set(layer.id, {
            source: playerA.source, // 型互换性のためどれか一つを渡す（実際は使われないことが多い）
            gain: masterGain,
            // Audio要素の制御用オブジェクトを拡張して持たせる(stopなどのカスタムメソッド)
            element: {
                pause: () => {
                    isStopped = true;
                    // 登録済リスナーを解除
                    playerA.audio.removeEventListener('timeupdate', playerA._onTimeUpdate!);
                    playerA.audio.removeEventListener('ended', playerA._onEnded!);
                    playerB.audio.removeEventListener('timeupdate', playerB._onTimeUpdate!);
                    playerB.audio.removeEventListener('ended', playerB._onEnded!);
                    playerA.audio.pause();
                    playerB.audio.pause();
                },
                play: () => {
                    if (isStopped) {
                        isStopped = false;
                        activePlayer.audio.play().catch(console.error);
                        // 再開時は loadedmetadata 済のはずなので即座にリスナーを登録
                        attachListeners(activePlayer, inactivePlayer);
                    }
                },
                get src() { return layer.src; } // 型合わせ
            } as unknown as HTMLAudioElement
        });
    }, []);

    // === サウンドスケープ: ローカルファイル読み込み ===
    const addSoundscapeFromFile = useCallback((file: File) => {
        const id = `soundscape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const objectUrl = URL.createObjectURL(file);
        const layer: SoundscapeLayer = {
            id,
            name: file.name.replace(/\.[^.]+$/, ''), // 拡張子を除去
            src: objectUrl,
            volume: 0.3,
            loop: true,
        };
        dispatch({ type: 'ADD_SOUNDSCAPE_LAYER', payload: layer });

        // 再生中の場合、即座にオーディオグラフに接続
        if (audioCtxRef.current && state.isPlaying) {
            connectSoundscapeLayer(layer);
        }
    }, [state.isPlaying, connectSoundscapeLayer]);

    // === サウンドスケープ: 指定IDでレイヤーを直接追加 ===
    const addSoundscapeLayer = useCallback((layer: SoundscapeLayer) => {
        dispatch({ type: 'ADD_SOUNDSCAPE_LAYER', payload: layer });
        // 再生中の場合、即座にオーディオグラフに接続
        if (audioCtxRef.current && state.isPlaying) {
            connectSoundscapeLayer(layer);
        }
    }, [state.isPlaying, connectSoundscapeLayer]);

    // 再生状態変更時、サウンドスケープの再生/停止を連動
    useEffect(() => {
        if (state.isPlaying) {
            // 1. 削除されたレイヤーを停止・クリーンアップ
            const stateLayerIds = new Set(state.soundscapeLayers.map(l => l.id));
            for (const [id, entry] of soundscapeSourcesRef.current.entries()) {
                if (!stateLayerIds.has(id)) {
                    entry.element.pause();
                    entry.source.disconnect();
                    entry.gain.disconnect();
                    URL.revokeObjectURL(entry.element.src);
                    soundscapeSourcesRef.current.delete(id);
                }
            }

            // 2. 新しいレイヤーを接続、既存の音量を更新
            for (const layer of state.soundscapeLayers) {
                if (!soundscapeSourcesRef.current.has(layer.id)) {
                    connectSoundscapeLayer(layer);
                } else {
                    // 音量のみ更新（connectSoundscapeLayer 内の masterGain に対する操作）
                    const entry = soundscapeSourcesRef.current.get(layer.id);
                    if (entry && audioCtxRef.current) {
                        entry.gain.gain.setTargetAtTime(layer.volume, audioCtxRef.current.currentTime, 0.05);
                    }
                }
            }
        } else {
            for (const [, { element }] of soundscapeSourcesRef.current) {
                element.pause();
            }
        }
    }, [state.isPlaying, state.soundscapeLayers, connectSoundscapeLayer]);

    const removeSoundscape = useCallback((id: string) => {
        const entry = soundscapeSourcesRef.current.get(id);
        if (entry) {
            entry.element.pause();
            entry.source.disconnect();
            entry.gain.disconnect();
            URL.revokeObjectURL(entry.element.src);
            soundscapeSourcesRef.current.delete(id);
        }
        dispatch({ type: 'REMOVE_SOUNDSCAPE_LAYER', payload: id });
    }, []);

    const updateSoundscape = useCallback((id: string, updates: Partial<SoundscapeLayer>) => {
        dispatch({ type: 'UPDATE_SOUNDSCAPE_LAYER', payload: { id, ...updates } });
        // 音量変更の即時反映
        if (updates.volume !== undefined) {
            const entry = soundscapeSourcesRef.current.get(id);
            if (entry && audioCtxRef.current) {
                entry.gain.gain.setTargetAtTime(updates.volume, audioCtxRef.current.currentTime, 0.05);
            }
        }
    }, []);

    const getRMSLevel = useCallback((): number => {
        return masterBusRef.current?.getRMSLevel() ?? 0;
    }, []);

    const saveCustomPreset = useCallback((preset: Preset) => {
        setCustomPresets(prev => {
            const next = [...prev, preset];
            saveCustomPresets(next);
            return next;
        });
    }, []);

    const deleteCustomPreset = useCallback((id: string) => {
        setCustomPresets(prev => {
            const next = prev.filter(p => p.id !== id);
            saveCustomPresets(next);
            return next;
        });
        // 削除したプリセットが現在アクティブだった場合は activePresetId を null にする
        if (state.activePresetId === id) {
            dispatch({ type: 'LOAD_STATE', payload: { ...state, activePresetId: null } });
        }
    }, [state]);

    const value: AudioEngineContextValue = {
        state,
        play,
        stop,
        setBlend,
        setEQ,
        setHarmonicExciter,
        setTone,
        setFade,
        setMaster,
        applyPreset,
        addSoundscapeFromFile,
        addSoundscapeLayer,
        removeSoundscape,
        updateSoundscape,
        getRMSLevel,
        presets: [...BUILT_IN_PRESETS, ...customPresets],
        saveCustomPreset,
        deleteCustomPreset,
        addCustomFile: useCallback((entry: CustomFileEntry) => {
            dispatch({ type: 'ADD_CUSTOM_FILE', payload: entry });
        }, []),
        removeCustomFile: useCallback((id: string) => {
            customFilesDb.delete(id).catch(err => console.error('DBからの削除失敗:', err));
            dispatch({ type: 'REMOVE_CUSTOM_FILE', payload: id });
        }, []),
    };

    return (
        <AudioEngineCtx.Provider value={value}>
            {children}
        </AudioEngineCtx.Provider>
    );
}

// ===== フック =====
export function useAudioEngine(): AudioEngineContextValue {
    const ctx = useContext(AudioEngineCtx);
    if (!ctx) {
        throw new Error('useAudioEngine は AudioEngineProvider 内で使用してください');
    }
    return ctx;
}
