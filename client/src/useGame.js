import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';

function emitWithAck(event, payload, setError) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response) => {
      if (response && !response.success) setError(response.error);
      else setError(null);
      resolve(response || { success: false });
    });
  });
}

export function useGame() {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(null);
  const [drawnCards, setDrawnCards] = useState(null);
  const [socketId, setSocketId] = useState(socket.id);
  const timerRef = useRef(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      setSocketId(socket.id);
      setError(null);
      socket.emit('request_state', null, (res) => {
        if (res && res.success && res.state) setGameState(res.state);
      });
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onGameState(state) {
      setGameState(state);
    }
    function onCardDrawn(payload) {
      setDrawnCards(payload.cards || []);
    }
    function onTimerStart({ phase, duration }) {
      if (timerRef.current) clearInterval(timerRef.current);
      const endTime = Date.now() + duration;
      setTimer({ phase, remaining: Math.ceil(duration / 1000) });
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimer({ phase, remaining });
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, 250);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game_state', onGameState);
    socket.on('card_drawn', onCardDrawn);
    socket.on('timer_start', onTimerStart);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_state', onGameState);
      socket.off('card_drawn', onCardDrawn);
      socket.off('timer_start', onTimerStart);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const createGame = useCallback((name) => emitWithAck('create_game', { name }, setError), []);
  const joinGame = useCallback((gameId, name) => emitWithAck('join_game', { gameId, name }, setError), []);
  const startGame = useCallback(() => emitWithAck('start_game', null, setError), []);
  const addBot = useCallback(() => emitWithAck('add_bot', null, setError), []);
  const removeBot = useCallback((botId) => emitWithAck('remove_bot', { botId }, setError), []);
  const drawCards = useCallback(() => emitWithAck('draw_cards', null, setError), []);
  const playCard = useCallback((uid, payload) => emitWithAck('play_card', { uid, payload }, setError), []);
  const endTurn = useCallback(() => emitWithAck('end_turn', null, setError), []);
  const resolveTrial = useCallback((trialIndex) => emitWithAck('resolve_trial', { trialIndex }, setError), []);
  const witchVote = useCallback((targetId) => emitWithAck('witch_vote', { targetId }, setError), []);
  const sheikhProtect = useCallback((targetId) => emitWithAck('sheikh_protect', { targetId }, setError), []);
  const attackResponse = useCallback((defend) => emitWithAck('attack_response', { defend }, setError), []);
  const submitLastWords = useCallback((words) => emitWithAck('submit_last_words', { words }, setError), []);

  const clearError = useCallback(() => setError(null), []);
  const clearDrawnCards = useCallback(() => setDrawnCards(null), []);

  return {
    gameState,
    connected,
    error,
    timer,
    drawnCards,
    socketId,
    createGame,
    joinGame,
    startGame,
    addBot,
    removeBot,
    drawCards,
    playCard,
    endTurn,
    resolveTrial,
    witchVote,
    sheikhProtect,
    attackResponse,
    submitLastWords,
    clearError,
    clearDrawnCards,
  };
}
