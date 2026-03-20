/**
 * EQフィルタチェーン
 * 足音マスキングに特化したイコライザー処理を構築する。
 */
export class FilterChain {
    private lowShelf: BiquadFilterNode;
    private peaking: BiquadFilterNode;
    private lowpass: BiquadFilterNode;
    readonly input: BiquadFilterNode;
    readonly output: BiquadFilterNode;

    constructor(ctx: AudioContext) {
        this.lowShelf = ctx.createBiquadFilter();
        this.lowShelf.type = 'lowshelf';
        this.lowShelf.frequency.value = 125;
        this.lowShelf.gain.value = 6;

        this.peaking = ctx.createBiquadFilter();
        this.peaking.type = 'peaking';
        this.peaking.frequency.value = 63;
        this.peaking.Q.value = 1.5;
        this.peaking.gain.value = 4;

        this.lowpass = ctx.createBiquadFilter();
        this.lowpass.type = 'lowpass';
        this.lowpass.frequency.value = 800;
        this.lowpass.Q.value = 0.707;

        this.lowShelf.connect(this.peaking);
        this.peaking.connect(this.lowpass);

        this.input = this.lowShelf;
        this.output = this.lowpass;
    }

    private safeSetParam(param: AudioParam, targetValue: number, now: number): void {
        if (typeof param.cancelScheduledValues === 'function') {
            param.cancelScheduledValues(now);
        }
        if (typeof param.setTargetAtTime === 'function') {
            param.setTargetAtTime(targetValue, now, 0.05);
        } else {
            param.value = targetValue;
        }
    }

    setLowShelfGain(gain: number): void {
        this.safeSetParam(this.lowShelf.gain, gain, this.lowShelf.context.currentTime);
    }

    setPeakGain(gain: number): void {
        this.safeSetParam(this.peaking.gain, gain, this.peaking.context.currentTime);
    }

    setLowpassFrequency(freq: number): void {
        this.safeSetParam(this.lowpass.frequency, freq, this.lowpass.context.currentTime);
    }

    setAll(lowShelfGain: number, peakGain: number, lowpassFreq: number): void {
        this.setLowShelfGain(lowShelfGain);
        this.setPeakGain(peakGain);
        this.setLowpassFrequency(lowpassFreq);
    }

    dispose(): void {
        this.lowShelf.disconnect();
        this.peaking.disconnect();
        this.lowpass.disconnect();
    }
}
