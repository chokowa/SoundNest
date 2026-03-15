import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine } from '../../audio/AudioEngineContext';
import type { Preset } from '../../types/audio';

interface PlayerScreenProps {
    isDark: boolean;
    onToggleDark: () => void;
}

export function PlayerScreen({ isDark, onToggleDark }: PlayerScreenProps) {
    const { t, i18n } = useTranslation();
    const { state, play, stop, applyPreset, setMaster, setFade, deleteCustomPreset, presets, saveCustomPreset } = useAudioEngine();
    const { isPlaying, master, fade, activePresetId, blend, activeToneId } = state;

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [presetName, setPresetName] = useState('');

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

        const NOISE_LABELS: Record<string, string> = {
            brown: 'Brown', pink: 'Pink', white: 'White', sub: 'Sub'
        };

        const activeChannels = Object.entries(blend)
            .filter(([_, v]) => v > 0)
            .map(([k, v]) => `${NOISE_LABELS[k] || k} ${Math.round(v * 100)}%`);

        const activeSounds = state.soundscapeLayers
            .filter(l => l.volume > 0)
            .map(l => `${l.name} ${Math.round(l.volume * 100)}%`);

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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ━━ 上部ヒーローカード ━━
                小さい画面: padding を clamp で縮小
                高さはコンテンツ依存（flexShrink:0）
            */}
            <div
                style={{
                    background: 'var(--bg-card)',
                    padding: 'clamp(44px, 7vw, 56px) clamp(20px, 5vw, 28px) clamp(24px, 4vw, 36px)',
                    flexShrink: 0,
                    boxShadow: '0 4px 20px rgba(28,28,28,0.06)',
                }}
            >
                {/* ヘッダー行 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        fontFamily: 'Inter',
                        fontSize: 'clamp(15px, 4vw, 18px)',
                        fontWeight: 300,
                        letterSpacing: -0.5,
                        lineHeight: 1.2,
                        color: 'var(--text-primary)',
                    }}>
                        Sound<br />Nest
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {isPlaying && (
                            <div className="nm-badge nm-badge-active">
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                                ACTIVE
                            </div>
                        )}
                        <button
                            className="nm-theme-toggle"
                            onClick={toggleLanguage}
                            aria-label={t('player.toggleLanguage', '言語切り替え')}
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: 'Inter',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            {i18n.language.startsWith('ja') ? 'EN' : 'JA'}
                        </button>
                        <button className="nm-theme-toggle" onClick={onToggleDark} aria-label={t('player.toggleTheme', 'テーマ切り替え')}>
                            {isDark ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                            )}
                        </button>
                    </div>
                </div>

                <div style={{ height: 'clamp(20px, 4vw, 36px)' }} />

                {/* ステータス */}
                <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 1.2,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                    fontFamily: 'Inter',
                }}>
                    {isPlaying ? t('player.statusActive', 'NOW MASKING') : t('player.statusReady', 'READY')}
                </div>

                {/* シーン名（大タイトル） */}
                <h1 style={{
                    fontSize: 'clamp(28px, 8vw, 40px)',
                    fontWeight: 300,
                    letterSpacing: -1.5,
                    lineHeight: 1.05,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px',
                    fontFamily: 'Inter',
                    whiteSpace: 'nowrap',
                }}>
                    {activePreset?.builtIn ? t(`presets.${activePreset.id}.name`) : (activePreset?.name ?? t('player.customMix', 'Custom Mix'))}
                </h1>

                {/* サブタイトル */}
                <p style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: 0,
                    fontWeight: 400,
                    fontFamily: 'Inter',
                    lineHeight: 1.5,
                    height: 36, // 12px * 1.5 * 2行 = 常に2行分の高さを確保
                    wordBreak: 'break-all',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                } as React.CSSProperties}>
                    {activePreset?.builtIn ? t(`presets.${activePreset.id}.desc`) : (activePreset?.description ?? t('player.customMixDesc', 'カスタムブレンド'))}
                </p>

                {/* コントロールエリア: スライダー群 + 再生ボタン */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingTop: 'clamp(20px, 5vw, 32px)',
                    gap: 20,
                }}>
                    {/* 左: スライダー群（VOLUME + FADE を縦に揃える） */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

                        {/* VOLUME 行 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)', fontFamily: 'Inter' }}>
                                    VOLUME
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', fontFamily: 'Inter' }}>
                                    {Math.round(master.volume * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                className="nm-slider"
                                min={0}
                                max={1}
                                step={0.01}
                                value={master.volume}
                                onChange={e => setMaster({ volume: parseFloat(e.target.value) })}
                                style={{
                                    background: `linear-gradient(to right, var(--accent-primary) ${master.volume * 100}%, var(--border-default) ${master.volume * 100}%)`,
                                }}
                            />
                        </div>

                        {/* FADE 行（コンパクトなインラインコントロール） */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 4,
                        }}>
                            {/* LEFT: FADE ラベル + トグル */}
                            <button
                                onClick={() => setFade({ enabled: !fade.enabled })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                                aria-label={t('player.fadeToggle', 'フェード切り替え')}
                            >
                                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text-muted)', fontFamily: 'Inter' }}>
                                    FADE
                                </span>
                                <div style={{
                                    width: 32,
                                    height: 18,
                                    borderRadius: 9,
                                    background: fade.enabled ? 'var(--accent-primary)' : 'var(--border-strong)',
                                    position: 'relative',
                                    transition: 'background var(--transition-fast)',
                                    flexShrink: 0,
                                }}>
                                    <div style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        background: '#FFFFFF',
                                        position: 'absolute',
                                        top: 2,
                                        left: fade.enabled ? 16 : 2,
                                        transition: 'left var(--transition-fast)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }} />
                                </div>
                            </button>

                            {/* RIGHT: 秒数ステッパー（ON時のみ操作可能） */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                opacity: fade.enabled ? 1 : 0.3,
                                pointerEvents: fade.enabled ? 'auto' : 'none',
                                transition: 'opacity var(--transition-fast)',
                            }}>
                                <button
                                    onClick={() => setFade({ duration: Math.max(1, fade.duration - 1) })}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 6,
                                        border: '1px solid var(--border-default)',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0,
                                        lineHeight: 1,
                                    }}
                                    aria-label="Decrease fade duration"
                                >−</button>
                                <span style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: fade.enabled ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    fontFamily: 'Inter',
                                    minWidth: 28,
                                    textAlign: 'center',
                                    transition: 'color var(--transition-fast)',
                                }}>
                                    {fade.enabled ? `${fade.duration}s` : 'OFF'}
                                </span>
                                <button
                                    onClick={() => setFade({ duration: Math.min(15, fade.duration + 1) })}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 6,
                                        border: '1px solid var(--border-default)',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0,
                                        lineHeight: 1,
                                    }}
                                    aria-label="Increase fade duration"
                                >+</button>
                            </div>
                        </div>
                    </div>

                    {/* 右: 再生ボタン（タッチターゲット 72px） */}
                    <button
                        className="nm-play-btn"
                        onClick={handlePlayToggle}
                        aria-label={isPlaying ? t('player.stop', '停止') : t('player.play', '再生')}
                        style={{ flexShrink: 0, alignSelf: 'center' }}
                    >
                        {isPlaying ? (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <rect x="2" y="2" width="6" height="16" rx="1.5" fill="white" />
                                <rect x="12" y="2" width="6" height="16" rx="1.5" fill="white" />
                            </svg>
                        ) : (
                            <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style={{ marginLeft: 3 }}>
                                <path d="M1 1.5L19 11L1 20.5V1.5Z" fill="white" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* ━━ 下部: SCENESリスト（スクロール可能） ━━ */}
            <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                /* スクロール時するりと動くようにするiOS対応 */
                WebkitOverflowScrolling: 'touch',
                padding: '20px 20px 0',
            } as React.CSSProperties}>
                <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 1.4,
                    color: 'var(--text-muted)',
                    marginBottom: 14,
                    fontFamily: 'Inter',
                }}>
                    SCENES
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
                    {presets.map((preset: Preset) => {
                        const isActive = preset.id === activePresetId;
                        return (
                            <button
                                key={preset.id}
                                onClick={() => applyPreset(preset)}
                                style={{
                                    width: '100%',
                                    /* タッチターゲット最小高さ 64px */
                                    minHeight: isActive ? 76 : 64,
                                    background: isActive ? 'var(--accent-primary)' : 'var(--bg-card)',
                                    borderRadius: 'var(--radius-card)',
                                    border: isActive ? 'none' : '1px solid var(--border-default)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 18px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all var(--transition-fast)',
                                    boxShadow: isActive ? 'var(--shadow-btn)' : 'none',
                                    position: 'relative',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 15,
                                        fontWeight: isActive ? 600 : 500,
                                        color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                                        marginBottom: 3,
                                        fontFamily: 'Inter',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {preset.builtIn ? t(`presets.${preset.id}.name`) : preset.name}
                                    </div>
                                    <div style={{
                                        fontSize: 11,
                                        lineHeight: 1.5,
                                        fontWeight: 400,
                                        color: isActive ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)',
                                        fontFamily: 'Inter',
                                        /* 選択時は折り返し、非選択時は1行で省略 */
                                        whiteSpace: isActive ? 'normal' : 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        transition: 'all var(--transition-fast)',
                                        marginTop: isActive ? 4 : 0,
                                    }}>
                                        {isActive && isPlaying ? '▶ ' : ''}{preset.builtIn ? t(`presets.${preset.id}.desc`) : preset.description}
                                    </div>
                                </div>
                                {/* アクティブインジケータ */}
                                {isActive && (
                                    <div style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: '#FFFFFF',
                                        opacity: 0.85,
                                        flexShrink: 0,
                                        marginLeft: 12,
                                    }} />
                                )}
                                {/* カスタムプリセットの削除ボタン */}
                                {!preset.builtIn && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('このカスタムプリセットを削除しますか？')) {
                                                deleteCustomPreset(preset.id);
                                            }
                                        }}
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            background: isActive ? 'rgba(255,255,255,0.15)' : 'var(--bg-muted, rgba(128,128,128,0.15))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            lineHeight: 1,
                                            color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            marginLeft: 8,
                                            transition: 'background 0.15s, color 0.15s',
                                        }}
                                        aria-label="削除"
                                    >✕</span>
                                )}
                            </button>
                        );
                    })}

                    {/* Add to Scenes ボタン */}
                    <button
                        onClick={() => setShowSaveModal(true)}
                        style={{
                            width: '100%', minHeight: 56,
                            background: 'transparent',
                            borderRadius: 'var(--radius-card)',
                            border: '1.5px dashed var(--border-strong)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 10, padding: '12px 18px', cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontFamily: 'Inter',
                            transition: 'all var(--transition-fast)',
                            marginTop: 10,
                        }}
                    >
                        <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{t('player.addToScenes', 'Add to Scenes')}</span>
                    </button>
                </div>
            </div>

            {/* 保存モーダル */}
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
                            <button onClick={() => setShowSaveModal(false)} style={{ width: '100%', height: 48, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                {t('player.cancel', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
