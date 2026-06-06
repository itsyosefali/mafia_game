import { useState } from 'react';
import Card from './Card';

// Trial: the last accuser reveals one of the accused's hidden trial cards.
export function TrialModal({ gameState, onReveal }) {
  const e = gameState.pendingEvent;
  const accused = gameState.players.find((p) => p.id === e.accusedId);
  const amAccuser = gameState.me.id === e.accuserId;

  if (!amAccuser) {
    return (
      <Overlay>
        <h2 className="modal-title">⚖️ محاكمة {accused?.name}</h2>
        <p className="modal-sub">يكشف صاحب التهمة الأخيرة إحدى أوراق المحاكمة...</p>
        <div className="sleep-dots"><span /><span /><span /></div>
      </Overlay>
    );
  }

  // The accused's hidden trial count = trialCount - revealedTrials.length.
  const revealedUids = new Set((accused?.revealedTrials || []).map((t) => t.uid));
  const hiddenCount = (accused?.trialCount || 0) - revealedUids.size;

  return (
    <Overlay>
      <h2 className="modal-title">⚖️ محاكمة {accused?.name}</h2>
      <p className="modal-sub">اختر ورقة محاكمة مخفية لتكشفها. إن كانت سحّارة يُعدَم!</p>
      <div className="trial-pick">
        {Array.from({ length: hiddenCount }).map((_, i) => (
          <button key={i} className="trial-facedown" onClick={() => onReveal(i)}>
            <Card faceDown size="md" />
          </button>
        ))}
      </div>
    </Overlay>
  );
}

// Attack response: the victim defends (discards two) or stays silent.
export function AttackModal({ gameState, onRespond }) {
  const e = gameState.pendingEvent;
  const amVictim = gameState.me.id === e.victimId;
  const victim = gameState.players.find((p) => p.id === e.victimId);
  const canDefend = gameState.me.hand.length >= 2;

  if (!amVictim) {
    return (
      <Overlay>
        <h2 className="modal-title">🗡️ هُوجم {victim?.name}!</h2>
        <p className="modal-sub">ينتظر الجميع رده... هل يدافع أم يصمت؟</p>
        <div className="sleep-dots"><span /><span /><span /></div>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <h2 className="modal-title">🗡️ هوجمت في الليل!</h2>
      <p className="modal-sub">
        دافع عن نفسك بالتخلي عن كرتين، أو اصمت إن كنت تظن أن الشيخ حماك.
      </p>
      <div className="modal-actions">
        <button className="btn btn-success" disabled={!canDefend} onClick={() => onRespond(true)}>
          🛡️ دافع (تخلَّ عن كرتين)
        </button>
        <button className="btn btn-danger" onClick={() => onRespond(false)}>
          🤐 ابقَ صامتاً
        </button>
      </div>
      {!canDefend && <p className="modal-hint">لا تملك كروتاً كافية للدفاع.</p>}
    </Overlay>
  );
}

// Last words: up to three words before going silent.
export function LastWordsModal({ gameState, onSubmit }) {
  const e = gameState.pendingEvent;
  const amDead = gameState.me.id === e.playerId;
  const player = gameState.players.find((p) => p.id === e.playerId);
  const [text, setText] = useState('');

  if (!amDead) {
    return (
      <Overlay>
        <h2 className="modal-title">🪦 سقط {player?.name}</h2>
        <p className="modal-sub">كلماته الأخيرة...</p>
        <div className="sleep-dots"><span /><span /><span /></div>
      </Overlay>
    );
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const tooMany = words.length > 3;

  return (
    <Overlay>
      <h2 className="modal-title">🪦 لقد سقطت</h2>
      <p className="modal-sub">لك ثلاث كلمات أخيرة، ثم الصمت إلى الأبد.</p>
      <input
        className="input"
        value={text}
        onChange={(ev) => setText(ev.target.value)}
        placeholder="ثلاث كلمات..."
        maxLength={60}
        autoFocus
      />
      <p className={`modal-hint ${tooMany ? 'is-error' : ''}`}>{words.length}/3 كلمات</p>
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={tooMany} onClick={() => onSubmit(text)}>
          🗣️ قُلها
        </button>
        <button className="btn btn-ghost" onClick={() => onSubmit('')}>
          صمت
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">{children}</div>
    </div>
  );
}
