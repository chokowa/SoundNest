/**
 * ホワイトノイズ AudioWorklet プロセッサ
 * 全帯域で均一なランダムノイズを生成する。
 */
class WhiteNoiseProcessor extends AudioWorkletProcessor {
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
                // -1 ～ +1 の一様分布乱数
                channelData[i] = (Math.random() * 2 - 1) * gain;
            }
        }

        return true; // プロセッサを維持
    }
}

registerProcessor('white-noise-processor', WhiteNoiseProcessor);
