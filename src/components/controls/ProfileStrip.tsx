import { useAudioEngine } from '../../audio/AudioEngineContext';

// プリセット用アイコンSVG
function BookmarkIcon({ className }: { className?: string }) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
        </svg>
    );
}

export function ProfileStrip() {
    const { state, presets, applyPreset } = useAudioEngine();

    return (
        <div className="w-full">
            <h3 className="text-xs font-bold tracking-widest uppercase text-text-muted mb-4 pl-1">
                Saved Profiles
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 px-1 hide-scrollbar">
                {presets.map(preset => {
                    const isActive = state.activePresetId === preset.id;
                    return (
                        <button
                            key={preset.id}
                            onClick={() => applyPreset(preset)}
                            className={`
                                relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                                ${isActive ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-[#2A2D3E] hover:bg-[#34384C]'}
                            `}
                            aria-label={preset.name}
                            title={preset.name}
                        >
                            <BookmarkIcon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
