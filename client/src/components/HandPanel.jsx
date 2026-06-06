import Card from './Card';

// The player's private hand. Clicking a card selects it to play.
export default function HandPanel({ hand, selectedUid, onSelectCard, disabled }) {
  if (!hand || hand.length === 0) {
    return <div className="hand-panel empty">لا كروت في يدك</div>;
  }
  return (
    <div className={`hand-panel ${disabled ? 'is-disabled' : ''}`}>
      {hand.map((c) => (
        <Card
          key={c.uid}
          card={c.card}
          size="md"
          selected={selectedUid === c.uid}
          onClick={disabled ? undefined : () => onSelectCard(c.uid)}
        />
      ))}
    </div>
  );
}
