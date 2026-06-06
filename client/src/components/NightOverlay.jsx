function NightStars() {
  return (
    <div className="night-stars" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} style={{ '--i': i }} />
      ))}
    </div>
  );
}

// Full-screen night overlay. Witches choose a victim; the Sheikh protects.
export default function NightOverlay({ gameState, onWitchVote, onSheikhProtect }) {
  const me = gameState.me;
  const players = gameState.players || [];
  const alive = players.filter((p) => p.alive);
  const myId = me.id;

  const amWitch = me.isWitch && me.alive;
  const amSheikh = !amWitch && me.isSheikh && me.alive;

  if (amWitch) {
    const targets = alive.filter((p) => p.id !== myId && !isTeammate(me, p));
    return (
      <div className="night-overlay witch">
        <NightStars />
        <div className="night-card">
          <h2 className="night-title">🧙‍♀️ استيقظت السحارة</h2>
          {me.witchTeammates.length > 0 && (
            <p className="night-sub">
              رفاقك: {me.witchTeammates.map((t) => t.name).join('، ')}
            </p>
          )}
          <p className="night-sub">اختاري الضحية بصمت:</p>
          <div className="night-targets">
            {targets.map((p) => (
              <button key={p.id} className="btn btn-outline night-target" onClick={() => onWitchVote(p.id)}>
                🗡️ {p.name}
              </button>
            ))}
          </div>
          <p className="night-hint">سيُحسم الهدف بأغلبية أصوات السحارة.</p>
        </div>
      </div>
    );
  }

  if (amSheikh) {
    const targets = alive.filter((p) => p.id !== myId);
    return (
      <div className="night-overlay sheikh">
        <NightStars />
        <div className="night-card">
          <h2 className="night-title">🛡️ استيقظ الشيخ</h2>
          <p className="night-sub">اختر لاعباً لحمايته هذه الليلة:</p>
          <div className="night-targets">
            {targets.map((p) => (
              <button key={p.id} className="btn btn-outline night-target" onClick={() => onSheikhProtect(p.id)}>
                🛡️ {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="night-overlay sleeping">
      <NightStars />
      <div className="night-card">
        <h2 className="night-title">🌙 المدينة نائمة</h2>
        <p className="night-sub">أغمض عينيك... تتحرك السحارة في الظلام.</p>
        <div className="sleep-dots"><span /><span /><span /></div>
      </div>
    </div>
  );
}

function isTeammate(me, p) {
  return me.witchTeammates.some((t) => t.id === p.id);
}
