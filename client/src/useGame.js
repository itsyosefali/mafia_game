import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';

export function useGame() {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState(null);
  const [investigationResult, setInvestigationResult] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [timer, setTimer] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      setError(null);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onGameState(state) {
      setGameState(state);
    }

    function onInvestigationResult(result) {
      setInvestigationResult(result);
    }

    function onVoteResult(result) {
      setVoteResult(result);
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
    socket.on('investigation_result', onInvestigationResult);
    socket.on('vote_result', onVoteResult);
    socket.on('timer_start', onTimerStart);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_state', onGameState);
      socket.off('investigation_result', onInvestigationResult);
      socket.off('vote_result', onVoteResult);
      socket.off('timer_start', onTimerStart);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const createGame = useCallback((name) => {
    return new Promise((resolve) => {
      socket.emit('create_game', { name }, (response) => {
        if (!response.success) setError(response.error);
        else setError(null);
        resolve(response);
      });
    });
  }, []);

  const joinGame = useCallback((gameId, name) => {
    return new Promise((resolve) => {
      socket.emit('join_game', { gameId, name }, (response) => {
        if (!response.success) setError(response.error);
        else setError(null);
        resolve(response);
      });
    });
  }, []);

  const startGame = useCallback(() => {
    return new Promise((resolve) => {
      socket.emit('start_game', null, (response) => {
        if (!response.success) setError(response.error);
        resolve(response);
      });
    });
  }, []);

  const nightAction = useCallback((targetId) => {
    return new Promise((resolve) => {
      socket.emit('night_action', { targetId }, (response) => {
        if (!response.success) setError(response.error);
        resolve(response);
      });
    });
  }, []);

  const vote = useCallback((targetId) => {
    return new Promise((resolve) => {
      socket.emit('vote', { targetId }, (response) => {
        if (!response.success) setError(response.error);
        resolve(response);
      });
    });
  }, []);

  const skipVote = useCallback(() => {
    return new Promise((resolve) => {
      socket.emit('skip_vote', null, (response) => {
        if (!response.success) setError(response.error);
        resolve(response);
      });
    });
  }, []);

  const advanceToVoting = useCallback(() => {
    return new Promise((resolve) => {
      socket.emit('advance_to_voting', null, (response) => {
        if (!response.success) setError(response.error);
        resolve(response);
      });
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearInvestigation = useCallback(() => setInvestigationResult(null), []);
  const clearVoteResult = useCallback(() => setVoteResult(null), []);

  return {
    gameState,
    connected,
    error,
    investigationResult,
    voteResult,
    timer,
    createGame,
    joinGame,
    startGame,
    nightAction,
    vote,
    skipVote,
    advanceToVoting,
    clearError,
    clearInvestigation,
    clearVoteResult,
    socketId: socket.id,
  };
}
