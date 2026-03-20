import { useRef, useCallback } from 'react';

interface HorizontalSliderProps {
    value: number;           // 0.0 ~ max
    onChange: (v: number) => void;
    color: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    max?: number;            // デフォルト 1.0
}

export function HorizontalSlider({ value, onChange, color, label, description, icon, max = 1.0 }: HorizontalSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    const getValueFromX = useCallback((clientX: number): number => {
        const track = trackRef.current;
        if (!track) return value;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return ratio * max;
    }, [value, max]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(getValueFromX(e.clientX));
    }, [onChange, getValueFromX]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (e.buttons === 0) return;
        onChange(getValueFromX(e.clientX));
    }, [onChange, getValueFromX]);

    const fillPercent = (value / max) * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon && <div style={{ color: color }}>{icon}</div>}
                    <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'Inter',
                        letterSpacing: 0.2,
                    }}>
                        {label}
                    </div>
                </div>
                {description && (
                    <div style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        fontFamily: 'Inter',
                        textAlign: 'right',
                    }}>
                        {description}
                    </div>
                )}
            </div>

            <div
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                style={{
                    height: 44, // タッチターゲットを確保
                    width: '100%',
                    position: 'relative',
                    cursor: 'ew-resize',
                    touchAction: 'none',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {/* トラック背景 */}
                <div style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--border-default)',
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    {/* フィル */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${fillPercent}%`,
                        background: color,
                        borderRadius: 3,
                    }} />
                </div>

                {/* つまみ */}
                <div style={{
                    position: 'absolute',
                    left: `calc(${fillPercent}% - 16px)`,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 1,
                }}>
                    {Math.round(value * 100)}
                </div>
            </div>
        </div>
    );
}
