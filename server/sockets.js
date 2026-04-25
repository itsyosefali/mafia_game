// ============================================================
// sockets.js — Socket.IO Event Handlers
// ============================================================

const {
  createGame,
  addPlayer,
  removePlayer,
  getPublicState,
  getPlayerState,
  getAlivePlayers,
} = require('./game');

const {
  startGame,
  startNightPhase,
  submitNightAction,
  allNightActionsSubmitted,
  resolveNight,
  startDayPhase,
  startVotingPhase,
  submitVote,
  allVotesSubmitted,
  resolveVotes,
  endGame,
  nextRound,
  checkWinCondition,
} = require('./engine');

// In-memory game storage
const games = {};

// Map socket IDs to game/player info
const socketMap = {};

/**
 * Phase timing configuration (ms)
 */
const TIMERS = {
  NIGHT_DURATION: 30000, // 30s for night actions
  DAY_DURATION: 45000,   // 45s for discussion
  VOTING_DURATION: 20000, // 20s for voting
  REVEAL_DELAY: 5000,    // 5s to show results before next phase
};

/**
 * Set up socket handlers
 */
function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─────────────────────────────────────
    // CREATE GAME
    // ─────────────────────────────────────
    socket.on('create_game', ({ name }, callback) => {
      if (!name || name.trim().length === 0) {
        return callback({ success: false, error: 'Name is required' });
      }

      const game = createGame(socket.id, name.trim());
      games[game.id] = game;
      socketMap[socket.id] = { gameId: game.id, playerId: socket.id };

      socket.join(game.id);

      console.log(`[Game] Created ${game.id} by ${name}`);

      callback({ success: true, gameId: game.id });
      broadcastState(io, game);
    });

    // ─────────────────────────────────────
    // JOIN GAME
    // ─────────────────────────────────────
    socket.on('join_game', ({ gameId, name }, callback) => {
      if (!gameId || !name || name.trim().length === 0) {
        return callback({ success: false, error: 'Game ID and name are required' });
      }

      const game = games[gameId.toUpperCase()];
      if (!game) {
        return callback({ success: false, error: 'Game not found' });
      }

      const result = addPlayer(game, socket.id, name.trim());
      if (!result.success) {
        return callback(result);
      }

      socketMap[socket.id] = { gameId: game.id, playerId: socket.id };
      socket.join(game.id);

      console.log(`[Game ${game.id}] ${name} joined`);

      callback({ success: true, gameId: game.id });
      broadcastState(io, game);
    });

    // ─────────────────────────────────────
    // START GAME
    // ─────────────────────────────────────
    socket.on('start_game', (_, callback) => {
      const info = socketMap[socket.id];
      if (!info) return callback({ success: false, error: 'Not in a game' });

      const game = games[info.gameId];
      if (!game) return callback({ success: false, error: 'Game not found' });

      if (socket.id !== game.hostId) {
        return callback({ success: false, error: 'Only the host can start the game' });
      }

      const result = startGame(game);
      if (!result.success) return callback(result);

      callback({ success: true });

      // Send roles privately to each player
      game.players.forEach((player) => {
        io.to(player.id).emit('role_assigned', {
          role: player.role,
          teammates:
            player.role === 'mafia'
              ? game.players
                  .filter((p) => p.role === 'mafia' && p.id !== player.id)
                  .map((p) => ({ id: p.id, name: p.name }))
              : [],
        });
      });

      // Start night phase after a brief delay for role reveal
      setTimeout(() => {
        startNightPhase(game);
        broadcastState(io, game);
        startPhaseTimer(io, game, 'night');
      }, 3000);

      broadcastState(io, game);
    });

    // ─────────────────────────────────────
    // NIGHT ACTION
    // ─────────────────────────────────────
    socket.on('night_action', ({ targetId }, callback) => {
      const info = socketMap[socket.id];
      if (!info) return callback({ success: false, error: 'Not in a game' });

      const game = games[info.gameId];
      if (!game) return callback({ success: false, error: 'Game not found' });

      const result = submitNightAction(game, socket.id, targetId);
      if (!result.success) return callback(result);

      callback({ success: true });
      broadcastState(io, game);

      // Check if all actions are in
      if (allNightActionsSubmitted(game)) {
        clearPhaseTimer(game);
        processNightResolution(io, game);
      }
    });

    // ─────────────────────────────────────
    // VOTE
    // ─────────────────────────────────────
    socket.on('vote', ({ targetId }, callback) => {
      const info = socketMap[socket.id];
      if (!info) return callback({ success: false, error: 'Not in a game' });

      const game = games[info.gameId];
      if (!game) return callback({ success: false, error: 'Game not found' });

      const result = submitVote(game, socket.id, targetId);
      if (!result.success) return callback(result);

      callback({ success: true });
      broadcastState(io, game);

      // Check if all votes are in
      if (allVotesSubmitted(game)) {
        clearPhaseTimer(game);
        processVoteResolution(io, game);
      }
    });

    // ─────────────────────────────────────
    // SKIP VOTE
    // ─────────────────────────────────────
    socket.on('skip_vote', (_, callback) => {
      const info = socketMap[socket.id];
      if (!info) return callback({ success: false, error: 'Not in a game' });

      const game = games[info.gameId];
      if (!game) return callback({ success: false, error: 'Game not found' });

      const result = submitVote(game, socket.id, null);
      if (!result.success) return callback(result);

      callback({ success: true });
      broadcastState(io, game);

      if (allVotesSubmitted(game)) {
        clearPhaseTimer(game);
        processVoteResolution(io, game);
      }
    });

    // ─────────────────────────────────────
    // ADVANCE DAY (host only — skip discussion)
    // ─────────────────────────────────────
    socket.on('advance_to_voting', (_, callback) => {
      const info = socketMap[socket.id];
      if (!info) return callback({ success: false, error: 'Not in a game' });

      const game = games[info.gameId];
      if (!game) return callback({ success: false, error: 'Game not found' });
      if (game.phase !== 'day') return callback({ success: false, error: 'Not day phase' });

      clearPhaseTimer(game);
      startVotingPhase(game);
      broadcastState(io, game);
      startPhaseTimer(io, game, 'voting');

      callback({ success: true });
    });

    // ─────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      const info = socketMap[socket.id];
      if (info) {
        const game = games[info.gameId];
        if (game) {
          removePlayer(game, socket.id);
          broadcastState(io, game);

          // Clean up empty games
          if (game.players.length === 0) {
            clearPhaseTimer(game);
            delete games[info.gameId];
            console.log(`[Game] Cleaned up empty game ${info.gameId}`);
          }
        }
        delete socketMap[socket.id];
      }
    });

    // ─────────────────────────────────────
    // REQUEST STATE (reconnect helper)
    // ─────────────────────────────────────
    socket.on('request_state', (_, callback) => {
      const info = socketMap[socket.id];
      if (!info) return callback({ success: false, error: 'Not in a game' });

      const game = games[info.gameId];
      if (!game) return callback({ success: false, error: 'Game not found' });

      callback({ success: true, state: getPlayerState(game, socket.id) });
    });
  });
}

