import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioEngine } from '../../audio/AudioEngineContext';
import { customFilesDb } from '../../audio/customFilesDb';

interface SoundsScreenProps {
    isDark: boolean;
    onToggleDark: () => void;
}

// 組み込み環境音の定義
// 注: 実際の音源ファイルは /public/ambient/ に配置することを前提とする
const getUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const AMBIENT_SOUNDS = [
    { id: 'rain', label: 'Rain', sub: '雨音', src: getUrl('ambient/rain.mp3'), img: getUrl('images/rain.png'), defaultVolume: 0.4 },
    { id: 'forest', label: 'Forest', sub: '森', src: getUrl('ambient/forest.mp3'), img: getUrl('images/forest.png'), defaultVolume: 0.35 },
    { id: 'cafe', label: 'Café', sub: 'カフェ', src: getUrl('ambient/cafe.mp3'), img: getUrl('images/cafe.png'), imgPos: 'center 75%', defaultVolume: 0.4 },
    { id: 'ocean', label: 'Ocean', sub: '波音', src: getUrl('ambient/ocean.mp3'), img: getUrl('images/ocean.png'), defaultVolume: 0.35 },
    { id: 'bonfire', label: 'Bonfire', sub: '焚き火', src: getUrl('ambient/bonfire.mp3'), img: getUrl('images/bonfire.png'), defaultVolume: 0.35 },
    { id: 'thunder', label: 'Thunder', sub: '雷鳴', src: getUrl('ambient/thunder.mp3'), img: getUrl('images/thunder.png'), defaultVolume: 0.45 },
];

