import { useState, useEffect, useRef } from 'react';

const ROLE_INFO = {
  mafia: { icon: '🔪', color: '#dc2626', desc: 'Choose a target to eliminate', actionLabel: 'Kill' },
  doctor: { icon: '💉', color: '#16a34a', desc: 'Choose a player to protect', actionLabel: 'Protect' },
  detective: { icon: '🔍', color: '#2563eb', desc: 'Choose a player to investigate', actionLabel: 'Investigate' },
  citizen: { icon: '👤', color: '#6b7280', desc: 'Wait for morning', actionLabel: null },
};

const PHASE_INFO = {
  night: { icon: '🌙', label: 'Night Phase', className: 'phase-night' },
  day: { icon: '☀️', label: 'Day Phase', className: 'phase-day' },
  voting: { icon: '🗳️', label: 'Voting Phase', className: 'phase-voting' },
  ended: { icon: '🏁', label: 'Game Over', className: 'phase-ended' },
};

export default function Game({
  gameState, timer, investigationResult, voteResult,
  onNightAction, onVote, onSkipVote, onAdvanceToVoting,
  onClearInvestigation, onClearVoteResult, socketId,
}) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const logRef = useRef(null);
  const myRole = gameState?.myRole;
  const phase = gameState?.phase;
  const players = gameState?.players || [];
  const isHost = socketId === gameState?.hostId;
  const me = players.find((p) => p.id === socketId);
  const amAlive = me?.alive;
  const roleInfo = ROLE_INFO[myRole] || {};
  const phaseInfo = PHASE_INFO[phase] || {};
  const isEnded = phase === 'ended';

  useEffect(() => {
    setSelectedTarget(null);
  }, [phase]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.log]);

  // ── Winner Screen ──
  if (isEnded) {
    const isMafiaWin = gameState.winner === 'mafia';
    return (
      <div className="page-center">
        <div className="content-wrapper" style={{ maxWidth: '700px' }}>
          <div className="card">
            <div className="winner-screen">
              <div className="winner-icon">{isMafiaWin ? '🔴' : '🟢'}</div>
              <div className={`winner-title ${isMafiaWin ? 'winner-mafia' : 'winner-citizens'}`}>
                {isMafiaWin ? 'Mafia Wins!' : 'Citizens Win!'}
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {isMafiaWin
                  ? 'The Mafia has taken over the town...'
                  : 'All Mafia members have been eliminated!'}
              </p>
            </div>

            {/* Table layout for final reveal */}
            <div className="section-title" style={{ textAlign: 'center' }}>All Roles Revealed</div>
            <div className="table-layout">
              <div className="table-center ended">
                <span>🏁</span>
                <span>GG</span>
              </div>
              {players.map((p, i) => {
                const pRole = p.role || 'citizen';
                const ri = ROLE_INFO[pRole] || ROLE_INFO.citizen;
                return (
                  <div
                    key={p.id}
                    className={`table-seat ${!p.alive ? 'is-dead' : ''}`}
                    style={getSeatPosition(i, players.length)}
                  >
                    <div className="seat-avatar" style={{
                      background: ri.color,
                      borderColor: ri.color,
                    }}>
                      {ri.icon}
                    </div>
                    <div className="seat-name">{p.name}</div>
                    <div className="seat-role" style={{ color: ri.color }}>
                      {pRole}
                    </div>
                    {p.id === socketId && <div className="seat-you">You</div>}
                    {!p.alive && <div className="seat-dead">💀</div>}
                  </div>
                );
              })}
            </div>

            {renderLog()}
          </div>
        </div>
      </div>
    );
  }

  function handleTargetSelect(targetId) {
    if (!amAlive) return;
    setSelectedTarget(targetId);
  }

  async function handleAction() {
    if (!selectedTarget) return;
    if (phase === 'night') {
      await onNightAction(selectedTarget);
    } else if (phase === 'voting') {
      await onVote(selectedTarget);
    }
    setSelectedTarget(null);
  }

  function getValidTargets() {
    return players.filter((p) => {
      if (!p.alive) return false;
      if (p.id === socketId) return false;
      return true;
    });
  }

  function getValidTargetsDoctor() {
    return players.filter((p) => p.alive);
  }

  function renderTimer() {
    if (!timer || timer.remaining <= 0) return null;
    return (
      <div className="timer">
        <span>⏱️</span>
        <span className={`timer-value ${timer.remaining <= 10 ? 'urgent' : ''}`}>
          {timer.remaining}s
        </span>
      </div>
    );
  }

  function renderRoleCard() {
    return (
      <div className={`role-card role-${myRole}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem' }}>{roleInfo.icon}</span>
          <div>
            <div className="role-name" style={{ color: roleInfo.color, fontSize: '1rem' }}>
              {myRole}
            </div>
            <div className="role-desc" style={{ fontSize: '0.75rem' }}>{roleInfo.desc}</div>
          </div>
        </div>
        {!amAlive && (
          <div style={{ marginTop: '0.5rem', color: 'var(--red)', fontWeight: 600, fontSize: '0.85rem' }}>
            💀 You are dead — spectating
          </div>
        )}
      </div>
    );
  }

  function renderPhase() {
    return (
      <div className={`phase-banner ${phaseInfo.className}`}>
        {phaseInfo.icon} {phaseInfo.label} — Round {gameState.round}
      </div>
    );
  }

  function renderTargetList() {
    const isNight = phase === 'night';
    const isVoting = phase === 'voting';

    if (!amAlive) return null;
    if (isNight && myRole === 'citizen') {
      return (
        <div className="alert alert-info">
          👤 You're a citizen. Wait for the night to end.
        </div>
      );
    }
    if (phase === 'day') return null;

    const hasActed = isNight ? me?.hasActed : me?.hasVoted;
    if (hasActed) {
      return (
        <div className="alert alert-success">
          ✅ {isNight ? 'Action submitted!' : 'Vote cast!'} Waiting for others...
        </div>
      );
    }

    // Prompt + skip vote (target selection handled by table clicks)
    return (
      <>
        <div className="alert alert-info">
          {isNight
            ? `${roleInfo.icon} Click a player on the table to ${roleInfo.actionLabel?.toLowerCase()}`
            : '🗳️ Click a player on the table to vote'}
        </div>
        {isVoting && (
          <button className="btn btn-ghost btn-block btn-sm" onClick={onSkipVote}>
            ⏭️ Skip Vote
          </button>
        )}
      </>
    );
  }

  // ── Table Layout for Players ──
  function renderTableLayout() {
    const isNight = phase === 'night';
    const isVoting = phase === 'voting';
    const tableIcon = isNight ? '🌙' : phase === 'day' ? '☀️' : '🗳️';

    return (
      <div className="table-layout">
        <div className={`table-center ${isNight ? 'night' : phase === 'day' ? 'day' : 'voting'}`}>
          <span>{tableIcon}</span>
          <span>{isNight ? 'Night' : phase === 'day' ? 'Day' : 'Vote'}</span>
        </div>
        {players.map((p, i) => {
          const isMe = p.id === socketId;
          const isSelected = selectedTarget === p.id;
          const canTarget = p.alive && !isMe && (isNight || isVoting) && amAlive;
          const showVoted = p.alive && p.hasVoted && isVoting;

          return (
            <div
              key={p.id}
              className={`table-seat ${!p.alive ? 'is-dead' : ''} ${isSelected ? 'is-selected' : ''} ${canTarget ? 'is-targetable' : ''}`}
              style={getSeatPosition(i, players.length)}
              onClick={canTarget ? () => handleTargetSelect(p.id) : undefined}
            >
              <div className="seat-avatar" style={{
                background: p.alive ? `hsl(${(i * 47) % 360}, 60%, 45%)` : '#333',
                borderColor: isMe ? 'var(--accent-light)' : isSelected ? '#dc2626' : 'transparent',
              }}>
                {p.alive ? p.name.charAt(0).toUpperCase() : '💀'}
              </div>
              <div className="seat-name">{p.name}</div>
              {isMe && <div className="seat-you">You</div>}
              {!p.alive && <div className="seat-dead">💀</div>}
              {showVoted && <div className="seat-badge voted">✓</div>}
              {isSelected && <div className="seat-badge target">🎯</div>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderDayActions() {
    if (phase !== 'day') return null;
    return (
      <div style={{ marginTop: '1rem' }}>
        <div className="alert alert-warning">
          💬 Discussion time — talk and figure out who the Mafia is!
        </div>
        {isHost && (
          <button className="btn btn-primary btn-block" onClick={onAdvanceToVoting} style={{ marginTop: '0.5rem' }}>
            🗳️ Move to Voting
          </button>
        )}
      </div>
    );
  }

  function renderLog() {
    if (!gameState?.log || gameState.log.length === 0) return null;
    return (
      <div className="game-log" ref={logRef}>
        {gameState.log.map((entry, i) => (
          <div key={i} className={`log-entry log-${entry.type}`}>
            {entry.message}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page-center">
      <div className="content-wrapper" style={{ maxWidth: '700px' }}>
        <div className="card">
          {renderRoleCard()}
          {renderPhase()}
          {renderTimer()}

          {/* Investigation Result Modal */}
          {investigationResult && (
            <div className="modal-overlay" onClick={onClearInvestigation}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
                <h3 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                  Investigation Result
                </h3>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  <strong>{investigationResult.targetName}</strong> is...
                </p>
                <div style={{
                  fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                  color: investigationResult.isMafia ? '#dc2626' : '#22c55e',
                  marginBottom: '1rem'
                }}>
                  {investigationResult.isMafia ? '🔴 MAFIA!' : '🟢 NOT Mafia'}
                </div>
                <button className="btn btn-primary" onClick={onClearInvestigation}>
                  Got it
                </button>
              </div>
            </div>
          )}

          {/* Vote Result Modal */}
          {voteResult && (
            <div className="modal-overlay" onClick={onClearVoteResult}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                  {voteResult.tie ? '⚖️' : '⚰️'}
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}>
                  {voteResult.tie ? 'Vote Tied!' : 'Eliminated!'}
                </h3>
                {voteResult.eliminated && (
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    <strong>{voteResult.eliminated.name}</strong> was eliminated.
                    <br />
                    <span style={{ color: ROLE_INFO[voteResult.eliminated.role]?.color }}>
                      They were a {voteResult.eliminated.role}
                    </span>
                  </p>
                )}
                {voteResult.tie && (
                  <p style={{ color: 'var(--text-secondary)' }}>No one was eliminated.</p>
                )}
                <button className="btn btn-primary" onClick={onClearVoteResult} style={{ marginTop: '1rem' }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Table layout with players around it */}
          {renderTableLayout()}

          {renderTargetList()}
          {renderDayActions()}

          {/* Action confirm button for table clicks */}
          {selectedTarget && (phase === 'night' || phase === 'voting') && amAlive && (
            <div className="action-bar" style={{ marginTop: '1rem' }}>
              <button
                className={`btn ${phase === 'night' ? 'btn-danger' : 'btn-primary'} btn-block`}
                onClick={handleAction}
              >
                {phase === 'night'
                  ? `${roleInfo.icon} ${roleInfo.actionLabel} ${players.find(p => p.id === selectedTarget)?.name}`
                  : `🗳️ Vote ${players.find(p => p.id === selectedTarget)?.name}`}
              </button>
            </div>
          )}

          {renderLog()}
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate seat positions around an oval/circular table
 */
function getSeatPosition(index, total) {
  // Start from top (-90 degrees) and go clockwise
  const angle = ((index / total) * 360 - 90) * (Math.PI / 180);
  const radiusX = 42; // % horizontal
  const radiusY = 38; // % vertical

  const x = 50 + radiusX * Math.cos(angle);
  const y = 50 + radiusY * Math.sin(angle);

  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}
