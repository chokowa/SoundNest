/**
 * マスターバス
 * 最終出力段: コンプレッサー → マスターゲイン → アナライザー → 出力
 *
 * DynamicsCompressorNode で低音域のピーク制限を行い、
 * 音割れ（クリッピング）を防止する。
 */
export class MasterBus {
    private compressor: DynamicsCompressorNode;
    private masterGain: GainNode;
    private analyser: AnalyserNode;
    readonly input: DynamicsCompressorNode;
    readonly output: GainNode;

    constructor(ctx: AudioContext) {
        // コンプレッサー: 低音ブースト時の音割れ防止
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -6;   // -6dBで発動開始
        this.compressor.knee.value = 12;        // ソフトニー
        this.compressor.ratio.value = 12;       // 強めの圧縮比
        this.compressor.attack.value = 0.003;   // 3ms (速い応答で瞬間ピークを捕捉)
        this.compressor.release.value = 0.25;   // 250ms (自然な回復)

        // マスターゲイン
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.7; // デフォルト70%

        // アナライザー: UIのレベルメーター用
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        // チェーン: compressor → masterGain → analyser → destination
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(ctx.destination);

        this.input = this.compressor;
        this.output = this.masterGain;
    }

    /** マスターボリュームを設定 (0.0 ~ 1.0) */
    setVolume(volume: number): void {
        const clamped = Math.max(0, Math.min(1, volume));
        const now = this.masterGain.context.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.setTargetAtTime(clamped, now, 0.05);
    }

    /** 現在のレベルメーターデータを取得 */
    getLevelData(): Float32Array {
        const data = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatTimeDomainData(data);
        return data;
    }

    /** RMSレベルを取得 (0.0 ~ 1.0) */
    getRMSLevel(): number {
        const data = this.getLevelData();
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
    }

    /** 周波数データを取得（スペクトラム表示用） */
    getFrequencyData(): Uint8Array {
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        return data;
    }

    /** リソース解放 */
    dispose(): void {
        this.compressor.disconnect();
        this.masterGain.disconnect();
        this.analyser.disconnect();
    }
}
