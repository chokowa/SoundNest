/**
 * サブバス AudioWorklet プロセッサ
 * ブラウンノイズをより強いリーキーインテグレーターで二重平滑化することで、
 * 20-80Hz のサブバス帯域特性を生成する。
 * 床・壁を通じた重低音（足音の一次衝撃成分）のマスキングに最適。
 */
class SubBassProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 二段のリーキーインテグレーター状態（チャンネルごと）
        this._last1 = [0, 0];
        this._last2 = [0, 0];
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
            let last1 = this._last1[channel] || 0;
            let last2 = this._last2[channel] || 0;
            for (let i = 0; i < channelData.length; i++) {
                const white = Math.random() * 2 - 1;

                // 一段目: ブラウンノイズ相当
                last1 = (last1 + (0.02 * white)) / 1.02;

                // 二段目: さらに平滑化してサブバス帯域に絞り込む
                last2 = (last2 + (0.005 * last1)) / 1.005;

                // NaN/Infinity 防御 (状態変数が壊れた場合のフェイルセーフ)
                if (!Number.isFinite(last1)) last1 = 0;
                if (!Number.isFinite(last2)) last2 = 0;

                // ゲイン正規化 + ±1.0 クランプ (突発的ピークによる破裂音を防止)
                const sample = last2 * 12 * gain;
                channelData[i] = Math.max(-1, Math.min(1, sample));
            }
            this._last1[channel] = last1;
            this._last2[channel] = last2;
        }

        return true;
    }
}

registerProcessor('sub-bass-processor', SubBassProcessor);
