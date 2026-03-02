/**
 * ハーモニックエキサイター（仮想低音 / ミッシング・ファンダメンタル処理）
 *
 * 小型スピーカーでは物理的に再生困難な50-65Hz帯の重低音に対し、
 * その倍音（100, 130, 150, 195Hz）をソフトサチュレーションで生成・強調することで、
 * 脳に「低音が鳴っている」と錯覚させる心理音響テクニックを実装。
 *
 * シグナルフロー:
 *   input → [dry] ──────────────────┐
 *         → [bandpass] → [waveshaper] → [boost EQ] → [wet] → mixer → output
 */
export class HarmonicExciter {
    private ctx: AudioContext;
    private inputGain: GainNode;
    private dryGain: GainNode;
    private wetGain: GainNode;
    private bandpass: BiquadFilterNode;
    private waveshaper: WaveShaperNode;
    private boostEQ: BiquadFilterNode;
    private outputGain: GainNode;
    private _enabled: boolean = true;
    private _mix: number = 0.3;

    readonly input: GainNode;
    readonly output: GainNode;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;

        // 入出力ノード
        this.inputGain = ctx.createGain();
        this.outputGain = ctx.createGain();

        // ドライパス
        this.dryGain = ctx.createGain();
        this.dryGain.gain.value = 1 - this._mix;

        // ウェットパス
        this.wetGain = ctx.createGain();
        this.wetGain.gain.value = this._mix;

        // バンドパスフィルタ: 処理対象帯域を制限 (40-200Hz)
        this.bandpass = ctx.createBiquadFilter();
        this.bandpass.type = 'bandpass';
        this.bandpass.frequency.value = 100;
        this.bandpass.Q.value = 0.8;

        // ウェーブシェイパー: ソフトサチュレーションで倍音を生成
        this.waveshaper = ctx.createWaveShaper();
        // @ts-expect-error Float32Arrayの型バージョンの差異を無視
        this.waveshaper.curve = this.createSaturationCurve(400);
        this.waveshaper.oversample = '4x';

        // ブーストEQ: 生成された倍音帯域(100-200Hz)を強調
        this.boostEQ = ctx.createBiquadFilter();
        this.boostEQ.type = 'peaking';
        this.boostEQ.frequency.value = 150;
        this.boostEQ.Q.value = 1.0;
        this.boostEQ.gain.value = 6;

        // 接続: input → dry → output
        this.inputGain.connect(this.dryGain);
        this.dryGain.connect(this.outputGain);

        // 接続: input → bandpass → waveshaper → boostEQ → wet → output
        this.inputGain.connect(this.bandpass);
        this.bandpass.connect(this.waveshaper);
        this.waveshaper.connect(this.boostEQ);
        this.boostEQ.connect(this.wetGain);
        this.wetGain.connect(this.outputGain);

        this.input = this.inputGain;
        this.output = this.outputGain;
    }

    /**
     * ソフトサチュレーションカーブを生成
     * tanh関数ベースで、穏やかな歪みによる偶数・奇数倍音の両方を生成
     */
    private createSaturationCurve(samples: number): Float32Array {
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            // ソフトクリッピング（3次多項式近似）
            curve[i] = ((3 + 20) * x * 20 * deg) / (Math.PI + 20 * Math.abs(x));
        }
        // tsの型推論とWebAudioの型定義におけるArrayBuffer関連のバージョンの不一致を回避
        return curve as unknown as Float32Array;
    }

    /** パラメータの急変によるポップノイズを防ぎつつ安全に変更する内部メソッド */
    private safeSetParam(param: AudioParam, targetValue: number, now: number): void {
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.setTargetAtTime(targetValue, now, 0.05);
    }

    /** dry/wet ミックス比を設定 (0.0=dry, 1.0=wet) */
    setMix(mix: number): void {
        this._mix = Math.max(0, Math.min(1, mix));
        const now = this.ctx.currentTime;
        if (this._enabled) {
            this.safeSetParam(this.dryGain.gain, 1 - this._mix, now);
            this.safeSetParam(this.wetGain.gain, this._mix, now);
        }
    }

    /** 有効/無効の切替 */
    setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        const now = this.ctx.currentTime;
        if (enabled) {
            this.safeSetParam(this.dryGain.gain, 1 - this._mix, now);
            this.safeSetParam(this.wetGain.gain, this._mix, now);
        } else {
            // 無効時: ドライ100%、ウェット0%（バイパス）
            this.safeSetParam(this.dryGain.gain, 1, now);
            this.safeSetParam(this.wetGain.gain, 0, now);
        }
    }

    get enabled(): boolean {
        return this._enabled;
    }

    get mix(): number {
        return this._mix;
    }

    /** リソース解放 */
    dispose(): void {
        this.inputGain.disconnect();
        this.dryGain.disconnect();
        this.wetGain.disconnect();
        this.bandpass.disconnect();
        this.waveshaper.disconnect();
        this.boostEQ.disconnect();
        this.outputGain.disconnect();
    }
}
