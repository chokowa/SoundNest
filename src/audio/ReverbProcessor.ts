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

        // ステレオ・パナー（マット側でモノラルに寄せるため）
        this.stereoWidener = ctx.createStereoPanner();

        // リバーブ生成（インパルス応答の生成）
        this.convolver = ctx.createConvolver();
        this.convolver.buffer = this.createImpulseResponse(2.0, 2.0); // 2秒の残響

        // 接続
        // [input] --> [dryGain] ------------------------> [output]
        //        |                                         ^
        //        +--> [wetGain] --> [convolver] --> [stereoWidener] --+
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        this.input.connect(this.wetGain);
        this.wetGain.connect(this.convolver);
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

        // ドライ/ウェット比率 (等電力カーブ)
        // ウェット側になるほどリバーブが増え、ドライがわずかに減る
        this.dryGain.gain.setTargetAtTime(Math.cos(clamped * Math.PI * 0.2), now, 0.1); 
        this.wetGain.gain.setTargetAtTime(clamped * 0.6, now, 0.1); // リバーブ成分は最大60%程度

        // ステレオ幅（マット側ではパンを中央に寄せてモノラル感を出す）
        // スライダーが 0.0 の時はステレオ幅を狭め(0)、1.0 の時はリバーブの広がりを維持する
        // ※ StereoPannerNode の pan は -1(L) ～ 1(R) なので、
        // 実際には左右チャンネルの独立性を保つために、このノードよりも前の
        // ドライ音とウェット音のバランスで広がりを制御するのが一般的です。
        // ここでは、リバーブ成分（Wet）のステレオ定位は中央固定とし、
        // ドライ音のステレオ感（Worklet側）との対比で「広がり」を演出します。
        // （特に追加のpan操作は不要ですが、将来的な拡張用にコメントを残します）
    }

    /** 
     * シンプルな無響室リバーブ用のインパルス応答を作成 
     */
    private createImpulseResponse(duration: number, decay: number): AudioBuffer {
        const length = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // ホワイトノイズに指数関数的な減衰をかける
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        return buffer;
    }

    dispose(): void {
        this.input.disconnect();
        this.dryGain.disconnect();
        this.wetGain.disconnect();
        this.convolver.disconnect();
        this.stereoWidener.disconnect();
        this.output.disconnect();
    }
}
