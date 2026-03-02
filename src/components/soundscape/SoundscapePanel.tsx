import { useCallback, useRef } from 'react';
import { useAudioEngine } from '../../audio/AudioEngineContext';

/**
 * サウンドスケープパネル
 * ローカルファイルから自然音を読み込んでレイヤーとして重ねる機能。
 * ドラッグ&ドロップまたはファイル選択ダイアログで音源を追加。
 */
export function SoundscapePanel() {
    const { state, addSoundscapeFromFile, removeSoundscape, updateSoundscape } = useAudioEngine();
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** ファイル選択ダイアログを開く */
    const handleAddClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    /** ファイルが選択された時の処理 */
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
            addSoundscapeFromFile(files[i]);
        }
        // 同じファイルを再度選択可能にする
        e.target.value = '';
    }, [addSoundscapeFromFile]);

    /** ドラッグ&ドロップ処理 */
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('audio/')) {
                addSoundscapeFromFile(files[i]);
            }
        }
    }, [addSoundscapeFromFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    return (
        <div className="glass p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                サウンドスケープ
            </h3>

            {/* 追加済みレイヤー一覧 */}
            {state.soundscapeLayers.length > 0 && (
                <div className="space-y-2">
                    {state.soundscapeLayers.map((layer) => (
                        <div key={layer.id} className="glass-sm p-3 flex items-center gap-3">
                            {/* 名前 */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-text-primary truncate">{layer.name}</div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={layer.volume}
                                    onChange={(e) => updateSoundscape(layer.id, { volume: parseFloat(e.target.value) })}
                                    className="w-full mt-1"
                                />
                            </div>

                            {/* 音量表示 */}
                            <span className="text-xs text-text-muted tabular-nums shrink-0">
                                {Math.round(layer.volume * 100)}%
                            </span>

                            {/* 削除ボタン */}
                            <button
                                onClick={() => removeSoundscape(layer.id)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer shrink-0"
                                aria-label={`${layer.name}を削除`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ファイル追加エリア */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-surface-border rounded-xl p-6 text-center hover:border-accent-blue/40 transition-colors cursor-pointer"
                onClick={handleAddClick}
            >
                <div className="text-2xl mb-2">🎵</div>
                <p className="text-sm text-text-secondary">
                    音声ファイルをドロップ
                </p>
                <p className="text-xs text-text-muted mt-1">
                    またはクリックして選択
                </p>
            </div>

            {/* 隠しファイル入力 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="soundscape-file-input"
            />

            {state.soundscapeLayers.length === 0 && (
                <p className="text-xs text-text-muted text-center">
                    雨音、川のせせらぎなどの自然音ファイルを追加すると、ノイズと重ねて再生できます。
                </p>
            )}
        </div>
    );
}
