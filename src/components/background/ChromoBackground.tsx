import { useEffect, useRef, useMemo } from 'react';
import { useAudioEngine } from '../../audio/AudioEngineContext';

/**
 * クロモセラピー背景
 * ノイズブレンド比率に応じて背景グラデーションが滑らかに変化する。
 * - ブラウンノイズ優勢 → 深い青〜紺（深海）
 * - ピンクノイズ優勢 → 暖かい紫〜ローズ
 * - ホワイトノイズ優勢 → クールなシルバー〜グレー
 */
export function ChromoBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { state } = useAudioEngine();
    const animRef = useRef<number>(0);
    const timeRef = useRef(0);

    // ブレンド比率から色を算出
    const targetColors = useMemo(() => {
        const { brown, pink } = state.blend;
        const total = brown + pink || 1;
        const nb = brown / total;
        const np = pink / total;

        // 各ノイズの色（HSL）
        // ブラウン: 深い青 (H:220, S:80, L:12)
        // ピンク: 紫寄りのローズ (H:310, S:70, L:20)
        const h = 220 * nb + 310 * np;
        const s = 80 * nb + 70 * np;
        const l = 12 * nb + 20 * np;

        return { h, s, l };
    }, [state.blend]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const render = () => {
            timeRef.current += 0.002;
            const t = timeRef.current;
            const { h, s, l } = targetColors;

            const w = canvas.width;
            const hh = canvas.height;

            // メイングラデーション
            const gradient = ctx.createRadialGradient(
                w * 0.5 + Math.sin(t * 0.7) * w * 0.15,
                hh * 0.5 + Math.cos(t * 0.5) * hh * 0.15,
                0,
                w * 0.5,
                hh * 0.5,
                Math.max(w, hh) * 0.8
            );

            gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l + 8}%, 1)`);
            gradient.addColorStop(0.5, `hsla(${h + 15}, ${s - 10}%, ${l + 3}%, 1)`);
            gradient.addColorStop(1, `hsla(${h - 10}, ${s - 20}%, ${l - 4}%, 1)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, hh);

            // 微細な波紋エフェクト
            const rippleCount = 3;
            for (let i = 0; i < rippleCount; i++) {
                const rx = w * (0.3 + 0.4 * Math.sin(t * 0.3 + i * 2.1));
                const ry = hh * (0.3 + 0.4 * Math.cos(t * 0.25 + i * 1.7));
                const rippleGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, w * 0.3);
                rippleGrad.addColorStop(0, `hsla(${h + 30 + i * 20}, ${s}%, ${l + 12}%, 0.08)`);
                rippleGrad.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
                ctx.fillStyle = rippleGrad;
                ctx.fillRect(0, 0, w, hh);
            }

            animRef.current = requestAnimationFrame(render);
        };

        animRef.current = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [targetColors]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full -z-10"
            aria-hidden="true"
        />
    );
}
