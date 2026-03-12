class KeepAliveProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = 48000; // 便宜上のデフォルト値 (process内で上書きされる)
        this.frameCount = 0;
        this.lastPingTime = 0;
        // 10秒ごとにPingを送信する
        this.pingIntervalSeconds = 10;
        
        this.port.onmessage = (event) => {
            if (event.data.type === 'setSampleRate') {
                this.sampleRate = event.data.sampleRate;
            } else if (event.data.type === 'setInterval') {
                this.pingIntervalSeconds = event.data.interval;
            }
        };
    }

    process(inputs, outputs, parameters) {
        // 音声処理は行わない（無音を出力する、または何もしない）
        // 経過フレーム数をカウントする
        // ※ inputs/outputsの最初のチャンネル配列長を使ってカウントする
        
        let bufferSize = 128; // Web Audio APIのデフォルトブロックサイズ
        if (outputs.length > 0 && outputs[0].length > 0) {
            bufferSize = outputs[0][0].length;
        }

        this.frameCount += bufferSize;

        // sampleRateと経過フレーム数から秒数を計算
        const currentTime = this.frameCount / this.sampleRate;

        // 直近のPing送信から設定間隔（秒）が経過していればPingを送信
        if (currentTime - this.lastPingTime >= this.pingIntervalSeconds) {
            this.port.postMessage({ type: 'ping', time: currentTime });
            this.lastPingTime = currentTime;
        }

        // 常にtrueを返してプロセッサを生存させ続ける
        return true;
    }
}

registerProcessor('keep-alive-processor', KeepAliveProcessor);
