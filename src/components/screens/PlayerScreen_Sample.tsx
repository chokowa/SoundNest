import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine } from '../../audio/AudioEngineContext';
import type { Preset } from '../../types/audio';

interface PlayerScreenProps {
    isDark: boolean;
    onToggleDark: () => void;
}

// ━━ スペクトラム・ビジュアライザー・コンポーネント (サンプル用 mock) ━━
function CircularSpectrum({ isPlaying }: { isPlaying: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bars = 60; // バーの数

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const values = new Array(bars).fill(0);

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            for (let i = 0; i < bars; i++) {
                // 再生中はランダムに揺らす（本来はエンジンから周波数データを取得）
                const target = isPlaying ? Math.random() * 20 + 2 : 2;
                values[i] += (target - values[i]) * 0.2; // スムージング

                const angle = (i / bars) * Math.PI * 2;
                const radiusX = 55; // 内半径(縮小)
                const x1 = centerX + Math.cos(angle) * radiusX;
                const y1 = centerY + Math.sin(angle) * radiusX;
                const x2 = centerX + Math.cos(angle) * (radiusX + values[i]);
                const y2 = centerY + Math.sin(angle) * (radiusX + values[i]);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [isPlaying]);

    return (
        <canvas 
            ref={canvasRef} 
            width={180} 
            height={180} 
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} 
        />
    );
}

