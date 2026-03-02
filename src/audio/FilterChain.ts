/**
 * EQフィルタチェーン
 * 足音マスキングに特化したイコライザー処理を構築する。
 * - ローシェルフフィルタ (125Hz): 低域ブースト
 * - ピーキングフィルタ (63Hz): 足音ピーク帯域の選択的ブースト
 * - ローパスフィルタ (300~2000Hz可変): 高音域カット
 */
export class FilterChain {
    private lowShelf: BiquadFilterNode;
    private peaking: BiquadFilterNode;
    private lowpass: BiquadFilterNode;
    readonly input: BiquadFilterNode;
    readonly output: BiquadFilterNode;

    constructor(ctx: AudioContext) {
        // ローシェルフ: 125Hz以下をブースト
        this.lowShelf = ctx.createBiquadFilter();
        this.lowShelf.type = 'lowshelf';
        this.lowShelf.frequency.value = 125;
        this.lowShelf.gain.value = 6; // デフォルト+6dB

        // ピーキング: 63Hz帯を選択的にブースト（足音のピーク帯域）
        this.peaking = ctx.createBiquadFilter();
        this.peaking.type = 'peaking';
        this.peaking.frequency.value = 63;
        this.peaking.Q.value = 1.5;
        this.peaking.gain.value = 4; // デフォルト+4dB

        // ローパス: 高音域カット（マスキングに不要な帯域を除去）
        this.lowpass = ctx.createBiquadFilter();
        this.lowpass.type = 'lowpass';
        this.lowpass.frequency.value = 800; // デフォルト800Hz
        this.lowpass.Q.value = 0.707; // バターワース特性

        // チェーン接続: lowShelf → peaking → lowpass
        this.lowShelf.connect(this.peaking);
        this.peaking.connect(this.lowpass);

        this.input = this.lowShelf;
        this.output = this.lowpass;
    }

    /** パラメータの急変によるポップノイズを防ぎつつ安全に変更する内部メソッド */
    private safeSetParam(param: AudioParam, targetValue: number, now: number): void {
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.setTargetAtTime(targetValue, now, 0.05); // 50msの時定数で滑らかに移行
    }

    /** ローシェルフゲインを設定 (dB) */
    setLowShelfGain(gain: number): void {
        this.safeSetParam(this.lowShelf.gain, gain, this.lowShelf.context.currentTime);
    }

    /** ピーキングフィルタゲインを設定 (dB) */
    setPeakGain(gain: number): void {
        this.safeSetParam(this.peaking.gain, gain, this.peaking.context.currentTime);
    }

    /** ローパスカットオフ周波数を設定 (Hz) */
    setLowpassFrequency(freq: number): void {
        this.safeSetParam(this.lowpass.frequency, freq, this.lowpass.context.currentTime);
    }

    /** 全パラメータを一括設定 */
    setAll(lowShelfGain: number, peakGain: number, lowpassFreq: number): void {
        this.setLowShelfGain(lowShelfGain);
        this.setPeakGain(peakGain);
        this.setLowpassFrequency(lowpassFreq);
    }

    /** リソース解放 */
    dispose(): void {
        this.lowShelf.disconnect();
        this.peaking.disconnect();
        this.lowpass.disconnect();
    }
}
