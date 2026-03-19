import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine } from '../../audio/AudioEngineContext';
import type { Preset } from '../../types/audio';

interface PlayerScreenProps {
    isDark: boolean;
    onToggleDark: () => void;
}

// ━━ スペクトラム・ビジュアライザー・コンポーネント ━━
function CircularSpectrum({ isPlaying, hasTimer }: { isPlaying: boolean, hasTimer: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { getFrequencyData, state: { blend } } = useAudioEngine();
    const bars = 60; // バーの数

    // ノイズバランスからブレンドカラーを計算（加算混色）
    const strokeColor = (() => {
        const brown = blend?.brown ?? 0;
        const pink  = blend?.pink ?? 0;
        const white = blend?.white ?? 0;
        const sub   = blend?.sub ?? 0;
        const total = brown + pink + white + sub;

        if (total === 0) return 'rgba(128, 128, 128, 0.3)';

        const cBrown = { r: 217, g: 119, b: 54 }; 
        const cPink  = { r: 230, g: 103, b: 134 };
        const cWhite = { r: 240, g: 245, b: 255 };
        const cSub   = { r: 74,  g: 92,  b: 158 };

        const r = Math.round((brown * cBrown.r + pink * cPink.r + white * cWhite.r + sub * cSub.r) / total);
        const g = Math.round((brown * cBrown.g + pink * cPink.g + white * cWhite.g + sub * cSub.g) / total);
        const b = Math.round((brown * cBrown.b + pink * cPink.b + white * cWhite.b + sub * cSub.b) / total);

        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    })();

    // アニメーション内で補間するための現在の半径（初期値）
    const currentRadiusRef = useRef(52);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const values = new Array(bars).fill(0);

        const render = () => {
            if (document.hidden) {
                animationId = requestAnimationFrame(render);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // 半径の滑らかな拡張/縮小アニメーション
            const targetRadius = 52;
            currentRadiusRef.current += (targetRadius - currentRadiusRef.current) * 0.15;
            const radiusX = currentRadiusRef.current;

            let freqData: Uint8Array | null = null;
            if (isPlaying) {
                freqData = getFrequencyData();
            }

            const halfBars = bars / 2; // 対称の折り返し地点（真上）

            for (let i = 0; i < bars; i++) {
                let target = 2;

                if (isPlaying && freqData && freqData.length > 0) {
                    // 左右対称（シンメトリー）のためのインデックス計算
                    // i=0(真下)を最低音、i=30(真上)を最高音とし、右半円・左半円に同じ周波数をマッピングする
                    let symmetricIndex = i;
                    if (symmetricIndex > halfBars) {
                        symmetricIndex = bars - i; // 31〜59 は逆順（折り返し）
                    }

                    // 0〜30の範囲内で高域側（全体の60%）までを配分
                    const dataIndex = Math.floor((symmetricIndex / halfBars) * (freqData.length * 0.6));
                    const dbVal = freqData[dataIndex] || 0;
                    
                    // タイマー稼働中は波形（スペクトラムのピーク）もわずかに大きくする
                    const peakScale = hasTimer ? 1.3 : 1.0;
                    target = 2 + (dbVal / 255) * 20 * peakScale;
                }

                values[i] += (target - values[i]) * 0.2;

                // 描画角度: 開始点を+90度(Math.PI/2)ずらして、一番下（6時の位置）からスタートさせる
                const angle = (i / bars) * Math.PI * 2 + Math.PI / 2;
                const x1 = centerX + Math.cos(angle) * radiusX;
                const y1 = centerY + Math.sin(angle) * radiusX;
                const x2 = centerX + Math.cos(angle) * (radiusX + values[i]);
                const y2 = centerY + Math.sin(angle) * (radiusX + values[i]);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [isPlaying, getFrequencyData, strokeColor, hasTimer]);

    return (
        <canvas 
            ref={canvasRef} 
            width={200} 
            height={200} 
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} 
        />
    );
}

export function PlayerScreen({ isDark, onToggleDark }: PlayerScreenProps) {
    const { t, i18n } = useTranslation();
    const { state, play, stop, applyPreset, setMaster, setFade, deleteCustomPreset, presets, saveCustomPreset, setSleepTimer } = useAudioEngine();
    const { isPlaying, master, fade, activePresetId, blend, activeToneId, sleepTimerTarget } = state;

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('');
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    // タイマーの実カウントダウン計算（再生ボタン内表示用）
    useEffect(() => {
        if (!sleepTimerTarget) {
            setTimeLeft(null);
            return;
        }

        const tick = () => {
            const diff = sleepTimerTarget - Date.now();
            if (diff <= 0) {
                setTimeLeft(null);
            } else {
                const totalSeconds = Math.floor(diff / 1000);
                const hrs = Math.floor(totalSeconds / 3600);
                const mins = Math.floor((totalSeconds % 3600) / 60);
                const secs = totalSeconds % 60;
                
                if (hrs > 0) {
                    setTimeLeft(`${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                } else {
                    setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
                }
            }
        };

        tick();
        const interval = setInterval(tick, 500);
        return () => clearInterval(interval);
    }, [sleepTimerTarget]);

    const toggleLanguage = useCallback(() => {
        const nextLang = i18n.language.startsWith('ja') ? 'en' : 'ja';
        i18n.changeLanguage(nextLang);
    }, [i18n]);

    const handlePlayToggle = useCallback(async () => {
        if (isPlaying) {
            await stop();
        } else {
            await play();
        }
    }, [isPlaying, play, stop]);

    const handleSaveScene = useCallback(() => {
        if (!presetName.trim()) return;

        const NOISE_LABELS: Record<string, string> = { brown: 'Brown', pink: 'Pink', white: 'White', sub: 'Sub' };
        const activeChannels = Object.entries(blend).filter(([_, v]) => v > 0).map(([k, v]) => `${NOISE_LABELS[k] || k} ${Math.round(v * 100)}%`);
        const activeSounds = state.soundscapeLayers.filter(l => l.volume > 0).map(l => `${l.name} ${Math.round(l.volume * 100)}%`);
        const description = [...activeChannels, ...activeSounds].join('  ·  ');

        const newPreset: any = {
            id: `custom-${Date.now()}`,
            name: presetName.trim(),
            description: description,
            blend: { ...blend },
            toneId: activeToneId ?? undefined,
            eq: { ...state.eq },
            harmonicExciter: { ...state.harmonicExciter },
            soundscapeLayers: state.soundscapeLayers.map(l => ({ ...l })),
            master: { ...state.master },
            builtIn: false,
        };
        saveCustomPreset(newPreset);
        applyPreset(newPreset);
        setShowSaveModal(false);
        setPresetName('');
    }, [presetName, blend, state, activeToneId, saveCustomPreset, applyPreset]);

    const activePreset = presets.find((p: { id: string }) => p.id === activePresetId);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-page)' }}>

            {/* ━━ 上部セクション ━━ */}
            <div style={{ padding: '16px 20px 4px', flexShrink: 0, textAlign: 'center', background: 'var(--bg-card)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                {/* ヘッダー */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5, color: 'var(--text-primary)' }}>SOUNDNEST</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={toggleLanguage} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', color: '#FFF', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                            {i18n.language.startsWith('ja') ? 'JA' : 'EN'}
                        </button>
                        <button onClick={onToggleDark} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isDark ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* シーン情報 */}
                <h1 style={{ fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5, color: 'var(--text-primary)' }}>
                    {activePreset?.builtIn ? t(`presets.${activePreset.id}.name`) : (activePreset?.name ?? t('player.customMix', 'Custom Mix'))}
                </h1>
                <p style={{ 
                    fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 0',
                    height: 36, lineHeight: '18px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                }}>
                    {activePreset?.builtIn ? t(`presets.${activePreset.id}.desc`) : (activePreset?.description ?? t('player.customMixDesc', 'カスタムブレンド'))}
                </p>

                {/* ━━ 中央・左右コントロールエリア ━━ */}
                <div style={{ position: 'relative', width: '100%', maxWidth: 320, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    
                    {/* 再生ボタン & スペクトラム */}
                    <div style={{ position: 'relative', width: 280, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularSpectrum isPlaying={isPlaying} hasTimer={!!timeLeft} />
                        <button 
                            onClick={handlePlayToggle}
                            style={{
                                width: 100, height: 100, 
                                borderRadius: '50%', background: 'var(--text-primary)', border: 'none',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                                gap: timeLeft ? 2 : 0,
                                cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 10,
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            title="タップして再生/停止"
                        >
                            {isPlaying ? (
                                <svg width={timeLeft ? "32" : "32"} height={timeLeft ? "32" : "32"} viewBox="0 0 24 24" fill="var(--bg-card)" style={{ transition: 'all 0.4s' }}>
                                    <rect x="5" y="4" width="4" height="16" rx="2" />
                                    <rect x="15" y="4" width="4" height="16" rx="2" />
                                </svg>
                            ) : (
                                <svg width={timeLeft ? "32" : "32"} height={timeLeft ? "32" : "32"} viewBox="0 0 24 24" fill="var(--bg-card)" style={{ marginLeft: timeLeft ? 4 : 6, transition: 'all 0.4s' }}>
                                    <path d="M5 3L19 12L5 21V3Z" />
                                </svg>
                            )}
                            
                            {/* タイマー表示部（数字のみ・美しさ重視） */}
                            {timeLeft && (
                                <div 
                                    style={{ 
                                        color: 'var(--bg-card)', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginTop: 8, transition: 'opacity 0.3s'
                                    }}
                                >
                                    <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
                                        {timeLeft}
                                    </span>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Timer Icon Button (左側) */}
                    <div style={{ position: 'absolute', left: 32, top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: timeLeft ? 'var(--text-primary)' : 'var(--text-secondary)', letterSpacing: 0.5, transition: 'color 0.3s', whiteSpace: 'nowrap' }}>
                            {timeLeft ? 'TIMER CANCEL' : 'TIMER'}
                        </span>
                        <button 
                            onClick={() => {
                                if (timeLeft) {
                                    setSleepTimer(null);
                                } else {
                                    setShowTimerModal(true);
                                }
                            }}
                            style={{ 
                                width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-default)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                                background: timeLeft ? 'var(--text-primary)' : 'var(--bg-card)',
                                color: timeLeft ? 'var(--bg-page)' : 'var(--text-primary)'
                            }}
                            aria-label={timeLeft ? "Cancel Timer" : "Sleep Timer"}
                        >
                            {timeLeft ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Fade Toggle (右側) */}
                    <div style={{ position: 'absolute', right: 32, top: '50%', transform: 'translate(50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        {fade.enabled ? (
                            <button 
                                onClick={() => {
                                    const opts = [1, 3, 5, 10, 15];
                                    const next = opts[(opts.indexOf(fade.duration) + 1) % opts.length];
                                    setFade({ duration: next });
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', 
                                    letterSpacing: 0.5, whiteSpace: 'nowrap',
                                    background: 'var(--bg-muted)', border: '1px solid var(--border-default)', 
                                    padding: '3px 8px', borderRadius: 12, cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s',
                                    marginTop: -4 // 枠のサイズでボタン本体が下に押されないように調整
                                }}
                                title="タップしてフェード時間を変更"
                            >
                                <span>FADE {fade.duration}s</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>
                        ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                                FADE
                            </span>
                        )}
                        <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
                            <button 
                                onClick={() => setFade({ enabled: !fade.enabled })}
                                style={{
                                    width: 44, height: 22, borderRadius: 11, 
                                    background: fade.enabled ? 'var(--text-primary)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'),
                                    position: 'relative', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: 18, height: 18, borderRadius: '50%', 
                                    background: fade.enabled ? 'var(--bg-page)' : '#FFFFFF',
                                    boxShadow: !fade.enabled ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                                    position: 'absolute', top: 2, left: fade.enabled ? 24 : 2, transition: 'all 0.2s'
                                }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ボリュームスライダー */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 300, margin: '0 auto 16px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M11 5L6 9H2V15H6L11 19V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    <div style={{ flex: 1, height: 4, background: 'var(--border-default)', borderRadius: 2, position: 'relative' }}>
                        <div style={{ width: `${master.volume * 100}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 2 }} />
                        <input 
                            type="range" className="nm-slider" min="0" max="1" step="0.01" value={master.volume}
                            onChange={e => setMaster({ volume: parseFloat(e.target.value) })}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                        />
                        <div style={{ 
                            position: 'absolute', left: `${master.volume * 100}%`, top: '50%', transform: 'translate(-50%, -50%)',
                            width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-card)', border: '3px solid var(--accent-primary)'
                        }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, width: 32, color: 'var(--text-primary)' }}>{Math.round(master.volume * 100)}%</span>
                </div>

                {/* 不要になった旧タイマーボタン群は削除しました */}
            </div>

            {/* ━━ シーンリスト ━━ */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px', background: 'var(--bg-page)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5 }}>SCENES</div>
                    <button 
                        onClick={() => setShowSaveModal(true)}
                        style={{
                            background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '6px 14px',
                            color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            <line x1="12" y1="7" x2="12" y2="13"></line>
                            <line x1="9" y1="10" x2="15" y2="10"></line>
                        </svg>
                        Presets
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {presets.map((preset: Preset) => {
                        const isActive = preset.id === activePresetId;
                        return (
                            <button 
                                key={preset.id} 
                                onClick={() => applyPreset(preset)}
                                style={{
                                    padding: '16px 20px', borderRadius: 20, background: isActive ? 'var(--accent-primary)' : 'var(--bg-card)',
                                    border: isActive ? 'none' : '1px solid var(--border-default)',
                                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    boxShadow: isActive ? 'var(--shadow-btn)' : 'none'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 16, fontWeight: 600, color: isActive ? '#FFFFFF' : 'var(--text-primary)', marginBottom: 2 }}>
                                        {preset.builtIn ? t(`presets.${preset.id}.name`) : preset.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                                        {preset.builtIn ? t(`presets.${preset.id}.desc`) : preset.description}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF', flexShrink: 0 }} />}
                                    {!preset.builtIn && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('このカスタムプリセットを削除しますか？')) {
                                                    deleteCustomPreset(preset.id);
                                                }
                                            }}
                                            style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-muted)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, color: isActive ? '#FFFFFF' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0
                                            }}
                                            aria-label="削除"
                                        >✕</div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 保存モーダル (オリジナルのデザインを流用しアップデート) */}
            {showSaveModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.75)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'flex-end', zIndex: 1000,
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
                >
                    <div className="animate-slide-up" style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '28px 24px max(40px, calc(16px + env(safe-area-inset-bottom)))', display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} /></div>
                        <div><div style={{ fontSize: 24, fontWeight: 300, color: 'var(--text-primary)', fontFamily: 'Inter' }}>{t('player.saveSceneTitle', 'Save Scene')}</div></div>
                        <input
                            type="text" value={presetName}
                            onChange={e => setPresetName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveScene(); }}
                            placeholder={i18n.language.startsWith('ja') ? 'シーン名を入力' : 'Scene Name'}
                            autoFocus
                            style={{ width: '100%', height: 56, borderRadius: 12, border: '1.5px solid var(--accent-primary)', background: 'var(--bg-muted)', padding: '0 16px', fontSize: 16, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button className="nm-btn-primary" style={{ width: '100%', height: 56, borderRadius: 12 }} onClick={handleSaveScene} disabled={!presetName.trim()}>
                                {t('player.saveAsScene', 'Save as Scene')}
                            </button>
                            <button onClick={() => setShowSaveModal(false)} style={{ width: '100%', height: 48, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                                {t('player.cancel', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* タイマーモーダル */}
            {showTimerModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#151C2B', padding: 24, borderRadius: 24, width: '90%', maxWidth: 400, position: 'relative', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <button onClick={() => setShowTimerModal(false)} style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        
                        <h2 style={{ fontSize: 20, margin: '0 0 10px', fontWeight: 700, color: '#FFF', letterSpacing: 0.5 }}>Sleep Timer</h2>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px', fontWeight: 500 }}>Automatically stop playback after a set time</p>
                        
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 -24px 24px' }} />

                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 16 }}>QUICK SELECT</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                            {[5, 10, 15, 30, 45, 60, 90, 120].map(m => (
                                <button key={m} 
                                    onClick={() => {
                                        setSleepTimer(Date.now() + m * 60 * 1000);
                                        setShowTimerModal(false);
                                    }}
                                    style={{ 
                                    padding: '14px 0', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#FFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                                }}>
                                    {m}m
                                </button>
                            ))}
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 16 }}>CUSTOM TIME</div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <input 
                                type="number" placeholder="Enter minutes" 
                                value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}
                                style={{ flex: 1, padding: '0 16px', borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.06)', color: '#FFF', fontSize: 14, outline: 'none' }}
                            />
                            <button 
                                onClick={() => {
                                    const m = parseInt(customMinutes, 10);
                                    if (!isNaN(m) && m > 0) {
                                        setSleepTimer(Date.now() + m * 60 * 1000);
                                        setShowTimerModal(false);
                                    }
                                }}
                                style={{ padding: '0 28px', height: 48, borderRadius: 16, background: '#FFF', border: 'none', color: '#151C2B', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                                Set
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
