/**
 * リバーブプロセッサ
 * シンプルなフィードバック・ディレイ・ネットワーク（FDN）風のリバーブにより、
 * 「マット（ドライ）」から「ウェット（残響）」の質感を生成する。
 */
export class ReverbProcessor {
    private ctx: AudioContext;
    private dryGain: GainNode;
    private wetGain: GainNode;
    private convolver: ConvolverNode;
    private stereoWidener: StereoPannerNode;
    private filter: BiquadFilterNode; // 距離による高域減衰用
    private dryFilter: BiquadFilterNode; // ドライ音の距離感用

    readonly input: GainNode;
    readonly output: GainNode;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;

        // 入出力ノード
        this.input = ctx.createGain();
        this.output = ctx.createGain();

        // ドライ/ウェット分離
        this.dryGain = ctx.createGain();
        this.wetGain = ctx.createGain();

        // フィルター設定 (距離による吸収)
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 20000;
        this.filter.Q.value = 0.5;

        this.dryFilter = ctx.createBiquadFilter();
        this.dryFilter.type = 'lowpass';
        this.dryFilter.frequency.value = 20000;

        // ステレオ・パナー
        this.stereoWidener = ctx.createStereoPanner();

        // リバーブ生成
        this.convolver = ctx.createConvolver();
        this.convolver.buffer = this.createImpulseResponse(2.5, 3.0); 

        // 接続フロー
        // [input] --+--> [dryFilter] --> [dryGain] ----------------------> [output]
        //           |                                                     ^
        //           +--> [wetGain] --> [filter] --> [convolver] --> [widener] --+
        this.input.connect(this.dryFilter);
        this.dryFilter.connect(this.dryGain);
        this.dryGain.connect(this.output);

        this.input.connect(this.wetGain);
        this.wetGain.connect(this.filter);
        this.filter.connect(this.convolver);
        this.convolver.connect(this.stereoWidener);
        this.stereoWidener.connect(this.output);

        // 初期値
        this.setDepth(0); // デフォルトはマット（ドライ）
    }

    /** 
     * 空間深度（0.0 ～ 1.0）を設定
     * 0.0: マット（ドライ、センター定位寄り）
     * 1.0: ウェット（リバーブ最大、ステレオ幅最大）
     */
    setDepth(depth: number): void {
        const clamped = Math.max(0, Math.min(1, depth));
        const now = this.ctx.currentTime;
        const rampTime = 0.2;

        // 1. ドライ/ウェット比率 (Equal Power Crossfade)
        // 範囲を 0.5 * PI に広げ、ウェット100%時にウェット信号をフルに抽出する
        this.dryGain.gain.setTargetAtTime(Math.cos(clamped * Math.PI * 0.5), now, rampTime); 
        // ウェット側は空間の広がりによるエネルギー分散を考慮し、少し強めにブースト (1.2倍)
        this.wetGain.gain.setTargetAtTime(Math.sin(clamped * Math.PI * 0.5) * 1.2, now, rampTime);

        // 2. 距離による高域減衰 (LPF)
        const filterFreq = 20000 * Math.pow(0.15, clamped);
        this.filter.frequency.setTargetAtTime(filterFreq, now, rampTime);
        
        // LPFによるエネルギー損失を補正（高域が削られるほどゲインを上げる）
        // 3kHz付近まで落ちた時に約1.4倍程度になるように調整
        const filterCompensation = 1.0 + (1.0 - (filterFreq / 20000)) * 0.4;
        this.wetGain.gain.setTargetAtTime(Math.sin(clamped * Math.PI * 0.5) * 1.2 * filterCompensation, now, rampTime);
        
        // ドライ音もわずかに高域を落として距離感を出す (20kHz -> 8kHz)
        const dryFilterFreq = 20000 * Math.pow(0.4, clamped);
        this.dryFilter.frequency.setTargetAtTime(dryFilterFreq, now, rampTime);

        // 3. ステレオ幅
        // ※ 本来はドライ音自体のステレオ幅を弄る必要があるが、
        // ここではリバーブ成分の広がりとして強調する
        this.stereoWidener.pan.setTargetAtTime(0, now, rampTime); // 常にセンター保持（広がりはIRに依存）
    }

    /** 
     * シンプルな無響室リバーブ用のインパルス応答を作成 
     */
    private createImpulseResponse(duration: number, decayRate: number): AudioBuffer {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.ctx.createBuffer(2, length, sampleRate);
        
        let lastL = 0;
        let lastR = 0;

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // 1. ベースとなるノイズ (ステレオ独立)
                let noise = (Math.random() * 2 - 1);
                
                // 2. 指数関数的な減衰
                let decay = Math.pow(1 - i / length, decayRate);
                
                // 3. サウンドマスキング由来のエッセンス: シンプルなローパス（平滑化）による「温かみ」
                // y[i] = x[i] * 0.3 + y[i-1] * 0.7 
                // 比率を0.7に上げることで、よりしっとりとした質感にする
                if (channel === 0) {
                    noise = noise * 0.3 + lastL * 0.7;
                    lastL = noise;
                } else {
                    noise = noise * 0.3 + lastR * 0.7;
                    lastR = noise;
                }

                // 4. 初期反射の密度をさらに上げる (50ms付近までのエネルギーを強化)
                if (i < sampleRate * 0.05) {
                    const earlyBoost = (Math.random() * 2 - 1) * 0.3 * (1 - i / (sampleRate * 0.05));
                    noise += earlyBoost;
                }

                data[i] = noise * decay * 1.8; // さらなる濃密さのためにゲインを強化 (1.5 -> 1.8)
            }
        }
        return buffer;
    }

    dispose(): void {
        this.input.disconnect();
        this.dryFilter.disconnect();
        this.dryGain.disconnect();
        this.wetGain.disconnect();
        this.filter.disconnect();
        this.convolver.disconnect();
        this.stereoWidener.disconnect();
        this.output.disconnect();
    }
}
