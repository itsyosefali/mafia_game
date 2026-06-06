import { useState } from 'react';
import { useGame } from './useGame';
import Lobby from './Lobby';
import Game from './Game';
import { isSoundEnabled, setSoundEnabled } from './sound';
import './index.css';

export default function App() {
  const game = useGame();
  const { gameState, connected, error, clearError, createGame, joinGame } = game;

  const [screen, setScreen] = useState('home');
  const [name, setName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (gameState) {
    const inLobby = gameState.phase === 'lobby';
    return (
      <>
        <BgEffects />
        <ConnectionStatus connected={connected} />
        <SoundToggle />
        <div className="app-container">
          {error && <ErrorToast message={error} onClose={clearError} />}
          {inLobby ? (
            <Lobby
              gameState={gameState}
              onStart={game.startGame}
              onAddBot={game.addBot}
              onRemoveBot={game.removeBot}
              socketId={game.socketId}
            />
          ) : (
            <Game game={game} />
          )}
        </div>
      </>
    );
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await createGame(name.trim());
    setLoading(false);
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !gameCode.trim()) return;
    setLoading(true);
    const res = await joinGame(gameCode.trim(), name.trim());
    if (!res.success) setLoading(false);
  }

  return (
    <>
      <BgEffects />
      <ConnectionStatus connected={connected} />
      <SoundToggle />
      <div className="app-container">
        <div className="page-center">
          <div className="content-wrapper">
            <h1 className="title">🧙‍♀️ السحارة</h1>
            <p className="subtitle">خداع واستنتاج وأدوار خفية من حواري طرابلس القديمة</p>

            {error && <ErrorToast message={error} onClose={clearError} />}

            <div className="card">
              {screen === 'home' && (
                <>
                  <form onSubmit={handleCreate}>
                    <div className="form-group">
                      <label>اسمك</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="اكتب اسمك..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={20}
                        autoFocus
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-block btn-lg"
                      type="submit"
                      disabled={!name.trim() || loading || !connected}
                    >
                      {loading ? '⏳ جارٍ الإنشاء...' : '🎮 إنشاء لعبة جديدة'}
                    </button>
                  </form>

                  <div className="divider">أو انضم إلى لعبة</div>

                  <button
                    className="btn btn-outline btn-block"
                    onClick={() => setScreen('joining')}
                    disabled={!connected}
                  >
                    🔗 انضم برمز اللعبة
                  </button>
                </>
              )}

              {screen === 'joining' && (
                <form onSubmit={handleJoin}>
                  <div className="form-group">
                    <label>اسمك</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="اكتب اسمك..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={20}
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>رمز اللعبة</label>
                    <input
                      className="input input-code"
                      type="text"
                      placeholder="مثال: A1B2C3D4"
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                      maxLength={8}
                    />
                  </div>
                  <button
                    className="btn btn-success btn-block btn-lg"
                    type="submit"
                    disabled={!name.trim() || !gameCode.trim() || loading || !connected}
                  >
                    {loading ? '⏳ جارٍ الانضمام...' : '🚀 انضم للعبة'}
                  </button>
                  <button
                    className="btn btn-ghost btn-block"
                    type="button"
                    onClick={() => setScreen('home')}
                    style={{ marginTop: '0.5rem' }}
                  >
                    → رجوع
                  </button>
                </form>
              )}

              {!connected && (
                <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                  ⚠️ جارٍ الاتصال بالخادم...
                </div>
              )}
            </div>

            <p className="hint-footer">من ٤ إلى ١٢ لاعباً • أدوار خفية • استنتاج اجتماعي</p>
          </div>
        </div>
      </div>
    </>
  );
}

function BgEffects() {
  return (
    <div className="bg-effects">
      <div className="bg-moon" />
      <div className="bg-fog" />
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(isSoundEnabled());
  return (
    <button
      className="sound-toggle"
      title={on ? 'كتم الصوت' : 'تشغيل الصوت'}
      onClick={() => {
        const next = !on;
        setSoundEnabled(next);
        setOn(next);
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

function ConnectionStatus({ connected }) {
  return (
    <div className="connection-status">
      <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
      {connected ? 'متصل' : 'غير متصل'}
    </div>
  );
}

function ErrorToast({ message, onClose }) {
  return (
    <div className="error-toast-wrap">
      <div className="alert alert-error" style={{ cursor: 'pointer' }} onClick={onClose}>
        ⚠️ {message}
        <span style={{ marginInlineStart: 'auto', opacity: 0.6 }}>✕</span>
      </div>
    </div>
  );
}
