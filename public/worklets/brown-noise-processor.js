/**
 * ブラウンノイズ AudioWorklet プロセッサ
 * ホワイトノイズの累積合算（ランダムウォーク）にリーキーインテグレーターを適用し、
 * 1/f² 特性の深い低域ノイズを生成する。
 * 足音（重量床衝撃音: 40-150Hz）のマスキングに最も適したノイズタイプ。
 */
class BrownNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 前サンプルの値（リーキーインテグレーター状態）
        this._lastOut = 0;
    }

    static get parameterDescriptors() {
        return [
            { name: 'gain', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
        ];
    }

    process(_inputs, outputs, parameters) {
        const output = outputs[0];
        const gain = parameters.gain[0];

        for (let channel = 0; channel < output.length; channel++) {
            const channelData = output[channel];
            for (let i = 0; i < channelData.length; i++) {
                const white = Math.random() * 2 - 1;

                // リーキーインテグレーター: 前回値の0.99倍 + 新規ホワイトノイズの0.01倍
                // これにより低周波が支配的な1/f²特性を実現
                // 係数0.02はステップサイズ。小さいほど低域が強く高域が弱くなる
                this._lastOut = (this._lastOut + (0.02 * white)) / 1.02;

                // ゲイン正規化（ブラウンノイズの振幅は小さくなるため3.5倍してレベルを合わせる）
                channelData[i] = this._lastOut * 3.5 * gain;
            }
        }

        return true;
    }
}

registerProcessor('brown-noise-processor', BrownNoiseProcessor);
