import { useCallback } from 'react';
import { useAudioEngine } from '../../audio/AudioEngineContext';

interface NoiseSliderProps {
    type: 'brown' | 'pink';
    label: string;
    color: string;
    icon: string;
}

/**
 * ノイズブレンドスライダー（個別チャンネル）
 */
function NoiseSlider({ type, label, color, icon }: NoiseSliderProps) {
    const { state, setBlend } = useAudioEngine();
    const value = state.blend[type];

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setBlend({ [type]: parseFloat(e.target.value) });
    }, [type, setBlend]);

    return (
        <div className="flex items-center gap-3">
            {/* アイコン */}
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: `${color}20`, color }}
            >
                {icon}
            </div>

            {/* ラベル + スライダー */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                    <span className="text-xs text-text-muted tabular-nums">
                        {Math.round(value * 100)}%
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={handleChange}
                    className="w-full"
                    style={{
                        // トラック色を動的に設定
                        // @ts-expect-error CSS変数への代入
                        '--slider-color': color,
                    }}
                    id={`noise-slider-${type}`}
                />
            </div>
        </div>
    );
}

/**
 * ミキサーパネル
 * 3つのノイズチャンネル（ブラウン/ピンク/ホワイト）のブレンド比率を調整する。
 */
export function MixerPanel() {
    const { state, setMaster } = useAudioEngine();

    const handleMasterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMaster({ volume: parseFloat(e.target.value) });
    }, [setMaster]);

    return (
        <div className="glass p-5 space-y-5 animate-fade-in">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                ノイズミキサー
            </h3>

            {/* 各ノイズチャンネル */}
            <div className="space-y-4">
                <NoiseSlider
                    type="brown"
                    label="ブラウンノイズ"
                    color="#d97706"
                    icon="🌊"
                />
                <NoiseSlider
                    type="pink"
                    label="ピンクノイズ"
                    color="#ec4899"
                    icon="🌸"
                />
            </div>

            {/* 区切り線 */}
            <div className="border-t border-surface-border" />

            {/* マスターボリューム */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 bg-accent-blue/10 text-accent-blue">
                    🔊
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-text-primary">マスターボリューム</span>
                        <span className="text-xs text-text-muted tabular-nums">
                            {Math.round(state.master.volume * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={state.master.volume}
                        onChange={handleMasterChange}
                        className="w-full"
                        id="master-volume-slider"
                    />
                </div>
            </div>
        </div>
    );
}
