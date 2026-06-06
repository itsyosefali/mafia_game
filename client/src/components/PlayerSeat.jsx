import Card from './Card';

// A single seat around the table.
export default function PlayerSeat({
  player,
  isMe,
  isCurrentTurn,
  selectable,
  selected,
  onSelect,
  style,
}) {
  const initial = player.name.charAt(0).toUpperCase();
  const classes = [
    'seat',
    player.alive ? '' : 'is-dead',
    isCurrentTurn ? 'is-turn' : '',
    selectable ? 'is-selectable' : '',
    selected ? 'is-selected' : '',
    !player.connected ? 'is-offline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={style} onClick={selectable ? () => onSelect(player.id) : undefined}>
      <div className="seat-top">
        <div className="seat-avatar" style={{ background: `hsl(${hashHue(player.id)}, 55%, 42%)` }}>
          {initial}
        </div>
        {player.redCount > 0 && (
          <span className="seat-reds" title="تهم">
            🔪 {player.redCount}
          </span>
        )}
        {player.hasGreatness && <span className="seat-crown" title="العظمة">👑</span>}
      </div>

      <div className="seat-name">
        {player.name}
        {isMe && <span className="seat-you">أنت</span>}
        {player.isHost && <span className="seat-host">المضيف</span>}
        {player.isBot && <span className="seat-bot">🤖</span>}
      </div>

      {player.characterCard && (
        <div className="seat-character" title={player.characterCard.desc}>
          <span className="seat-character-icon">{player.characterCard.icon}</span>
          <span className="seat-character-name">{player.characterCard.name}</span>
        </div>
      )}

      {player.revealedTrials && player.revealedTrials.length > 0 && (
        <div className="seat-trials">
          {player.revealedTrials.map((t) => (
            <Card key={t.uid} card={t.card} size="sm" />
          ))}
        </div>
      )}

      {player.inFront && player.inFront.length > 0 && (
        <div className="seat-infront">
          {player.inFront.map((c) => (
            <span key={c.uid} className={`infront-chip type-${c.card?.type || 'char'}`} title={c.card?.name}>
              {c.card?.icon}
            </span>
          ))}
        </div>
      )}

      {player.linkedTo && <span className="seat-link" title="مرتبط">🔗</span>}

      {!player.alive && player.lastWords && (
        <div className="seat-lastwords">«{player.lastWords}»</div>
      )}
      {!player.alive && <div className="seat-dead-mark">💀</div>}
    </div>
  );
}

function hashHue(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
