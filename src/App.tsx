import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioEngineProvider } from './audio/AudioEngineContext';
import { PlayerScreen } from './components/screens/PlayerScreen';
import { MixerScreen } from './components/screens/MixerScreen';
import { SoundsScreen } from './components/screens/SoundsScreen';

type Tab = 'player' | 'sounds' | 'mixer';

function AppShell() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('player');
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  // ダークモード: data-theme 属性をルートに適用
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light'
    );
  }, [isDark]);

  // 初回: システムテーマを参照
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div
      style={{
        width: '100%', // ★ コンテンツ量による横幅の自動伸縮を防ぐ
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-page)',
        maxWidth: 430,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* メインコンテンツ（keyを指定することで切り替え時にアニメーションが再トリガーされる） */}
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div key={activeTab} className="animate-fade-in" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'player' && (
            <PlayerScreen isDark={isDark} onToggleDark={() => setIsDark(d => !d)} />
          )}
          {activeTab === 'mixer' && (
            <MixerScreen isDark={isDark} onToggleDark={() => setIsDark(d => !d)} />
          )}
          {activeTab === 'sounds' && (
            <SoundsScreen isDark={isDark} onToggleDark={() => setIsDark(d => !d)} />
          )}
        </div>
      </main>

      {/* タブバー（セーフエリア対応） */}
      <nav
        style={{
          padding: '10px 24px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: 'var(--bg-page)',
          flexShrink: 0,
        }}
      >
        <div className="nm-tab-bar">
          {/* PLAYER タブ */}
          <button
            className={`nm-tab ${activeTab === 'player' ? 'active' : ''}`}
            onClick={() => setActiveTab('player')}
          >
            {t('app.tabPlayer', 'Player')}
          </button>

          {/* MIXER タブ */}
          <button
            className={`nm-tab ${activeTab === 'mixer' ? 'active' : ''}`}
            onClick={() => setActiveTab('mixer')}
          >
            {t('app.tabMixer', 'Mixer')}
          </button>

          {/* SOUNDS タブ */}
          <button
            className={`nm-tab ${activeTab === 'sounds' ? 'active' : ''}`}
            onClick={() => setActiveTab('sounds')}
          >
            {t('app.tabSounds', 'Sounds')}
          </button>
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <AudioEngineProvider>
      <AppShell />
    </AudioEngineProvider>
  );
}

export default App;
