import { useRef, useCallback } from 'react';

interface HorizontalSliderProps {
    value: number;           // 0.0 ~ 1.0
    onChange: (v: number) => void;
    color: string;
    label: string;
    icon?: React.ReactNode;
    showValue?: boolean;
}

export function HorizontalSlider({ value, onChange, color, label, icon, showValue = true }: HorizontalSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    const getValueFromX = useCallback((clientX: number): number => {
        const track = trackRef.current;
        if (!track) return value;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return ratio;
    }, [value]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(getValueFromX(e.clientX));
    }, [onChange, getValueFromX]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (e.buttons === 0) return;
        onChange(getValueFromX(e.clientX));
    }, [onChange, getValueFromX]);

    const fillPercent = value * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon && <div style={{ color: color }}>{icon}</div>}
                    <div style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        fontFamily: 'Inter',
                        letterSpacing: 0.2,
                    }}>
                        {label}
                    </div>
                </div>
                {showValue && (
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        fontFamily: 'Inter',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {Math.round(value * 100)}%
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
                        transition: 'width 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    }} />
                </div>

                {/* つまみ */}
                <div style={{
                    position: 'absolute',
                    left: `calc(${fillPercent}% - 14px)`,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--bg-card)',
                    border: `2px solid ${color}`,
                    boxShadow: `0 2px 8px ${color}30`,
                    zIndex: 1,
                    transition: 'left 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
                }} />
            </div>
        </div>
    );
}
