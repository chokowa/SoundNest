import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine } from '../../audio/AudioEngineContext';
import type { Preset } from '../../types/audio';
import { TONE_IDS, TONE_SETTINGS } from '../../audio/tones';

interface MixerScreenProps {
    isDark: boolean;
    onToggleDark: () => void;
}



// スライダーチャンネル定義（4チャンネル）
const CHANNELS = [
    { key: 'brown' as const, label: 'Brown', sub: 'Low\nFreq', cssVar: '--noise-brown' },
    { key: 'pink' as const, label: 'Pink', sub: 'Mid\nFreq', cssVar: '--noise-pink' },
    { key: 'white' as const, label: 'White', sub: 'High\nFreq', cssVar: '--noise-white' },
    { key: 'sub' as const, label: 'Sub', sub: 'Bass\nBoost', cssVar: '--noise-sub' },
];

interface VerticalSliderProps {
    value: number;           // 0.0 ~ 1.0
    onChange: (v: number) => void;
    color: string;
    label: string;
    sub: string;
    isActive: boolean;       // Brown/Pink のどちらかが主役かを示すハイライト
}

function VerticalSlider({ value, onChange, color, label, sub, isActive }: VerticalSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    const getValueFromY = useCallback((clientY: number): number => {
        const track = trackRef.current;
        if (!track) return value;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
        return ratio;
    }, [value]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(getValueFromY(e.clientY));
    }, [onChange, getValueFromY]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (e.buttons === 0) return;
        onChange(getValueFromY(e.clientY));
    }, [onChange, getValueFromY]);

    const fillPercent = value * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {/* チャンネルラベル */}
            <div style={{
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? color : 'var(--text-secondary)',
                textAlign: 'center',
                fontFamily: 'Inter',
                letterSpacing: 0.2,
            }}>
                {label}
            </div>
            <div style={{
                fontSize: 9,
                fontWeight: 400,
                color: 'var(--text-muted)',
                textAlign: 'center',
                whiteSpace: 'pre',
                lineHeight: 1.4,
                fontFamily: 'Inter',
            }}>
                {sub}
            </div>

            {/* ━━ タッチ操作エリア（幅広く確保） ━━ */}
            <div
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                style={{
                    flex: 1,
                    width: '100%',
                    position: 'relative',
                    cursor: 'ns-resize',
                    touchAction: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    /* タッチターゲット横幅を広く（最低44px） */
                    minWidth: 44,
                }}
            >
                {/* トラック線（8px幅に拡大） */}
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 18,
                    bottom: 18,
                    width: 8,
                    borderRadius: 4,
                    background: 'var(--border-default)',
                    overflow: 'hidden',
                }}>
                    {/* フィル */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${fillPercent}%`,
                        background: color,
                        borderRadius: 4,
                        transition: 'height 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    }} />
                </div>

                {/* つまみ（36px = タッチしやすいサイズに拡大） */}
                <div style={{
                    position: 'absolute',
                    /* top から計算：トラック上端(18px) + トラック総高さ × (1-ratio) - つまみ半径(18px) */
                    top: `calc(18px + (100% - 36px) * ${1 - value})`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--bg-card)',
                    border: `2.5px solid ${color}`,
                    boxShadow: `0 4px 12px ${color}50`,
                    cursor: 'ns-resize',
                    zIndex: 1,
                    transition: 'top 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                }} />
            </div>

            {/* 数値 */}
            <div style={{
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'Inter',
                fontVariantNumeric: 'tabular-nums',
            }}>
                {Math.round(value * 100)}%
            </div>
        </div>
    );
}

export function MixerScreen({ isDark, onToggleDark }: MixerScreenProps) {
    const { t, i18n } = useTranslation();
    const { state, setBlend, setTone, applyPreset, presets, saveCustomPreset } = useAudioEngine();
    const { blend, activePresetId, activeToneId } = state;

    const toggleLanguage = useCallback(() => {
        const nextLang = i18n.language.startsWith('ja') ? 'en' : 'ja';
        i18n.changeLanguage(nextLang);
    }, [i18n]);

    // プリセット保存モーダル
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [presetName, setPresetName] = useState('');

    const activePreset = presets.find(p => p.id === activePresetId);

    const handleSavePreset = useCallback(() => {
        if (!presetName.trim()) return;
        const newPreset: Preset = {
            id: `custom-${Date.now()}`,
            name: presetName.trim(),
            description: `Brown ${Math.round(blend.brown * 100)}%  ·  Pink ${Math.round(blend.pink * 100)}%`,
            blend: { ...blend },
            toneId: activeToneId ?? undefined,
            eq: { ...state.eq },
            harmonicExciter: { ...state.harmonicExciter },
            builtIn: false,
        };
        saveCustomPreset(newPreset);
        applyPreset(newPreset);
        setShowSaveModal(false);
        setPresetName('');
    }, [presetName, blend, state, activeToneId, saveCustomPreset, applyPreset]);

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            /* セーフエリアを考慮した上部パディング */
            padding: 'clamp(40px, 7vw, 52px) clamp(16px, 5vw, 24px) 0',
            position: 'relative',
        }}>
            {/* ヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text-muted)', fontFamily: 'Inter' }}>
                        SOUNDNEST
                    </div>
                    <div style={{ fontSize: 'clamp(24px, 7vw, 32px)', fontWeight: 300, letterSpacing: -0.5, color: 'var(--text-primary)', fontFamily: 'Inter', marginTop: 4 }}>
                        Mixer
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {activePreset && (
                        <div style={{
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: '1px solid var(--border-default)',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            fontFamily: 'Inter',
                        }}>
                            {activePreset.builtIn ? t(`presets.${activePreset.id}.name`) : activePreset.name}
                        </div>
                    )}
                    <button
                        className="nm-theme-toggle"
                        onClick={toggleLanguage}
                        aria-label={t('mixer.toggleLanguage', '言語切り替え')}
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: 'Inter',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        {i18n.language.startsWith('ja') ? 'EN' : 'JA'}
                    </button>
                    <button className="nm-theme-toggle" onClick={onToggleDark} aria-label={t('mixer.toggleTheme', 'テーマ切り替え')}>
                        {isDark ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* スライダーエリア（均等分割）*/}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 'clamp(4px, 2vw, 12px)', padding: '20px 0 16px' }}>
                {CHANNELS.map(ch => {
                    const vol = blend[ch.key] ?? 0;
                    const maxVal = Math.max(blend.brown, blend.pink, blend.white ?? 0, blend.sub ?? 0);
                    const isActive = vol > 0 && vol === maxVal;
                    return (
                        <VerticalSlider
                            key={ch.key}
                            value={vol}
                            onChange={v => setBlend({ [ch.key]: v })}
                            color={`var(${ch.cssVar})`}
                            label={ch.label}
                            sub={ch.sub}
                            isActive={isActive}
                        />
                    );
                })}
            </div>

            {/* Tone (音色) 選択 */}
            <div style={{ flexShrink: 0, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text-muted)', fontFamily: 'Inter', alignSelf: 'center' }}>
                    {t('mixer.toneHeader', 'TONE (EQ & HARMONICS)')}
                </div>
                <div style={{
                    display: 'flex',
                    background: 'var(--bg-muted)',
                    borderRadius: 24,
                    padding: 4,
                    gap: 4,
                }}>
                    {TONE_IDS.map(tId => {
                        const toneInfo = TONE_SETTINGS[tId];
                        const isActive = activeToneId === tId;
                        return (
                            <button
                                key={tId}
                                onClick={() => setTone(tId)}
                                style={{
                                    flex: 1,
                                    height: 36,
                                    borderRadius: 18,
                                    border: 'none',
                                    background: isActive ? 'var(--bg-card)' : 'transparent',
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontWeight: isActive ? 600 : 400,
                                    fontSize: 12,
                                    fontFamily: 'Inter',
                                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                }}
                            >
                                {toneInfo.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Save as Preset ボタン */}
            <div style={{ flexShrink: 0, paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter' }}>{t('mixer.yourCustomMix', 'Your custom mix')}</div>
                <button
                    className="nm-btn-primary"
                    style={{ width: '100%', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}
                    onClick={() => setShowSaveModal(true)}
                >
                    <span style={{ fontSize: 18, fontWeight: 300, lineHeight: 1 }}>+</span>
                    {t('mixer.saveAsPreset', 'Save as Preset')}
                </button>
            </div>

            {/* 保存モーダル（ボトムシート） */}
            {showSaveModal && (
                <div
                    style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(28,28,28,0.5)',
                        display: 'flex', alignItems: 'flex-end',
                        zIndex: 100,
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
                >
                    <div
                        className="animate-slide-up"
                        style={{
                            width: '100%',
                            background: 'var(--bg-card)',
                            borderRadius: '24px 24px 0 0',
                            /* セーフエリア（ホームバー）分を考慮した底パディング */
                            padding: '28px 24px',
                            paddingBottom: 'max(40px, calc(16px + env(safe-area-inset-bottom)))',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20,
                        }}
                    >
                        {/* ハンドル */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-default)' }} />
                        </div>

                        {/* タイトル */}
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: -0.5, color: 'var(--text-primary)', fontFamily: 'Inter' }}>
                                {t('mixer.savePresetTitle', 'Save Preset')}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'Inter' }}>
                                {t('mixer.savePresetDesc', 'Name your custom noise blend')}
                            </div>
                        </div>

                        {/* 現在のミックスプレビュー */}
                        <div style={{
                            background: 'var(--bg-muted)',
                            borderRadius: 12,
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                        }}>
                            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)' }}>MIX</span>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 28 }}>
                                {CHANNELS.map(ch => (
                                    <div key={ch.key} style={{
                                        width: 8,
                                        height: Math.max(4, blend[ch.key] * 28),
                                        background: `var(${ch.cssVar})`,
                                        borderRadius: 2,
                                    }} />
                                ))}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'Inter' }}>
                                {CHANNELS.map(ch => `${ch.label} ${Math.round(blend[ch.key] * 100)}%`).join('  ·  ')}
                            </span>
                        </div>

                        {/* 入力欄 */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'Inter' }}>
                                {t('mixer.presetNameLabel', 'PRESET NAME')}
                            </div>
                            <input
                                type="text"
                                value={presetName}
                                onChange={e => setPresetName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSavePreset(); }}
                                placeholder={t('mixer.presetNamePlaceholder', '例: 夜のリラックス')}
                                autoFocus
                                style={{
                                    width: '100%',
                                    height: 56,
                                    borderRadius: 12,
                                    border: '1.5px solid var(--accent-primary)',
                                    background: 'var(--bg-muted)',
                                    padding: '0 16px',
                                    fontSize: 16,
                                    fontFamily: 'Inter',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {/* ボタン */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button
                                className="nm-btn-primary"
                                style={{ width: '100%', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={handleSavePreset}
                                disabled={!presetName.trim()}
                            >
                                {t('mixer.saveButton', 'Save Preset')}
                            </button>
                            <button
                                onClick={() => setShowSaveModal(false)}
                                style={{
                                    width: '100%',
                                    height: 48,
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: 15,
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontFamily: 'Inter',
                                }}
                            >
                                {t('mixer.cancelButton', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
