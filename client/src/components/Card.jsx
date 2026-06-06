// Visual for a single card (action, trial, or character).

export default function Card({ card, size = 'md', selected, onClick, faceDown, badge, dimmed }) {
  if (faceDown) {
    return (
      <div className={`card-tile face-down size-${size} ${dimmed ? 'is-dimmed' : ''}`} onClick={onClick}>
        <span className="card-back-mark">🌙</span>
      </div>
    );
  }
  if (!card) return null;

  const typeClass = card.type ? `type-${card.type}` : card.kind ? `kind-${card.kind}` : 'type-char';

  return (
    <div
      className={`card-tile ${typeClass} size-${size} ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''} ${onClick ? 'is-clickable' : ''}`}
      onClick={onClick}
      title={card.desc || card.name}
    >
      {badge != null && <span className="card-badge">{badge}</span>}
      <div className="card-icon">{card.icon}</div>
      <div className="card-name">{card.name}</div>
      {size !== 'sm' && card.desc && <div className="card-desc">{card.desc}</div>}
    </div>
  );
}
