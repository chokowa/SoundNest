import type { ReactNode } from 'react';

/**
 * アプリ全体レイアウト
 * モバイルファーストのスクロール可能レイアウト。
 */
export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="relative h-full flex flex-col">
            {/* ヘッダー */}
            <header className="shrink-0 z-30 glass px-4 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎧</span>
                    <h1 className="text-lg font-semibold text-text-primary tracking-tight">
                        SoundNest
                    </h1>
                </div>
                <span className="text-xs text-text-muted">v0.1.0</span>
            </header>

            {/* メインコンテンツ（min-h-0 でフレックス子のスクロールを有効化） */}
            <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 pb-24">
                <div className="max-w-lg mx-auto space-y-5">
                    {children}
                </div>
            </main>
        </div>
    );
}
