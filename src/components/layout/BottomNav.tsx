export function BottomNav() {
    return (
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-[#151724] border-t border-[#2A2D3E] flex items-center justify-around px-2 z-40 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
            <button className="flex flex-col items-center gap-1 text-indigo-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 11h6V5H4v6zm0 8h6v-6H4v6zm8-14v6h8V5h-8zm0 14h8v-6h-8v6z" />
                </svg>
                <span className="text-[10px] font-medium">Console</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                </svg>
                <span className="text-[10px] font-medium">Timer</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8zm0 3h4v2h-4zm0-6h8v2h-8z" />
                </svg>
                <span className="text-[10px] font-medium">Library</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span className="text-[10px] font-medium">Profile</span>
            </button>
        </nav>
    );
}
