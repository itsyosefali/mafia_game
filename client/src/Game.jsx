import { useEffect, useRef, useState } from 'react';
import GameBoard from './components/GameBoard';
import HandPanel from './components/HandPanel';
import NightOverlay from './components/NightOverlay';
import EndScreen from './components/EndScreen';
import { TrialModal, AttackModal, LastWordsModal } from './components/Modals';
import Card from './components/Card';
import { playSound } from './sound';

export default function Game({ game }) {
  const { gameState, timer, drawnCards, clearDrawnCards } = game;
  const [selectedUid, setSelectedUid] = useState(null);
  const [flash, setFlash] = useState(null);

  const me = gameState?.me;
  const phase = gameState?.phase;

  // Play a sound when the phase changes (external system; no React state set here).
  const soundPhase = useRef(phase);
  useEffect(() => {
    if (phase && phase !== soundPhase.current) {
      soundPhase.current = phase;
      if (phase === 'night') playSound('night');
      else if (phase === 'day') playSound('day');
      else if (phase === 'trial') playSound('trial');
      else if (phase === 'attack_response') playSound('attack');
      else if (phase === 'ended') playSound(gameState?.winner === me?.team ? 'win' : 'lose');
    }
  }, [phase, gameState?.winner, me?.team]);

  // Phase-transition flash: derived at render time from the previous phase
  // (avoids the "setState in effect" cascade rule); cleared on animation end.
  const flashPhase = useRef(phase);
  if (phase !== flashPhase.current) {
    flashPhase.current = phase;
    if (phase === 'night') setFlash({ icon: '🌙', label: 'حلّ الليل' });
    else if (phase === 'day') setFlash({ icon: '☀️', label: 'أشرق النهار' });
  }

  // Play a thud when the public log gains a death entry.
  const prevLogLen = useRef(gameState?.log?.length || 0);
  useEffect(() => {
    const log = gameState?.log || [];
    if (log.length > prevLogLen.current) {
      const fresh = log.slice(prevLogLen.current);
      if (fresh.some((e) => e.type === 'death')) playSound('death');
    }
    prevLogLen.current = log.length;
  }, [gameState?.log]);

  // Clear any in-progress card selection whenever the turn/phase/event changes.
  const resetKey = `${phase}|${gameState?.currentTurnPlayerId}|${gameState?.pendingEvent?.type}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setSelectedUid(null);
  }

  useEffect(() => {
    if (!drawnCards) return;
    const t = setTimeout(() => clearDrawnCards(), 3000);
    return () => clearTimeout(t);
  }, [drawnCards, clearDrawnCards]);

  if (!gameState || !me) return null;

  if (phase === 'ended') return <EndScreen gameState={gameState} />;

  const pending = gameState.pendingEvent;
  const isMyTurn = me.isMyTurn && me.alive;
  const selectedCard = selectedUid ? me.hand.find((c) => c.uid === selectedUid)?.card : null;
  const needsTarget = selectedCard && selectedCard.target === 'player';

  function isTargetable(p) {
    if (!needsTarget) return false;
    return p.alive && p.id !== me.id;
  }

  function onSelectTarget(targetId) {
    if (!selectedUid) return;
    playSound('play');
    game.playCard(selectedUid, { targetId });
    setSelectedUid(null);
  }

  function playSelfOrNone() {
    if (!selectedUid) return;
    playSound('play');
    game.playCard(selectedUid, {});
    setSelectedUid(null);
  }

  function handleDraw() {
    playSound('draw');
    game.drawCards();
  }

  function handleEndTurn() {
    playSound('turn');
    game.endTurn();
  }

  const showNight = phase === 'night';
  const showTrial = pending?.type === 'trial';
  const showAttack = pending?.type === 'attack_response';
  const showLastWords = pending?.type === 'last_words';

  const myRoleLabel = me.isMasterWitch
    ? 'كبير السحرة'
    : me.isWitch
    ? 'سحّارة'
    : me.isSheikh
    ? 'الشيخ'
    : 'مواطن';
  const myRoleClass = me.isWitch ? 'role-sahara' : me.isSheikh ? 'role-sheikh' : 'role-citizen';

  return (
    <div className="game-screen">
      {flash && (
        <div
          className={`phase-flash flash-${phase}`}
          key={`${phase}-${gameState.round}`}
          onAnimationEnd={(e) => {
            if (e.animationName === 'flashFade') setFlash(null);
          }}
        >
          <div className="phase-flash-icon">{flash.icon}</div>
          <div className="phase-flash-label">{flash.label}</div>
        </div>
      )}
      <GameBoard
        gameState={gameState}
        meId={me.id}
        selectable={needsTarget}
        selectedTargetId={null}
        isTargetable={isTargetable}
        onSelectTarget={onSelectTarget}
        timer={timer}
      />

      {drawnCards && drawnCards.length > 0 && (
        <div className="drawn-toast">
          سحبت: {drawnCards.map((c) => c.card?.name).filter(Boolean).join('، ') || 'كرت أسود نُفّذ فوراً'}
        </div>
      )}

      <div className="bottom-panel">
        <div className="me-bar">
          <span className={`me-role ${myRoleClass}`}>أنت: {myRoleLabel}</span>
          {me.hasGreatness && <span className="me-flag">👑 العظمة</span>}
          <div className="me-trials">
            {me.trials.map((t) => (
              <Card key={t.uid} card={t.card} size="sm" dimmed={t.revealed} />
            ))}
          </div>
        </div>

        {me.alive ? (
          <>
            <HandPanel
              hand={me.hand}
              selectedUid={selectedUid}
              onSelectCard={(uid) => setSelectedUid(uid === selectedUid ? null : uid)}
              disabled={!isMyTurn || !!pending || phase !== 'day'}
            />

            <div className="action-bar">
              {phase === 'day' && isMyTurn && !pending && (
                <>
                  {!selectedCard && (
                    <>
                      <button className="btn btn-primary" onClick={handleDraw}>
                        🂠 اسحب كرتين
                      </button>
                      <button className="btn btn-ghost" onClick={handleEndTurn}>
                        ⏭️ أنهِ الدور
                      </button>
                    </>
                  )}
                  {selectedCard && !needsTarget && (
                    <>
                      <button className="btn btn-success" onClick={playSelfOrNone}>
                        ▶️ العب {selectedCard.name}
                      </button>
                      <button className="btn btn-ghost" onClick={() => setSelectedUid(null)}>
                        إلغاء
                      </button>
                    </>
                  )}
                  {selectedCard && needsTarget && (
                    <>
                      <span className="action-hint">🎯 اختر هدفاً لـ {selectedCard.name}</span>
                      <button className="btn btn-ghost" onClick={() => setSelectedUid(null)}>
                        إلغاء
                      </button>
                    </>
                  )}
                </>
              )}
              {phase === 'day' && !isMyTurn && !pending && (
                <span className="action-hint">⏳ دور {nameOf(gameState, gameState.currentTurnPlayerId)}</span>
              )}
            </div>
          </>
        ) : (
          <div className="spectating">💀 أنت خارج اللعبة الآن — تتفرّج بصمت.</div>
        )}
      </div>

      <GameLog log={gameState.log} />

      {showNight && (
        <NightOverlay
          gameState={gameState}
          onWitchVote={(id) => game.witchVote(id)}
          onSheikhProtect={(id) => game.sheikhProtect(id)}
        />
      )}
      {showTrial && <TrialModal gameState={gameState} onReveal={(i) => game.resolveTrial(i)} />}
      {showAttack && <AttackModal gameState={gameState} onRespond={(defend) => game.attackResponse(defend)} />}
      {showLastWords && <LastWordsModal gameState={gameState} onSubmit={(w) => game.submitLastWords(w)} />}
    </div>
  );
}

function nameOf(gameState, id) {
  const p = (gameState.players || []).find((x) => x.id === id);
  return p ? p.name : '؟';
}

function GameLog({ log }) {
  const recent = (log || []).slice(-30);
  return (
    <div className="game-log">
      {recent.map((entry, i) => (
        <div key={i} className={`log-entry log-${entry.type}`}>
          {entry.message}
        </div>
      ))}
    </div>
  );
}
