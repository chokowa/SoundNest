/**
 * ピンクノイズ AudioWorklet プロセッサ
 * Paul Kelletアルゴリズムの応用により 1/f 特性のノイズを生成する。
 * ホワイトノイズを7つの状態変数で加重フィルタリングし、
 * 自然な周波数減衰を持つピンクノイズへ変換する。
 */
class PinkNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // Paul Kellet フィルタ用状態変数（チャンネルごと: [L[7], R[7]]）
        this._b = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0]
        ];
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
            const b = this._b[channel] || this._b[0]; 
            for (let i = 0; i < channelData.length; i++) {
                const white = Math.random() * 2 - 1;

                // Paul Kellet の近似フィルタ係数
                b[0] = 0.99886 * b[0] + white * 0.0555179;
                b[1] = 0.99332 * b[1] + white * 0.0750759;
                b[2] = 0.96900 * b[2] + white * 0.1538520;
                b[3] = 0.86650 * b[3] + white * 0.3104856;
                b[4] = 0.55000 * b[4] + white * 0.5329522;
                b[5] = -0.7616 * b[5] - white * 0.0168980;

                const pink = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362) * 0.11;
                b[6] = white * 0.115926;

                // ±1.0 クランプ (突発的ピークによる破裂音を防止)
                const sample = pink * gain;
                channelData[i] = Math.max(-1, Math.min(1, sample));
            }
        }

        return true;
    }
}

registerProcessor('pink-noise-processor', PinkNoiseProcessor);
