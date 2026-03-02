import { useId } from 'react';

interface AnalogSliderProps {
    label: string;
    rightLabel?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    colorLeft?: string;
    colorRight?: string;
    valueDisplay?: string;
}

/**
 * カスタムアナログスライダー
 * 洗練されたスタジオ機材のようなルック＆フィール。
 */
export function AnalogSlider({
    label,
    rightLabel,
    value,
    min,
    max,
    step = 0.01,
    onChange,
    colorLeft = '#ec4899', // pink-500
    colorRight = '#d97706', // amber-600
    valueDisplay
}: AnalogSliderProps) {
    const id = useId();

    // 現在位置の割合 (0 ~ 1)
    const ratio = (value - min) / (max - min);

    return (
        <div className="w-full relative group">
            {/* ラベル */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold tracking-widest uppercase text-text-muted">
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    {rightLabel && (
                        <span className="text-xs font-bold tracking-widest uppercase text-text-muted">
                            {rightLabel}
                        </span>
                    )}
                    {valueDisplay && (
                        <span className="text-xs text-text-muted tabular-nums ml-2">
                            {valueDisplay}
                        </span>
                    )}
                </div>
            </div>

            {/* スライダー本体 */}
            <div className="relative h-1.5 bg-surface-border rounded-full flex items-center">
                {/* 塗りつぶし部分（グラデーション） */}
                <div
                    className="absolute h-full rounded-full"
                    style={{
                        width: `${ratio * 100}%`,
                        background: `linear-gradient(90deg, ${colorLeft}, ${colorRight})`,
                    }}
                />

                {/* ネイティブinput */}
                <input
                    type="range"
                    id={id}
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none touch-none"
                // touch-none はモバイルでのスクロール干渉を防ぐ
                />

                {/* カスタムThumb (つまみ) */}
                <div
                    className="absolute w-5 h-5 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none transition-transform group-active:scale-110"
                    style={{
                        left: `${ratio * 100}%`,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="absolute inset-1 rounded-full bg-slate-100 shadow-inner" />
                </div>
            </div>
        </div>
    );
}
