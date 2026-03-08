/**
 * AudioLogger — オーディオエンジンのデバッグログ収集モジュール
 *
 * 以下のいずれかの条件で有効になる:
 *   - 開発ビルド (import.meta.env.DEV = true)
 *   - 本番ビルドで URL に ?debug=1 が含まれる
 *
 * 無効時はすべての関数が no-op。
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
    id: number;
    timestamp: string; // HH:MM:SS.mmm 形式
    level: LogLevel;
    message: string;
}

/** リングバッファの最大件数 */
const MAX_ENTRIES = 200;

/**
 * デバッグモード判定・モジュールロード時に一度だけ評価しキャッシュする
 * - DEV ビルド時: 常に true
 * - PROD ビルド時: URL に ?debug=1 がある場合のみ true
 */
const _debugEnabled: boolean = (() => {
    if (import.meta.env.DEV) return true;
    try {
        return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
        return false;
    }
})();

let _counter = 0;
const _entries: LogEntry[] = [];
/** ログ更新を検知する購読者リスト */
const _subscribers: (() => void)[] = [];

/** タイムスタンプを HH:MM:SS.mmm 形式で生成 */
function formatTimestamp(): string {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
}

/** ログにエントリを追加する */
export function addLog(level: LogLevel, message: string): void {
    if (!_debugEnabled) return;

    const entry: LogEntry = {
        id: _counter++,
        timestamp: formatTimestamp(),
        level,
        message,
    };

    // リングバッファ: 最大件数を超えたら古いものから削除
    if (_entries.length >= MAX_ENTRIES) {
        _entries.shift();
    }
    _entries.push(entry);

    // console にも出力（開発時の DevTools 確認用）
    const prefix = `[AudioEngine ${entry.timestamp}]`;
    if (level === 'error') {
        console.error(prefix, message);
    } else if (level === 'warn') {
        console.warn(prefix, message);
    } else {
        console.info(prefix, message);
    }

    // 購読者に通知
    _subscribers.forEach(fn => fn());
}

/** 全ログエントリを取得（コピー）*/
export function getLogs(): LogEntry[] {
    return [..._entries];
}

/** ログをクリア */
export function clearLogs(): void {
    _entries.length = 0;
    _subscribers.forEach(fn => fn());
}

/**
 * ログ更新を購読する（React の useState 更新トリガー用）
 * @returns 購読解除関数
 */
export function subscribeToLogs(callback: () => void): () => void {
    _subscribers.push(callback);
    return () => {
        const idx = _subscribers.indexOf(callback);
        if (idx !== -1) _subscribers.splice(idx, 1);
    };
}
