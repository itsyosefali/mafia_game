import { useState } from 'react';

const MIN = 4;
const MAX = 12;

export default function Lobby({ gameState, onStart, onAddBot, onRemoveBot, socketId }) {
  const isHost = socketId === gameState?.hostId;
  const players = gameState?.players || [];
  const canStart = players.length >= MIN && isHost;
  const isFull = players.length >= MAX;
  const [starting, setStarting] = useState(false);

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
            🧙‍♀️ ردهة السحارة
          </h2>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div className="game-code-label">رمز اللعبة</div>
            <div className="game-code">
              <span className="game-code-value">{gameState?.id}</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              شارك هذا الرمز مع أصدقائك للانضمام
            </p>
          </div>

          <div className="section-title">
            اللاعبون ({players.length}/{MAX})
            {players.length < MIN && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginInlineStart: '0.5rem' }}>
                ينقص {MIN - players.length}
              </span>
            )}
          </div>

          <div className="player-list">
            {players.map((p, i) => (
              <div className="player-item" key={p.id}>
                <div className="player-avatar" style={{ background: `hsl(${(i * 47) % 360}, 55%, 42%)` }}>
                  {p.isBot ? '🤖' : p.name.charAt(0).toUpperCase()}
                </div>
                <span className="player-name">{p.name}</span>
                {p.id === gameState.hostId && <span className="player-badge badge-host">المضيف</span>}
                {p.id === socketId && <span className="player-badge badge-you">أنت</span>}
                {p.isBot && <span className="player-badge badge-bot">بوت</span>}
                {isHost && p.isBot && (
                  <button className="bot-remove" title="إزالة البوت" onClick={() => onRemoveBot(p.id)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {isHost ? (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button className="btn btn-outline btn-block" disabled={isFull} onClick={() => onAddBot()}>
                🤖 أضف بوت للتجربة{isFull ? ' (اكتمل العدد)' : ''}
              </button>
              <button
                className="btn btn-primary btn-block btn-lg"
                disabled={!canStart || starting}
                onClick={handleStart}
              >
                {starting
                  ? '⏳ جارٍ البدء...'
                  : players.length < MIN
                  ? `🚀 ابدأ (ينقص ${MIN - players.length})`
                  : '🚀 ابدأ اللعبة'}
              </button>
            </div>
          ) : (
            <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
              ⏳ في انتظار المضيف ليبدأ اللعبة...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
