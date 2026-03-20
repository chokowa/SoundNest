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
            const param = this.gainNode.gain;
            
            if (typeof param.cancelScheduledValues === 'function') {
                param.cancelScheduledValues(now);
            }
            if (typeof param.setValueAtTime === 'function') {
                param.setValueAtTime(param.value, now);
            }

            if (typeof param.linearRampToValueAtTime === 'function') {
                param.linearRampToValueAtTime(1.0, now + this._duration);
            } else {
                param.value = 1.0;
            }

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
            const param = this.gainNode.gain;
            
            if (typeof param.cancelScheduledValues === 'function') {
                param.cancelScheduledValues(now);
            }
            if (typeof param.setValueAtTime === 'function') {
                param.setValueAtTime(param.value, now);
            }

            if (typeof param.linearRampToValueAtTime === 'function') {
                param.linearRampToValueAtTime(0.0, now + this._duration);
            } else {
                param.value = 0.0;
            }
            setTimeout(resolve, this._duration * 1000);
        });
    }

    /** 即座にミュート（フェードなし） */
    mute(): void {
        const now = this.ctx.currentTime;
        const param = this.gainNode.gain;
        if (typeof param.cancelScheduledValues === 'function') {
            param.cancelScheduledValues(now);
        }
        param.value = 0;
    }

    /** 即座にアンミュート（フェードなし） */
    unmute(): void {
        const now = this.ctx.currentTime;
        const param = this.gainNode.gain;
        if (typeof param.cancelScheduledValues === 'function') {
            param.cancelScheduledValues(now);
        }
        param.value = 1.0;
    }

    /** リソース解放 */
    dispose(): void {
        this.gainNode.disconnect();
    }
}
