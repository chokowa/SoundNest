import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine } from '../../audio/AudioEngineContext';
import { TONE_IDS, TONE_SETTINGS } from '../../audio/tones';
import { HorizontalSlider } from '../ui/HorizontalSlider';

interface MixerScreenProps {
    isDark: boolean;
    onToggleDark: () => void;
}

// ノイズチャンネル定義
const NOISE_CHANNELS = [
    { key: 'brown' as const, label: 'Brown Noise', desc: '深い低域・集中や睡眠', cssVar: '--noise-brown' },
    { key: 'pink' as const, label: 'Pink Noise', desc: '自然な響き・リラックス', cssVar: '--noise-pink' },
    { key: 'white' as const, label: 'White Noise', desc: '全帯域・強力なマスキング', cssVar: '--noise-white' },
    { key: 'sub' as const, label: 'Sub Bass', desc: '響く重低音・足音対策', cssVar: '--noise-sub' },
];

export function MixerScreen({ isDark, onToggleDark }: MixerScreenProps) {
    const { t, i18n } = useTranslation();
    const { 
        state, 
        setBlend, 
        setTone, 
        setAmbientMasterVolume,
        presets,
    } = useAudioEngine();
    const { blend, activePresetId, activeToneId, master } = state;

    const toggleLanguage = useCallback(() => {
        const nextLang = i18n.language.startsWith('ja') ? 'en' : 'ja';
        i18n.changeLanguage(nextLang);
    }, [i18n]);

    const activePreset = presets.find(p => p.id === activePresetId);

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 'clamp(40px, 7vw, 52px) clamp(16px, 5vw, 24px) 120px', // 下部ナビゲーションを考慮
            position: 'relative',
            background: 'var(--bg-app)',
        }}>
            {/* ヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: 32 }}>
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
                    <button className="nm-theme-toggle" onClick={toggleLanguage} style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Inter', color: 'var(--text-secondary)' }}>
                        {i18n.language.startsWith('ja') ? 'EN' : 'JA'}
                    </button>
                    <button className="nm-theme-toggle" onClick={onToggleDark}>
                        {isDark ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* 1. NOISE MIX セクション (TONE との連結カード) */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 24,
                padding: '24px 20px',
                border: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 24,
            }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text-muted)', fontFamily: 'Inter', marginBottom: 8, opacity: 0.8 }}>
                    {t('mixer.noiseMixHeader', 'NOISE MIX')}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {NOISE_CHANNELS.map(ch => (
                        <HorizontalSlider
                            key={ch.key}
                            value={blend[ch.key] ?? 0}
                            onChange={v => setBlend({ [ch.key]: v })}
                            color={`var(${ch.cssVar})`}
                            label={ch.label}
                            description={ch.desc}
                        />
                    ))}
                </div>

                {/* TONE 連結エリア */}
                <div style={{ 
                    marginTop: 16, 
                    paddingTop: 20, 
                    borderTop: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text-muted)', fontFamily: 'Inter', alignSelf: 'center' }}>
                        {t('mixer.toneHeader', 'TONE (EQ & HARMONICS)')}
                    </div>
                    <div style={{
                        display: 'flex',
                        background: 'var(--bg-muted)',
                        borderRadius: 20,
                        padding: 4,
                        gap: 2,
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
                                        height: 32,
                                        borderRadius: 16,
                                        border: 'none',
                                        background: isActive ? 'var(--bg-card)' : 'transparent',
                                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontWeight: isActive ? 600 : 400,
                                        fontSize: 11,
                                        fontFamily: 'Inter',
                                        boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t(`mixer.tones.${tId}`, toneInfo.name)}
                                </button>
                            );
                        })}
                    </div>
                    {/* TONEの説明文 */}
                    <div style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        fontFamily: 'Inter',
                        textAlign: 'center',
                        marginTop: 4,
                        minHeight: 18,
                        transition: 'opacity 0.2s',
                        opacity: activeToneId ? 1 : 0
                    }}>
                        {activeToneId && t(`mixer.tonedesc.${activeToneId}`)}
                    </div>
                </div>
            </div>

            {/* 2. ATMOS MASTER セクション */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text-muted)', fontFamily: 'Inter', marginBottom: 16, paddingLeft: 4 }}>
                    {t('mixer.atmosMasterHeader', 'ATMOS MASTER')}
                </div>
                <HorizontalSlider
                    value={master.ambientMasterVolume}
                    onChange={setAmbientMasterVolume}
                    color="var(--accent-green)"
                    label="" // ヘッダーと重複するためラベルは空にする
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>}
                />
            </div>
        </div>
    );
}
