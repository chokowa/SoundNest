import { useAudioEngine } from '../../audio/AudioEngineContext';
import type { Preset } from '../../types/audio';

/**
 * プリセット選択UI
 * 組み込みプリセットをカード形式で表示し、タップで即座に切り替え。
 * カスタムプリセットには削除ボタンを表示。
 */
export function PresetSelector() {
    const { state, applyPreset, deleteCustomPreset, presets } = useAudioEngine();

    const handleSelect = (preset: Preset) => {
        applyPreset(preset);
    };

    const handleDelete = (e: React.MouseEvent, presetId: string) => {
        e.stopPropagation(); // 親のonClick（プリセット選択）を発火させない
        if (confirm('このカスタムプリセットを削除しますか？')) {
            deleteCustomPreset(presetId);
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                プリセット
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {presets.map((preset) => {
                    const isActive = state.activePresetId === preset.id;
                    return (
                        <button
                            key={preset.id}
                            onClick={() => handleSelect(preset)}
                            className={`
                glass-sm p-3 text-left relative
                transition-all duration-200 cursor-pointer
                ${isActive
                                    ? 'ring-2 ring-accent-blue/60 bg-accent-blue/10'
                                    : 'hover:bg-surface-hover'
                                }
              `}
                            id={`preset-${preset.id}`}
                        >
                            {/* カスタムプリセットの削除ボタン */}
                            {!preset.builtIn && (
                                <span
                                    onClick={(e) => handleDelete(e, preset.id)}
                                    style={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: 'var(--bg-muted, rgba(255,255,255,0.1))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 11,
                                        lineHeight: 1,
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s, color 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.25)';
                                        (e.currentTarget as HTMLElement).style.color = '#ef4444';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted, rgba(255,255,255,0.1))';
                                        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                                    }}
                                    aria-label="削除"
                                >✕</span>
                            )}
                            <div className={`text-sm font-medium ${isActive ? 'text-accent-blue' : 'text-text-primary'}`}>
                                {preset.name}
                            </div>
                            <div className="text-xs text-text-muted mt-1 line-clamp-2">
                                {preset.description}
                            </div>
                        </button>
                    );
                })}

                {/* カスタム状態の表示 */}
                {state.activePresetId === null && (
                    <div className="glass-sm p-3 text-left ring-2 ring-accent-purple/60 bg-accent-purple/10">
                        <div className="text-sm font-medium text-accent-purple">カスタム</div>
                        <div className="text-xs text-text-muted mt-1">手動で調整中の設定</div>
                    </div>
                )}
            </div>
        </div>
    );
}
