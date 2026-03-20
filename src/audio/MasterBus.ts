/**
 * マスターバス
 * 最終出力段: コンプレッサー → マスターゲイン → アナライザー → 出力
 */
export class MasterBus {
    private compressor: DynamicsCompressorNode;
    private masterGain: GainNode;
    private analyser: AnalyserNode;
    readonly input: DynamicsCompressorNode;
    readonly output: GainNode;

    constructor(ctx: AudioContext) {
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -6;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.7;

        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

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
        const param = this.masterGain.gain;
        
        if (typeof param.cancelScheduledValues === 'function') {
            param.cancelScheduledValues(now);
        }
        if (typeof param.setTargetAtTime === 'function') {
            param.setTargetAtTime(clamped, now, 0.05);
        } else {
            param.value = clamped;
        }
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
