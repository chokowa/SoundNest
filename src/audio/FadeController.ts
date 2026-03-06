/**
 * フェードコントローラ
 * 再生開始・停止時にフェードイン/アウトを適用し、
 * 急激な音量変化による驚愕反応を防止する。
 */
export class FadeController {
    private ctx: AudioContext;
    private gainNode: GainNode;
    private _duration: number = 5; // デフォルト5秒
    readonly input: GainNode;
    readonly output: GainNode;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0; // 初期状態はミュート

        this.input = this.gainNode;
        this.output = this.gainNode;
    }

    /** フェード時間を設定（秒。1〜15） */
    setDuration(seconds: number): void {
        this._duration = Math.max(1, Math.min(15, seconds));
    }

    get duration(): number {
        return this._duration;
    }

    /**
     * フェードイン（無音 → 1.0）
     * 再生開始時に呼び出す
     */
    fadeIn(): Promise<void> {
        return new Promise((resolve) => {
            const now = this.ctx.currentTime;
            const currentValue = this.gainNode.gain.value;
            this.gainNode.gain.cancelScheduledValues(now);

            // 現在の音量から滑らかに開始（急な0への落下を防ぎポップノイズを防止）
            this.gainNode.gain.setValueAtTime(currentValue, now);
            this.gainNode.gain.linearRampToValueAtTime(1.0, now + this._duration);

            setTimeout(resolve, this._duration * 1000);
        });
    }

    /**
     * フェードアウト（現在値 → 0.0）
     * 再生停止時に呼び出す
     */
    fadeOut(): Promise<void> {
        return new Promise((resolve) => {
            const now = this.ctx.currentTime;
            const currentValue = this.gainNode.gain.value;
            this.gainNode.gain.cancelScheduledValues(now);
            this.gainNode.gain.setValueAtTime(currentValue, now);
            this.gainNode.gain.linearRampToValueAtTime(0.0, now + this._duration);
            setTimeout(resolve, this._duration * 1000);
        });
    }

    /** 即座にミュート（フェードなし） */
    mute(): void {
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(0, now);
    }

    /** 即座にアンミュート（フェードなし） */
    unmute(): void {
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(1.0, now);
    }

    /** リソース解放 */
    dispose(): void {
        this.gainNode.disconnect();
    }
}
