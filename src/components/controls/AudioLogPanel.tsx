/**
 * AudioLogPanel — デバッグログ表示パネル
 *
 * 以下のいずれかの条件でレンダリングされる:
 *   - 開発ビルド (import.meta.env.DEV = true)
 *   - 本番ビルドで URL に ?debug=1 が含まれる
 */
import { useState, useEffect, useRef } from 'react';
import { getLogs, clearLogs, subscribeToLogs, type LogEntry } from '../../audio/AudioLogger';

/** パネル表示判定（モジュールロード時に一度だけ評価） */
const _isPanelEnabled: boolean = (() => {
    if (import.meta.env.DEV) return true;
    try {
        return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
        return false;
    }
})();

const LEVEL_STYLES: Record<LogEntry['level'], { color: string; icon: string }> = {
    info: { color: '#a8d8a8', icon: 'ℹ' },
    warn: { color: '#f7c948', icon: '⚠' },
    error: { color: '#f28b82', icon: '✖' },
};

export function AudioLogPanel() {
    // デバッグモード以外では何もレンダリングしない
    if (!_isPanelEnabled) return null;

    return <AudioLogPanelInner />;
}

/** DEV ビルド時のみ import される実体コンポーネント */
function AudioLogPanelInner() {
    const [logs, setLogs] = useState<LogEntry[]>(getLogs);
    const [isOpen, setIsOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // AudioLogger の更新を購読
    useEffect(() => {
        const unsubscribe = subscribeToLogs(() => {
            setLogs(getLogs());
        });
        return unsubscribe;
    }, []);

    // ログが追加されたら自動スクロール
    useEffect(() => {
        if (isOpen && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [logs, isOpen]);

    const handleCopy = async () => {
        const text = logs
            .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
            .join('\n');
        try {
            await navigator.clipboard.writeText(text);
            alert('ログをクリップボードにコピーしました');
        } catch {
            alert('コピー失敗: テキストを手動で選択してください');
        }
    };

    return (
        <div style={styles.container}>
            {/* ヘッダー（タップで折りたたみ切り替え） */}
            <button
                style={styles.header}
                onClick={() => setIsOpen(prev => !prev)}
                aria-expanded={isOpen}
            >
                <span style={styles.headerIcon}>{isOpen ? '▼' : '▶'}</span>
                <span style={styles.headerTitle}>🐛 デバッグログ</span>
                <span style={styles.badge}>{logs.length}</span>
            </button>

            {/* ログ一覧（折りたたみ展開時のみ表示） */}
            {isOpen && (
                <>
                    <div ref={listRef} style={styles.logList}>
                        {logs.length === 0 ? (
                            <p style={styles.empty}>ログなし</p>
                        ) : (
                            logs.map(entry => {
                                const s = LEVEL_STYLES[entry.level];
                                return (
                                    <div key={entry.id} style={{ ...styles.logEntry, color: s.color }}>
                                        <span style={styles.ts}>{entry.timestamp}</span>
                                        <span style={styles.icon}>{s.icon}</span>
                                        <span style={styles.msg}>{entry.message}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {/* ボタン行 */}
                    <div style={styles.toolbar}>
                        <button style={styles.btn} onClick={() => { clearLogs(); setLogs([]); }}>
                            クリア
                        </button>
                        <button style={styles.btn} onClick={handleCopy}>
                            クリップボードにコピー
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ===== インラインスタイル =====
const styles = {
    container: {
        margin: '16px 8px 8px',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        overflow: 'hidden',
        fontFamily: 'monospace',
        fontSize: '11px',
        background: 'rgba(0,0,0,0.55)',
    } as React.CSSProperties,
    header: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        color: '#ccc',
        cursor: 'pointer',
        textAlign: 'left',
    } as React.CSSProperties,
    headerIcon: { fontSize: '10px', color: '#888' } as React.CSSProperties,
    headerTitle: { flex: 1, fontWeight: 600, letterSpacing: '0.03em' } as React.CSSProperties,
    badge: {
        background: 'rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '1px 7px',
        color: '#aaa',
        fontSize: '10px',
    } as React.CSSProperties,
    logList: {
        maxHeight: '220px',
        overflowY: 'auto',
        padding: '4px 10px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    } as React.CSSProperties,
    logEntry: {
        display: 'flex',
        gap: '6px',
        lineHeight: '1.5',
    } as React.CSSProperties,
    ts: { color: '#666', flexShrink: 0 } as React.CSSProperties,
    icon: { flexShrink: 0, width: '12px' } as React.CSSProperties,
    msg: { wordBreak: 'break-word', flex: 1 } as React.CSSProperties,
    empty: { color: '#555', textAlign: 'center', padding: '8px' } as React.CSSProperties,
    toolbar: {
        display: 'flex',
        gap: '8px',
        padding: '6px 10px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
    } as React.CSSProperties,
    btn: {
        padding: '4px 10px',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '5px',
        color: '#bbb',
        cursor: 'pointer',
        fontSize: '11px',
    } as React.CSSProperties,
} as const;