// ─────────────────────────────────────
// PHASE PROCESSING
// ─────────────────────────────────────

function processNightResolution(io, game) {
  const results = resolveNight(game);

  // Send detective results privately
  results.detectiveResults.forEach((result) => {
    io.to(result.detectiveId).emit('investigation_result', {
      targetName: result.targetName,
      targetId: result.targetId,
      isMafia: result.isMafia,
    });
  });

  // Check win condition
  const winner = checkWinCondition(game);
  if (winner) {
    endGame(game, winner);
    broadcastState(io, game);
    return;
  }

  // Transition to day
  startDayPhase(game);
  broadcastState(io, game);
  startPhaseTimer(io, game, 'day');
}

function processVoteResolution(io, game) {
  const results = resolveVotes(game);

  // Emit vote results to all
  io.to(game.id).emit('vote_result', {
    eliminated: results.eliminated,
    voteCounts: results.voteCounts,
    tie: results.tie,
  });

  // Check win condition
  const winner = checkWinCondition(game);
  if (winner) {
    setTimeout(() => {
      endGame(game, winner);
      broadcastState(io, game);
    }, TIMERS.REVEAL_DELAY);
    return;
  }

  // Move to next round
  setTimeout(() => {
    nextRound(game);
    startNightPhase(game);
    broadcastState(io, game);
    startPhaseTimer(io, game, 'night');
  }, TIMERS.REVEAL_DELAY);
}

// ─────────────────────────────────────
// PHASE TIMERS
// ─────────────────────────────────────

const phaseTimers = {};

function startPhaseTimer(io, game, phase) {
  clearPhaseTimer(game);

  const duration =
    phase === 'night'
      ? TIMERS.NIGHT_DURATION
      : phase === 'day'
      ? TIMERS.DAY_DURATION
      : TIMERS.VOTING_DURATION;

  // Emit timer start
  io.to(game.id).emit('timer_start', { phase, duration });

  phaseTimers[game.id] = setTimeout(() => {
    if (game.phase !== phase) return;

    if (phase === 'night') {
      // Auto-resolve night with whatever actions we have
      processNightResolution(io, game);
    } else if (phase === 'day') {
      // Auto-advance to voting
      startVotingPhase(game);
      broadcastState(io, game);
      startPhaseTimer(io, game, 'voting');
    } else if (phase === 'voting') {
      // Auto-resolve votes (missing votes treated as skip)
      getAlivePlayers(game).forEach((p) => {
        if (p.vote === null) {
          p.vote = null;
          game.votes[p.id] = null;
        }
      });
      processVoteResolution(io, game);
    }
  }, duration);
}

function clearPhaseTimer(game) {
  if (phaseTimers[game.id]) {
    clearTimeout(phaseTimers[game.id]);
    delete phaseTimers[game.id];
  }
}

// ─────────────────────────────────────
// BROADCAST
// ─────────────────────────────────────

function broadcastState(io, game) {
  // Send personalized state to each player
  game.players.forEach((player) => {
    const state = getPlayerState(game, player.id);
    io.to(player.id).emit('game_state', state);
  });
}

module.exports = { setupSockets };
