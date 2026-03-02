import { useAudioEngine } from '../../audio/AudioEngineContext';

/**
 * 再生/停止ボタン
 * 大きな円形ボタンで、再生中はパルスアニメーション付き。
 * フェード処理と連動する。
 */
export function PlayButton() {
    const { state, play, stop } = useAudioEngine();

    const handleClick = async () => {
        if (state.isPlaying) {
            await stop();
        } else {
            await play();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`
        relative w-20 h-20 rounded-full
        flex items-center justify-center
        transition-all duration-300 ease-out
        cursor-pointer select-none
        ${state.isPlaying
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.5)]'
                    : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 shadow-lg hover:shadow-xl'
                }
      `}
            aria-label={state.isPlaying ? '停止' : '再生'}
            id="play-button"
        >
            {/* パルスアニメーション（再生中のみ） */}
            {state.isPlaying && (
                <>
                    <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" style={{ animationDuration: '2s' }} />
                    <span className="absolute inset-[-4px] rounded-full bg-blue-400/10 animate-pulse" style={{ animationDuration: '3s' }} />
                </>
            )}

            {/* アイコン */}
            {state.isPlaying ? (
                // 停止アイコン（二重バー）
                <div className="relative z-10 flex gap-1.5">
                    <div className="w-2.5 h-7 bg-white rounded-sm" />
                    <div className="w-2.5 h-7 bg-white rounded-sm" />
                </div>
            ) : (
                // 再生アイコン（三角）
                <svg className="relative z-10 w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                </svg>
            )}
        </button>
    );
}
