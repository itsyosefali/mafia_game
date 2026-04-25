import { useState } from 'react';

const ROLE_INFO = {
  mafia: { icon: '🔪', color: '#dc2626', desc: 'Choose a player to eliminate each night' },
  doctor: { icon: '💉', color: '#16a34a', desc: 'Choose a player to protect each night' },
  detective: { icon: '🔍', color: '#2563eb', desc: 'Investigate a player to learn their identity' },
  citizen: { icon: '👤', color: '#6b7280', desc: 'Survive and find the Mafia through voting' },
};

export default function Lobby({ gameState, onStart, socketId }) {
  const isHost = socketId === gameState?.hostId;
  const players = gameState?.players || [];
  const canStart = players.length >= 4 && isHost;
  const [starting, setStarting] = useState(false);

  // If roles are assigned but still in lobby transition, show role reveal
  if (gameState?.myRole && gameState?.phase === 'lobby') {
    const info = ROLE_INFO[gameState.myRole];
    return (
      <div className="page-center">
        <div className="content-wrapper">
          <div className="card">
            <div className={`role-card role-${gameState.myRole}`}>
              <div className="role-icon">{info.icon}</div>
              <div className="role-name" style={{ color: info.color }}>
                {gameState.myRole}
              </div>
              <div className="role-desc">{info.desc}</div>
            </div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              The game is about to begin...
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function handleStart() {
    setStarting(true);
    await onStart();
    setStarting(false);
  }

  return (
    <div className="page-center">
      <div className="content-wrapper">
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>
            🕵️ Game Lobby
          </h2>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="game-code-label">GAME CODE</div>
            <div className="game-code">
              <span className="game-code-value">{gameState?.id}</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Share this code with friends to join
            </p>
          </div>

          <div className="section-title">
            Players ({players.length}/10)
            {players.length < 4 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>
                Need {4 - players.length} more
              </span>
            )}
          </div>

          <div className="player-list">
            {players.map((p, i) => (
              <div className="player-item" key={p.id}>
                <div
                  className="player-avatar"
                  style={{ background: `hsl(${(i * 47) % 360}, 60%, 45%)` }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="player-name">{p.name}</span>
                {p.id === gameState.hostId && (
                  <span className="player-badge badge-host">Host</span>
                )}
                {p.id === socketId && (
                  <span className="player-badge badge-you">You</span>
                )}
              </div>
            ))}
          </div>

          {isHost && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary btn-block btn-lg"
                disabled={!canStart || starting}
                onClick={handleStart}
              >
                {starting ? '⏳ Starting...' : `🚀 Start Game${players.length < 4 ? ` (Need ${4 - players.length} more)` : ''}`}
              </button>
            </div>
          )}

          {!isHost && (
            <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
              ⏳ Waiting for the host to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
