import Card from './Card';

export default function EndScreen({ gameState }) {
  const saharaWin = gameState.winner === 'sahara';
  const players = gameState.players || [];

  return (
    <div className="page-center">
      <div className="content-wrapper" style={{ maxWidth: '760px' }}>
        <div className="card">
          <div className="winner-screen">
            <div className="winner-icon">{saharaWin ? '🧙‍♀️' : '🧍'}</div>
            <div className={`winner-title ${saharaWin ? 'winner-sahara' : 'winner-citizens'}`}>
              {saharaWin ? 'فاز فريق السحارة!' : 'فاز المواطنون!'}
            </div>
            <p className="winner-sub">
              {saharaWin
                ? 'سيطرت السحارة على حواري طرابلس...'
                : 'طُهّرت الحارة من كل السحارة!'}
            </p>
          </div>

          <div className="section-title" style={{ textAlign: 'center' }}>كشف الأوراق</div>
          <div className="reveal-grid">
            {players.map((p) => {
              const isWitch = (p.revealedTrials || []).some((t) => t.kind === 'sahara');
              const isSheikh = (p.revealedTrials || []).some((t) => t.kind === 'sheikh');
              const team = isWitch ? 'سحّارة' : isSheikh ? 'الشيخ' : 'مواطن';
              return (
                <div key={p.id} className={`reveal-row ${!p.alive ? 'is-dead' : ''}`}>
                  <div className="reveal-head">
                    <span className="reveal-name">
                      {p.name} {!p.alive && '💀'}
                    </span>
                    <span className={`reveal-team team-${isWitch ? 'sahara' : isSheikh ? 'sheikh' : 'citizen'}`}>
                      {team}
                    </span>
                  </div>
                  <div className="reveal-trials">
                    {(p.revealedTrials || []).map((t) => (
                      <Card key={t.uid} card={t.card} size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
