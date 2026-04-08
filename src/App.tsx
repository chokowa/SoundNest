import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioEngineProvider } from './audio/AudioEngineContext';
import { PlayerScreen } from './components/screens/PlayerScreen';
import { MixerScreen } from './components/screens/MixerScreen';
import { SoundsScreen } from './components/screens/SoundsScreen';
import { OnboardingModal } from './components/modals/OnboardingModal';

type Tab = 'player' | 'sounds' | 'mixer';

function AppShell() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('player');
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('soundnest-onboarding-seen');
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem('soundnest-onboarding-seen', 'true');
    setShowOnboarding(false);
  };

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
        width: '100%',
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
      {/* オンボーディング */}
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {/* メインコンテンツ */}
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

      {/* タブバー */}
      <nav
          style={{
            padding: '10px 24px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            background: 'var(--bg-page)',
            flexShrink: 0,
          }}
        >
          <div style={{
            background: 'var(--bg-tab-bar)',
            borderRadius: 'var(--radius-tab)',
            padding: 4,
            display: 'flex',
            position: 'relative',
          }}>
            {/* Sliding Pill Background */}
            <div style={{
              position: 'absolute',
              top: 4, bottom: 4,
              width: 'calc((100% - 8px) / 3)',
              background: 'var(--bg-tab-active)',
              borderRadius: 22,
              boxShadow: 'var(--shadow-card)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: `translateX(${activeTab === 'player' ? '0%' : activeTab === 'mixer' ? '100%' : '200%'})`,
              zIndex: 0
            }} />

            {/* Tab Buttons */}
            {[
              { 
                id: 'player', 
                label: t('app.tabPlayer', 'Player'), 
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3L19 12L5 21V3Z"/></svg>
              },
              { 
                id: 'mixer', 
                label: t('app.tabMixer', 'Mixer'), 
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
              },
              { 
                id: 'sounds', 
                label: t('app.tabAtmos', 'Atmos'), 
                icon: <svg width="18" height="18" viewBox="-2 -2 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c2.4 0 4.5-1.9 4.5-4.2S19.9 10.5 17.5 10.5c-.3 0-.6.1-.9.1-1-3.6-4.5-6.1-8.6-6.1-5 0-9 4-9 9s4 9 9 9h8.5Z"/></svg>
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  style={{
                    flex: 1, height: 48, borderRadius: 24, border: 'none', background: 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'color 0.3s', zIndex: 1, padding: 0
                  }}
                  aria-label={tab.label}
                >
                  <div style={{ transform: isActive ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    {tab.icon}
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* 更新確認用のバージョン表記 */}
        <div style={{
          position: 'absolute',
          bottom: 2,
          right: 6,
          fontSize: 9,
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--text-muted)',
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 999
        }}>
          v1.0.4
        </div>
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
