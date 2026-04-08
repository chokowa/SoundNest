/**
 * マスターバス
 * 最終出力段: DCブロッカー → マスターゲイン → Soft Clipper → アナライザー → 出力
 *
 * 【v1.0.3 変更】
 * DynamicsCompressorNode を削除し、WaveShaperNode による Soft Clipper に置き換え。
 * Android環境でコンプレッサーの急激なエンベロープ変化が破裂音を引き起こしていたため、
 * 波形を穏やかにサチュレーションさせるアナログ風リミッターで代替する。
 *
 * 【v1.0.4 変更】
 * Bluetoothスピーカーからの不定期な破裂音を包括的に修正。
 * - DCブロッカーを5Hz/Q=0.707 → 1Hz/Q=0.5 に緩和してリンギングを抑制
 * - setVolume に setValueAtTime デクリック処理を追加（波形不連続ジャンプの防止）
 */
export class MasterBus {
    private dcBlocker: BiquadFilterNode;
    private masterGain: GainNode;
    private softClipper: WaveShaperNode;
    private analyser: AnalyserNode;
    readonly input: AudioNode;
    readonly output: GainNode;

    constructor(ctx: AudioContext) {
        // DCブロッカー (低周波オフセットの蓄積を防ぐハイパスフィルター)
        // 周波数を1Hzまで下げることで、極低域（ブラウンノイズ・サブベース）通過時の
        // リンギング（波形の跳ね返り）を抑制し、突発的なクリップを防止する
        this.dcBlocker = ctx.createBiquadFilter();
        this.dcBlocker.type = 'highpass';
        this.dcBlocker.frequency.value = 1.0; // 1Hz未満をカット（リンギング抑制のため緩和）
        this.dcBlocker.Q.value = 0.5;         // バターワースより低いQ値でピークを抑制

        // マスターゲイン
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.7;

        // Soft Clipper (WaveShaperNode)
        // tanh カーブにより、±1.0 付近で滑らかに飽和させる
        // ハードクリップ（バリッという歪み）を防ぎ、穏やかなサチュレーション（暖かみ）に変換する
        this.softClipper = ctx.createWaveShaper();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.softClipper as any).curve = MasterBus.createSoftClipCurve(4096);
        // oversample は削除: ノイズ信号への歪みではエイリアシングが知覚不能。
        // 不要な計算負荷を排除しバッファアンダーランを軽減。

        // アナライザー
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        // ルーティング: 入力 -> DCブロッカー -> マスターゲイン -> Soft Clipper -> アナライザー -> 出力
        this.dcBlocker.connect(this.masterGain);
        this.masterGain.connect(this.softClipper);
        this.softClipper.connect(this.analyser);
        this.analyser.connect(ctx.destination);

        this.input = this.dcBlocker;
        this.output = this.masterGain;
    }

    /**
     * Soft Clip カーブを生成する (tanh ベース)
     * 入力 ±1.0 付近で穏やかに飽和し、絶対に ±1.0 を超えない出力を保証する。
     */
    private static createSoftClipCurve(samples: number): Float32Array {
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            // -1.0 ~ +1.0 の入力範囲にマッピング
            const x = (i * 2) / (samples - 1) - 1;
            // tanh によるソフトクリッピング
            // 係数 1.5 で軽めのドライブ（歪みすぎない、しかし確実にリミットする）
            curve[i] = Math.tanh(x * 1.5);
        }
        return curve;
    }

    /** マスターボリュームを設定 (0.0 ~ 1.0) */
    setVolume(volume: number): void {
        const clamped = Math.max(0, Math.min(1, volume));
        const now = this.masterGain.context.currentTime;
        const param = this.masterGain.gain;
        
        if (typeof param.cancelScheduledValues === 'function') {
            param.cancelScheduledValues(now);
        }
        // デクリック処理: 現在値を起点としてロックし、波形の不連続ジャンプを防止
        if (typeof param.setValueAtTime === 'function') {
            param.setValueAtTime(param.value, now);
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
        this.dcBlocker.disconnect();
        this.masterGain.disconnect();
        this.softClipper.disconnect();
        this.analyser.disconnect();
    }
}