export function SoundsScreen({ isDark, onToggleDark }: SoundsScreenProps) {
    const { t, i18n } = useTranslation();
    const { state, updateSoundscape, removeSoundscape, addSoundscapeLayer, addCustomFile, removeCustomFile, presets } = useAudioEngine();
    const { soundscapeLayers, customFiles = [], activePresetId } = state;

    const activePreset = presets.find(p => p.id === activePresetId);

    const [showHint, setShowHint] = useState<boolean>(true);

    useEffect(() => {
        const stored = localStorage.getItem('hideAtmosHint');
        if (stored === 'true') {
            setShowHint(false);
        }
    }, []);

    const handleCloseHint = () => {
        setShowHint(false);
        localStorage.setItem('hideAtmosHint', 'true');
    };

    const handleShowHint = () => {
        setShowHint(true);
        localStorage.setItem('hideAtmosHint', 'false');
    };

    const toggleLanguage = useCallback(() => {
        const nextLang = i18n.language.startsWith('ja') ? 'en' : 'ja';
        i18n.changeLanguage(nextLang);
    }, [i18n]);

    // 組み込み環境音のトグル
    const handleBuiltInToggle = useCallback((sound: typeof AMBIENT_SOUNDS[number]) => {
        const existing = soundscapeLayers.find(l => l.id === sound.id);
        if (existing) {
            removeSoundscape(sound.id);
        } else {
            // 固定IDでレイヤーを直接追加（ファイルアップロード方式を使わず、パスから再生）
            addSoundscapeLayer({
                id: sound.id,
                name: sound.label,
                src: sound.src,
                volume: sound.defaultVolume ?? 0.3,
                loop: true,
            });
        }
    }, [soundscapeLayers, removeSoundscape, addSoundscapeLayer]);

    // === カスタム音源の再生/停止トグル ===
    const handleCustomToggle = useCallback((file: { id: string; name: string; src: string }) => {
        const existing = soundscapeLayers.find(l => l.id === file.id);
        if (existing) {
            removeSoundscape(file.id);
        } else {
            addSoundscapeLayer({
                id: file.id,
                name: file.name,
                src: file.src,
                volume: 0.3,
                loop: true,
            });
        }
    }, [soundscapeLayers, removeSoundscape, addSoundscapeLayer]);

    // カスタム音源をリストから完全に削除
    const handleCustomDelete = useCallback((file: { id: string; src: string }) => {
        // 再生中なら先に停止
        if (soundscapeLayers.find(l => l.id === file.id)) {
            removeSoundscape(file.id);
        }
        // グローバルステートから削除（URLの破棄はContext内のremoveCustomFileで行う）
        removeCustomFile(file.id);
    }, [soundscapeLayers, removeSoundscape, removeCustomFile]);

    // ユーザーカスタム音源のアップロード
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const objectUrl = URL.createObjectURL(file);
            const name = file.name.replace(/\.[^.]+$/, '');
            
            // IndexedDBへの保存 (非同期・バックグラウンド)
            customFilesDb.save(id, name, file).catch(err => {
                console.error('カスタム音源の保存に失敗しました:', err);
            });

            // グローバルステートに登録（停止状態でリストに追加）
            addCustomFile({ id, name, src: objectUrl });
        }
        e.target.value = '';
    }, [addCustomFile]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 'clamp(40px, 7vw, 52px) clamp(16px, 5vw, 24px) 0' }}>
            {/* ヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, color: 'var(--text-muted)', fontFamily: 'Inter' }}>
                        SOUNDNEST
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: -0.5, color: 'var(--text-primary)', fontFamily: 'Inter', marginTop: 4 }}>
                        {t('app.tabAtmos', 'Atmos')}
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
                    {!showHint && (
                        <button
                            className="nm-theme-toggle"
                            onClick={handleShowHint}
                            aria-label="Hint"
                            style={{ fontSize: 14 }}
                        >
                            💡
                        </button>
                    )}
                    <button
                        className="nm-theme-toggle"
                        onClick={toggleLanguage}
                        aria-label={t('sounds.toggleLanguage', '言語切り替え')}
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: 'Inter',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        {i18n.language.startsWith('ja') ? 'EN' : 'JA'}
                    </button>
                    <button className="nm-theme-toggle" onClick={onToggleDark} aria-label={t('sounds.toggleTheme', 'テーマ切り替え')}>
                        {isDark ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* 使い方ヒント */}
            {showHint && (
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-card)',
                    padding: '16px',
                    marginTop: 24,
                    border: '1px solid var(--border-default)',
                    position: 'relative'
                }}>
                    <button
                        onClick={handleCloseHint}
                        style={{
                            position: 'absolute', top: 12, right: 12,
                            width: 24, height: 24, background: 'transparent',
                            border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0
                        }}
                        aria-label="閉じる"
                    >✕</button>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter' }}>
                        <span style={{ fontSize: 16 }}>💡</span>
                        {t('sounds.hintTitle', 'Hint')}
                    </div>
                    <ul style={{ 
                        margin: 0, paddingLeft: 22, 
                        fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                        display: 'flex', flexDirection: 'column', gap: 6,
                        fontFamily: 'Inter'
                    }}>
                        <li>{t('sounds.hintPlay', 'To hear the ambient sounds selected here, you must press the Play button on the Player screen.')}</li>
                        <li>{t('sounds.hintAtmosOnly', "To listen to ambient sounds only, select the 'Atmos only' Preset on the Player tab, or set all noise volumes to zero in the Mixer.")}</li>
                    </ul>
                </div>
            )}

            {/* セクションラベル */}
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: 'var(--text-muted)', padding: '24px 0 14px', flexShrink: 0, fontFamily: 'Inter' }}>
                {t('sounds.ambientLibrary', 'AMBIENT LIBRARY')}
            </div>

            {/* 環境音リスト */}
            <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
                    {AMBIENT_SOUNDS.map(sound => {
                        const layer = soundscapeLayers.find(l => l.id === sound.id);
                        const isActive = !!layer;

                        return (
                            <div
                                key={sound.id}
                                style={{
                                    width: '100%',
                                    position: 'relative',
                                    borderRadius: 'var(--radius-card)',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    transition: 'all var(--transition-base)',
                                    boxShadow: isActive ? 'var(--shadow-btn)' : 'none',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* 背景レイヤー（画像＋オーバーレイ） */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    backgroundImage: `url(${sound.img})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: sound.imgPos || 'center',
                                    opacity: isActive ? 1.0 : 0.6,
                                    transition: 'opacity 0.3s ease',
                                    zIndex: 0,
                                }} />
                                {/* 暗くするオーバーレイ */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: isActive ? 'linear-gradient(to right, rgba(20,20,18,0.8), rgba(20,20,18,0.3))' : 'rgba(28,28,28,0.8)',
                                    zIndex: 1,
                                    transition: 'background 0.3s ease',
                                }} />

                                {/* タイトル行（コンテンツはzIndexで前面へ） */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 2, position: 'relative' }}>
                                    {/* アイコン（再生・停止SVGのみ） */}
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isActive ? '#000000' : '#FFFFFF',
                                        flexShrink: 0,
                                        cursor: 'pointer',
                                    }} onClick={() => handleBuiltInToggle(sound)}>
                                        {isActive ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 16, fontWeight: 500, color: '#FFFFFF', fontFamily: 'Inter' }}>
                                            {t(`sounds.${sound.id}.label`, sound.label)}
                                        </div>
                                        <div style={{ fontSize: 12, color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginTop: 2, fontFamily: 'Inter' }}>
                                            {isActive ? t('sounds.statusPlaying') : t('sounds.statusStopped')}
                                        </div>
                                    </div>
                                </div>

                                {/* 音量スライダー（再生時のみ表示しスムーズに開閉） */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateRows: isActive ? '1fr' : '0fr',
                                    transition: 'grid-template-rows var(--transition-base)',
                                    position: 'relative', zIndex: 2,
                                }}>
                                    <div style={{
                                        minHeight: 0, overflow: 'hidden',
                                        paddingLeft: 60, paddingRight: 8,
                                        opacity: isActive ? 1 : 0,
                                        pointerEvents: isActive ? 'auto' : 'none',
                                        transition: 'opacity var(--transition-base)',
                                        display: 'flex', alignItems: 'center'
                                    }}>
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={layer?.volume ?? 0.5}
                                            onChange={e => isActive && updateSoundscape(sound.id, { volume: parseFloat(e.target.value) })}
                                            style={{
                                                WebkitAppearance: 'none',
                                                appearance: 'none',
                                                width: '100%',
                                                height: 4,
                                                borderRadius: 2,
                                                margin: '12px 0 4px', // スライダーが開いた時に上方向の余白を設ける
                                                background: `linear-gradient(to right, ${isActive ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)'} ${(layer?.volume ?? 0.5) * 100}%, ${isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-strong)'} ${(layer?.volume ?? 0.5) * 100}%)`,
                                                cursor: isActive ? 'pointer' : 'default',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* ユーザーカスタム音源 */}
                    {customFiles.map(file => {
                        const layer = soundscapeLayers.find(l => l.id === file.id);
                        const isActive = !!layer;

                        return (
                            <div
                                key={file.id}
                                style={{
                                    width: '100%',
                                    background: isActive ? 'var(--accent-primary)' : 'var(--bg-card)',
                                    borderRadius: 'var(--radius-card)',
                                    border: isActive ? 'none' : '1px solid var(--border-default)',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    transition: 'all var(--transition-base)',
                                    boxShadow: isActive ? 'var(--shadow-btn)' : 'none',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* タイトル行 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {/* アイコン（兼 再生・停止ボタン） */}
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        background: isActive ? 'rgba(255,255,255,0.12)' : 'var(--bg-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isActive ? '#FFFFFF' : 'var(--text-primary)', flexShrink: 0,
                                        cursor: 'pointer',
                                    }} onClick={() => handleCustomToggle(file)}>
                                        {isActive ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 16, fontWeight: 500,
                                            color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                                            fontFamily: 'Inter',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {file.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', marginTop: 2, fontFamily: 'Inter' }}>
                                            {t('sounds.customSound')}  ·  {isActive ? t('sounds.statusPlaying') : t('sounds.statusStopped')}
                                        </div>
                                    </div>
                                    {/* リストから削除ボタン */}
                                    <span
                                        onClick={() => handleCustomDelete(file)}
                                        style={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: isActive ? 'rgba(255,255,255,0.1)' : 'var(--bg-muted, rgba(128,128,128,0.15))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, lineHeight: 1,
                                            color: isActive ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
                                            cursor: 'pointer', flexShrink: 0,
                                            transition: 'background 0.15s, color 0.15s',
                                        }}
                                        aria-label="削除"
                                    >✕</span>
                                </div>

                                {/* 音量スライダー（再生時のみ表示しスムーズに開閉） */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateRows: isActive ? '1fr' : '0fr',
                                    transition: 'grid-template-rows var(--transition-base)',
                                }}>
                                    <div style={{
                                        minHeight: 0, overflow: 'hidden',
                                        paddingLeft: 60, paddingRight: 8,
                                        opacity: isActive ? 1 : 0,
                                        pointerEvents: isActive ? 'auto' : 'none',
                                        transition: 'opacity var(--transition-base)',
                                        display: 'flex', alignItems: 'center'
                                    }}>
                                        <input
                                            type="range"
                                            min={0} max={1} step={0.01}
                                            value={layer?.volume ?? 0.3}
                                            onChange={e => isActive && updateSoundscape(file.id, { volume: parseFloat(e.target.value) })}
                                            style={{
                                                WebkitAppearance: 'none', appearance: 'none',
                                                width: '100%', height: 4, borderRadius: 2,
                                                margin: '12px 0 4px',
                                                background: `linear-gradient(to right, ${isActive ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)'} ${(layer?.volume ?? 0.3) * 100}%, ${isActive ? 'rgba(255,255,255,0.25)' : 'var(--border-strong)'} ${(layer?.volume ?? 0.3) * 100}%)`,
                                                cursor: isActive ? 'pointer' : 'default',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* ファイルアップロードゾーン */}
                    <label
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            height: 64,
                            border: '1.5px dashed var(--border-strong)',
                            borderRadius: 'var(--radius-card)',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: 14,
                            fontFamily: 'Inter',
                            transition: 'border-color var(--transition-fast)',
                        }}
                    >
                        <span style={{ fontSize: 18 }}>+</span>
                        {t('sounds.addOwnAudio', '自分の音源を追加（MP3 / WAV）')}
                        <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                </div>
            </div>
        </div >
    );
}
