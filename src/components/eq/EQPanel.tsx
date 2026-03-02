import { useCallback, useState } from 'react';
import { useAudioEngine } from '../../audio/AudioEngineContext';

/**
 * EQ調整パネル
 * 足音マスキングに特化したEQ設定と仮想低音（ハーモニックエキサイター）の制御。
 * 折りたたみ可能な詳細設定セクション。
 */
export function EQPanel() {
    const { state, setEQ, setHarmonicExciter, setFade } = useAudioEngine();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleLowShelfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEQ({ lowShelfGain: parseFloat(e.target.value) });
    }, [setEQ]);

    const handlePeakChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEQ({ peakGain: parseFloat(e.target.value) });
    }, [setEQ]);

    const handleLowpassChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEQ({ lowpassFrequency: parseFloat(e.target.value) });
    }, [setEQ]);

    const handleExciterToggle = useCallback(() => {
        setHarmonicExciter({ enabled: !state.harmonicExciter.enabled });
    }, [state.harmonicExciter.enabled, setHarmonicExciter]);

    const handleExciterMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setHarmonicExciter({ mix: parseFloat(e.target.value) });
    }, [setHarmonicExciter]);

    const handleFadeDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFade({ duration: parseFloat(e.target.value) });
    }, [setFade]);

    return (
        <div className="glass p-5 space-y-4 animate-fade-in">
            {/* ヘッダー（折りたたみトグル） */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full text-left cursor-pointer"
                id="eq-panel-toggle"
            >
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                    サウンド調整
                </h3>
                <svg
                    className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* メインEQ（常に表示） */}
            <div className="space-y-4">
                {/* 低域ブースト */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-text-primary">低域ブースト</span>
                        <span className="text-xs text-text-muted tabular-nums">
                            {state.eq.lowShelfGain > 0 ? '+' : ''}{state.eq.lowShelfGain}dB
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-6"
                        max="12"
                        step="0.5"
                        value={state.eq.lowShelfGain}
                        onChange={handleLowShelfChange}
                        className="w-full"
                        id="eq-low-shelf"
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-0.5">
                        <span>-6dB</span>
                        <span>125Hz</span>
                        <span>+12dB</span>
                    </div>
                </div>

                {/* ハイカット */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-text-primary">ハイカット</span>
                        <span className="text-xs text-text-muted tabular-nums">
                            {state.eq.lowpassFrequency}Hz
                        </span>
                    </div>
                    <input
                        type="range"
                        min="300"
                        max="2000"
                        step="10"
                        value={state.eq.lowpassFrequency}
                        onChange={handleLowpassChange}
                        className="w-full"
                        id="eq-lowpass"
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-0.5">
                        <span>300Hz</span>
                        <span>カットオフ</span>
                        <span>2000Hz</span>
                    </div>
                </div>
            </div>

            {/* 折りたたみ詳細設定 */}
            {isExpanded && (
                <div className="space-y-4 pt-2 border-t border-surface-border animate-fade-in">
                    {/* 足音ピークブースト (63Hz) */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-text-primary">足音帯域ブースト</span>
                            <span className="text-xs text-text-muted tabular-nums">
                                {state.eq.peakGain > 0 ? '+' : ''}{state.eq.peakGain}dB
                            </span>
                        </div>
                        <input
                            type="range"
                            min="-6"
                            max="12"
                            step="0.5"
                            value={state.eq.peakGain}
                            onChange={handlePeakChange}
                            className="w-full"
                            id="eq-peak"
                        />
                        <div className="flex justify-between text-xs text-text-muted mt-0.5">
                            <span>-6dB</span>
                            <span>63Hz</span>
                            <span>+12dB</span>
                        </div>
                    </div>

                    {/* 仮想低音（ハーモニックエキサイター） */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-primary">仮想低音</span>
                            <button
                                onClick={handleExciterToggle}
                                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer
                  ${state.harmonicExciter.enabled ? 'bg-accent-blue' : 'bg-slate-600'}
                `}
                                id="exciter-toggle"
                                role="switch"
                                aria-checked={state.harmonicExciter.enabled}
                            >
                                <span
                                    className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                    ${state.harmonicExciter.enabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                                />
                            </button>
                        </div>
                        <p className="text-xs text-text-muted">
                            小型スピーカー向け。倍音付加で低音の存在感を補強します。
                        </p>

                        {state.harmonicExciter.enabled && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-text-secondary">エフェクト強度</span>
                                    <span className="text-xs text-text-muted tabular-nums">
                                        {Math.round(state.harmonicExciter.mix * 100)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={state.harmonicExciter.mix}
                                    onChange={handleExciterMixChange}
                                    className="w-full"
                                    id="exciter-mix"
                                />
                            </div>
                        )}
                    </div>

                    {/* フェード設定 */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-text-primary">フェード時間</span>
                            <span className="text-xs text-text-muted tabular-nums">
                                {state.fade.duration}秒
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="15"
                            step="1"
                            value={state.fade.duration}
                            onChange={handleFadeDurationChange}
                            className="w-full"
                            id="fade-duration"
                        />
                        <div className="flex justify-between text-xs text-text-muted mt-0.5">
                            <span>1秒</span>
                            <span>フェードイン/アウト</span>
                            <span>15秒</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
