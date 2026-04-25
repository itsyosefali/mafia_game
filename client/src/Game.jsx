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

  useEffect(() => {
    setSelectedTarget(null);
  }, [phase]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.log]);

  // ── Winner Screen ──
  if (phase === 'ended') {
    const isMafiaWin = gameState.winner === 'mafia';
    return (
      <div className="page-center">
        <div className="content-wrapper">
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
              <div className="section-title">Final Roles</div>
              <div className="player-list">
                {players.map((p, i) => {
                  const pRole = findPlayerRole(p, gameState);
                  const ri = ROLE_INFO[pRole] || ROLE_INFO.citizen;
                  return (
                    <div className={`player-item ${!p.alive ? 'is-dead' : ''}`} key={p.id}>
                      <div className="player-avatar" style={{ background: ri.color }}>
                        {ri.icon}
                      </div>
                      <span className="player-name">{p.name}</span>
                      <span className="player-badge" style={{
                        background: `${ri.color}22`, color: ri.color
                      }}>
                        {pRole}
                      </span>
                      {!p.alive && <span className="player-badge badge-dead">Dead</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            {renderLog()}
          </div>
        </div>
      </div>
    );
  }

  function findPlayerRole(p) {
    if (p.id === socketId) return myRole;
    if (myRole === 'mafia') {
      const teammate = gameState?.players?.find(
        (pl) => pl.id === p.id
      );
      // In ended state, server reveals roles via log
    }
    // Default: we don't know other roles during game
    return p.role || 'citizen'; // Server sends roles in ended state
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
      if (phase === 'night' && myRole === 'doctor') {
        // Doctor can protect self (remove self-filter for doctor)
        return p.alive;
      }
      return true;
    });
  }

  function getValidTargetsDoctor() {
    return players.filter((p) => p.alive); // Doctor can protect anyone including self
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

    const targets = myRole === 'doctor' && isNight
      ? getValidTargetsDoctor()
      : getValidTargets();

    return (
      <>
        <div className="section-title">
          {isNight ? `${roleInfo.actionLabel} Target` : 'Vote to Eliminate'}
        </div>
        <div className="player-list">
          {targets.map((p, i) => (
            <div
              key={p.id}
              className={`player-item is-target ${selectedTarget === p.id ? 'is-selected' : ''}`}
              onClick={() => handleTargetSelect(p.id)}
            >
              <div
                className="player-avatar"
                style={{ background: `hsl(${(i * 47) % 360}, 60%, 45%)` }}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="player-name">{p.name}</span>
              {selectedTarget === p.id && (
                <span className="player-badge" style={{
                  background: isNight ? 'rgba(220,38,38,0.2)' : 'rgba(124,58,237,0.2)',
                  color: isNight ? '#dc2626' : 'var(--accent-light)',
                }}>
                  🎯 Target
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="action-bar">
          <button
            className={`btn ${phase === 'night' ? 'btn-danger' : 'btn-primary'} btn-block`}
            disabled={!selectedTarget}
            onClick={handleAction}
          >
            {phase === 'night'
              ? `${roleInfo.icon} ${roleInfo.actionLabel}`
              : '🗳️ Cast Vote'}
          </button>
          {isVoting && (
            <button className="btn btn-ghost btn-block" onClick={onSkipVote}>
              ⏭️ Skip Vote
            </button>
          )}
        </div>
      </>
    );
  }

  function renderPlayerStatus() {
    return (
      <>
        <div className="section-title">Players</div>
        <div className="player-list">
          {players.map((p, i) => (
            <div className={`player-item ${!p.alive ? 'is-dead' : ''}`} key={p.id}>
              <div
                className="player-avatar"
                style={{ background: p.alive ? `hsl(${(i * 47) % 360}, 60%, 45%)` : '#333' }}
              >
                {p.alive ? p.name.charAt(0).toUpperCase() : '💀'}
              </div>
              <span className="player-name">{p.name}</span>
              {p.id === socketId && <span className="player-badge badge-you">You</span>}
              {!p.alive && <span className="player-badge badge-dead">Dead</span>}
              {p.alive && p.hasVoted && phase === 'voting' && (
                <span className="player-badge badge-voted">Voted</span>
              )}
              {p.alive && p.hasActed && phase === 'night' && (
                <span className="player-badge badge-acted">Ready</span>
              )}
            </div>
          ))}
        </div>
      </>
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
      <div className="content-wrapper" style={{ maxWidth: '560px' }}>
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

          {renderTargetList()}
          {renderDayActions()}

          <div style={{ marginTop: '1.5rem' }}>
            {renderPlayerStatus()}
          </div>

          {renderLog()}
        </div>
      </div>
    </div>
  );
}
