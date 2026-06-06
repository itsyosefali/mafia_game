import PlayerSeat from './PlayerSeat';

const PHASE_LABELS = {
  day: { icon: '☀️', label: 'النهار' },
  night: { icon: '🌙', label: 'الليل' },
  trial: { icon: '⚖️', label: 'المحاكمة' },
  attack_response: { icon: '🗡️', label: 'هجوم' },
  conspiracy: { icon: '🩸', label: 'المؤامرة' },
};

export default function GameBoard({
  gameState,
  meId,
  selectable,
  selectedTargetId,
  isTargetable,
  onSelectTarget,
  timer,
}) {
  const players = gameState.players || [];
  const phaseInfo = PHASE_LABELS[gameState.phase] || { icon: '🎴', label: gameState.phase };

  return (
    <div className={`board phase-${gameState.phase}`}>
      <div className="board-banner">
        <span className="board-phase">
          {phaseInfo.icon} {phaseInfo.label}
        </span>
        <span className="board-round">جولة {gameState.round}</span>
        {timer && timer.remaining > 0 && (
          <span className={`board-timer ${timer.remaining <= 10 ? 'is-low' : ''}`}>⏱️ {timer.remaining}</span>
        )}
      </div>

      <div className="table-layout">
        <div className={`table-center center-${gameState.phase}`}>
          <span className="center-icon">{phaseInfo.icon}</span>
          <span className="center-pile">🂠 {gameState.drawPileCount}</span>
          <span className="center-discard">🗑️ {gameState.discardCount}</span>
        </div>

        {players.map((p, i) => {
          const targetable = selectable && isTargetable && isTargetable(p);
          return (
            <PlayerSeat
              key={p.id}
              player={p}
              isMe={p.id === meId}
              isCurrentTurn={p.id === gameState.currentTurnPlayerId}
              selectable={targetable}
              selected={selectedTargetId === p.id}
              onSelect={onSelectTarget}
              style={seatPosition(i, players.length)}
            />
          );
        })}
      </div>
    </div>
  );
}

function seatPosition(index, total) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radiusX = 42;
  const radiusY = 38;
  const x = 50 + radiusX * Math.cos(angle);
  const y = 50 + radiusY * Math.sin(angle);
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  };
}
