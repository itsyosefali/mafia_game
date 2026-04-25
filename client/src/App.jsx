import { useState } from 'react';
import { useGame } from './useGame';
import Lobby from './Lobby';
import Game from './Game';
import './index.css';

export default function App() {
  const {
    gameState, connected, error, investigationResult, voteResult, timer,
    createGame, joinGame, startGame, nightAction, vote, skipVote, advanceToVoting,
    clearError, clearInvestigation, clearVoteResult, socketId,
  } = useGame();

  const [screen, setScreen] = useState('home'); // home | joining
  const [name, setName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [loading, setLoading] = useState(false);

  // In-game views
  if (gameState) {
    if (gameState.phase === 'lobby') {
      return (
        <>
          <BgEffects />
          <ConnectionStatus connected={connected} />
          <div className="app-container">
            {error && <ErrorToast message={error} onClose={clearError} />}
            <Lobby
              gameState={gameState}
              onStart={startGame}
              socketId={socketId}
            />
          </div>
        </>
      );
    }

    return (
      <>
        <BgEffects />
        <ConnectionStatus connected={connected} />
        <div className="app-container">
          {error && <ErrorToast message={error} onClose={clearError} />}
          <Game
            gameState={gameState}
            timer={timer}
            investigationResult={investigationResult}
            voteResult={voteResult}
            onNightAction={nightAction}
            onVote={vote}
            onSkipVote={skipVote}
            onAdvanceToVoting={advanceToVoting}
            onClearInvestigation={clearInvestigation}
            onClearVoteResult={clearVoteResult}
            socketId={socketId}
          />
        </div>
      </>
    );
  }

  // ── Home / Join Screen ──
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
      <div className="app-container">
        <div className="page-center">
          <div className="content-wrapper">
            <h1 className="title">🕵️ Mafia</h1>
            <p className="subtitle">A game of deception, deduction, and survival</p>

            {error && <ErrorToast message={error} onClose={clearError} />}

            <div className="card">
              {screen === 'home' && (
                <>
                  <form onSubmit={handleCreate}>
                    <div className="form-group">
                      <label>Your Name</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Enter your name..."
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
                      {loading ? '⏳ Creating...' : '🎮 Create New Game'}
                    </button>
                  </form>

                  <div className="divider">or join existing</div>

                  <button
                    className="btn btn-outline btn-block"
                    onClick={() => setScreen('joining')}
                    disabled={!connected}
                  >
                    🔗 Join with Code
                  </button>
                </>
              )}

              {screen === 'joining' && (
                <form onSubmit={handleJoin}>
                  <div className="form-group">
                    <label>Your Name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Enter your name..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={20}
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Game Code</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. A1B2C3D4"
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}
                    />
                  </div>
                  <button
                    className="btn btn-success btn-block btn-lg"
                    type="submit"
                    disabled={!name.trim() || !gameCode.trim() || loading || !connected}
                  >
                    {loading ? '⏳ Joining...' : '🚀 Join Game'}
                  </button>
                  <button
                    className="btn btn-ghost btn-block"
                    type="button"
                    onClick={() => setScreen('home')}
                    style={{ marginTop: '0.5rem' }}
                  >
                    ← Back
                  </button>
                </form>
              )}

              {!connected && (
                <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                  ⚠️ Connecting to server...
                </div>
              )}
            </div>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              4-10 players • Hidden roles • Social deduction
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function BgEffects() {
  return <div className="bg-effects" />;
}

function ConnectionStatus({ connected }) {
  return (
    <div className="connection-status">
      <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
      {connected ? 'Connected' : 'Offline'}
    </div>
  );
}

function ErrorToast({ message, onClose }) {
  return (
    <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 200, maxWidth: '400px', width: '90%' }}>
      <div className="alert alert-error" style={{ cursor: 'pointer' }} onClick={onClose}>
        ⚠️ {message}
        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>✕</span>
      </div>
    </div>
  );
}