export function PlayerScreen_Sample({ isDark, onToggleDark }: PlayerScreenProps) {
    const { t, i18n } = useTranslation();
    const { state, play, stop, applyPreset, setMaster, setFade, deleteCustomPreset, presets, saveCustomPreset } = useAudioEngine();
    const { isPlaying, master, fade, activePresetId, blend, activeToneId } = state;

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('');

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
        const newPreset: any = { id: `custom-${Date.now()}`, name: presetName.trim(), description: description, blend: { ...blend }, toneId: activeToneId ?? undefined, eq: { ...state.eq }, harmonicExciter: { ...state.harmonicExciter }, soundscapeLayers: state.soundscapeLayers.map(l => ({ ...l })), master: { ...state.master }, builtIn: false };
        saveCustomPreset(newPreset);
        applyPreset(newPreset);
        setShowSaveModal(false);
        setPresetName('');
    }, [presetName, blend, state, activeToneId, saveCustomPreset, applyPreset]);

    const activePreset = presets.find((p: { id: string }) => p.id === activePresetId);

    return (
        <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden', 
            background: 'linear-gradient(180deg, #3A4A5E 0%, #2A3A4E 100%)',
            color: '#FFFFFF'
        }}>

            {/* ━━ 上部セクション ━━ */}
            <div style={{ padding: '24px 20px 10px', flexShrink: 0, textAlign: 'center' }}>
                {/* ヘッダー */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>SOUNDNEST</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={toggleLanguage} style={{ width: 32, height: 32, borderRadius: '50%', background: '#E91E63', border: 'none', color: '#FFF', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                            {i18n.language.startsWith('ja') ? 'JA' : 'EN'}
                        </button>
                        <button onClick={onToggleDark} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                        </button>
                    </div>
                </div>

                {/* シーン情報 */}
                <h1 style={{ fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 700, margin: '0 0 4px', letterSpacing: -0.5 }}>
                    {activePreset?.builtIn ? t(`presets.${activePreset.id}.name`) : (activePreset?.name ?? 'Custom Mix')}
                </h1>
                <p style={{ 
                    fontSize: 13, 
                    color: 'rgba(255,255,255,0.7)', 
                    margin: '0 0 8px',
                    height: 36, // 18px * 2行分を常に確保
                    lineHeight: '18px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {activePreset?.builtIn ? t(`presets.${activePreset.id}.desc`) : 'Strong low-freq masking for heavy footsteps.'}
                </p>

                {/* 再生ボタン & スペクトラム */}
                <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularSpectrum isPlaying={isPlaying} />
                    <button 
                        onClick={handlePlayToggle}
                        style={{
                            width: 64, height: 64, borderRadius: '50%', background: '#FFFFFF', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 10
                        }}
                    >
                        {isPlaying ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#2A3A4E"><rect x="5" y="4" width="4" height="16" rx="2"/><rect x="15" y="4" width="4" height="16" rx="2"/></svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#2A3A4E" style={{ marginLeft: 4 }}><path d="M5 3L19 12L5 21V3Z"/></svg>
                        )}
                    </button>
                </div>

                {/* Fade トグル (控えめ) */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Fade</span>
                    <button 
                        onClick={() => setFade({ enabled: !fade.enabled })}
                        style={{
                            width: 44, height: 22, borderRadius: 11, background: fade.enabled ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                            position: 'relative', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <div style={{
                            width: 18, height: 18, borderRadius: '50%', background: fade.enabled ? '#2A3A4E' : '#FFFFFF',
                            position: 'absolute', top: 2, left: fade.enabled ? 24 : 2, transition: 'all 0.2s'
                        }} />
                    </button>
                </div>

                {/* ボリュームスライダー */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 300, margin: '0 auto 24px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2V15H6L11 19V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, position: 'relative' }}>
                        <div style={{ width: `${master.volume * 100}%`, height: '100%', background: '#00BCD4', borderRadius: 2 }} />
                        <input 
                            type="range" min="0" max="1" step="0.01" value={master.volume}
                            onChange={e => setMaster({ volume: parseFloat(e.target.value) })}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                        />
                        <div style={{ 
                            position: 'absolute', left: `${master.volume * 100}%`, top: '50%', transform: 'translate(-50%, -50%)',
                            width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF', border: '3px solid #00BCD4'
                        }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, width: 32 }}>{Math.round(master.volume * 100)}%</span>
                </div>

                {/* タイマーボタン群 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                    {[15, 30, 60].map(m => (
                        <button key={m} style={{ 
                            width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#FFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 2 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{m}m</span>
                        </button>
                    ))}
                    <button 
                        onClick={() => setShowTimerModal(true)}
                        style={{ 
                        padding: '0 20px', height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                        color: '#FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                    }}>
                        Custom
                    </button>
                </div>
            </div>

            {/* ━━ シーンリスト ━━ */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 }}>SCENES</div>
                    <button 
                        onClick={() => setShowSaveModal(true)}
                        style={{
                            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, padding: '6px 14px',
                            color: '#FFF', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
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
                                    padding: '16px 20px', borderRadius: 20, background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                    border: isActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginBottom: 2 }}>{preset.builtIn ? t(`presets.${preset.id}.name`) : preset.name}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{preset.builtIn ? t(`presets.${preset.id}.desc`) : preset.description}</div>
                                </div>
                                {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ━━ ボトムナビゲーション ━━ */}
            <div style={{ 
                position: 'fixed', bottom: 24, left: 24, right: 24, height: 64, borderRadius: 32,
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', display: 'flex', padding: 4, zIndex: 100
            }}>
                <button style={{ flex: 1, borderRadius: 28, background: '#FFFFFF', color: '#2A3A4E', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3L19 12L5 21V3Z"/></svg>
                    Player
                </button>
                <button style={{ flex: 1, borderRadius: 28, background: 'transparent', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 13, opacity: 0.6 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 11h16M4 6h16M4 16h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="11" r="2"/><circle cx="10" cy="16" r="2"/></svg>
                    Mixer
                </button>
                <button style={{ flex: 1, borderRadius: 28, background: 'transparent', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 13, opacity: 0.6 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.5 19c.7 0 1.3-.2 1.8-.7.5-.5.7-1.1.7-1.8 0-1.4-1.1-2.5-2.5-2.5-.2 0-.4 0-.6.1C16.4 12.1 14.4 10.5 12 10.5c-2.4 0-4.4 1.6-4.9 3.6-.2-.1-.4-.1-.6-.1-1.4 0-2.5 1.1-2.5 2.5 0 .7.2 1.3.7 1.8.5.5 1.1.7 1.8.7h11z"/></svg>
                    Atmos
                </button>
            </div>

            {/* 保存モーダル (最小限にコピー) */}
            {showSaveModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#2A3A4E', padding: 24, borderRadius: 24, width: '90%', maxWidth: 400 }}>
                        <h2 style={{ fontSize: 20, margin: '0 0 16px' }}>Save Scene</h2>
                        <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#FFF', marginBottom: 16 }} placeholder="Scene Name" />
                        <button onClick={handleSaveScene} style={{ width: '100%', padding: 12, borderRadius: 12, background: '#00BCD4', border: 'none', color: '#FFF', fontWeight: 700 }}>Save</button>
                        <button onClick={() => setShowSaveModal(false)} style={{ width: '100%', padding: 12, marginTop: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
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
                                <button key={m} style={{ 
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
                            <button style={{ padding: '0 28px', height: 48, borderRadius: 16, background: '#FFF', border: 'none', color: '#151C2B', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                                Set
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
