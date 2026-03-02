/**
 * サブバス AudioWorklet プロセッサ
 * ブラウンノイズをより強いリーキーインテグレーターで二重平滑化することで、
 * 20-80Hz のサブバス帯域特性を生成する。
 * 床・壁を通じた重低音（足音の一次衝撃成分）のマスキングに最適。
 */
class SubBassProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 二段のリーキーインテグレーター状態
        this._last1 = 0;
        this._last2 = 0;
    }

    static get parameterDescriptors() {
        return [
            { name: 'gain', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
        ];
    }

    process(_inputs, outputs, parameters) {
        const output = outputs[0];
        const gain = parameters.gain[0];

        for (let channel = 0; channel < output.length; channel++) {
            const channelData = output[channel];
            for (let i = 0; i < channelData.length; i++) {
                const white = Math.random() * 2 - 1;

                // 一段目: ブラウンノイズ相当
                this._last1 = (this._last1 + (0.02 * white)) / 1.02;

                // 二段目: さらに平滑化してサブバス帯域に絞り込む
                // 係数を小さく（0.005）することでより低域成分のみを残す
                this._last2 = (this._last2 + (0.005 * this._last1)) / 1.005;

                // ゲイン正規化（二重平滑で振幅が非常に小さくなるため12倍で補正）
                channelData[i] = this._last2 * 12 * gain;
            }
        }

        return true;
    }
}

registerProcessor('sub-bass-processor', SubBassProcessor);
