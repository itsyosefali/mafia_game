// ============================================================
// game.js — Game State & Logic
// ============================================================

const { v4: uuidv4 } = require('uuid');

/**
 * Role configuration based on player count
 * Maps total player count to role distribution
 */
const ROLE_CONFIG = {
  4: { mafia: 1, doctor: 1, detective: 0, citizen: 2 },
  5: { mafia: 1, doctor: 1, detective: 1, citizen: 2 },
  6: { mafia: 2, doctor: 1, detective: 1, citizen: 2 },
  7: { mafia: 2, doctor: 1, detective: 1, citizen: 3 },
  8: { mafia: 2, doctor: 1, detective: 1, citizen: 4 },
  9: { mafia: 3, doctor: 1, detective: 1, citizen: 4 },
  10: { mafia: 3, doctor: 1, detective: 1, citizen: 5 },
};

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Create a new game instance
 */
function createGame(hostId, hostName) {
  const gameId = uuidv4().slice(0, 8).toUpperCase();
  return {
    id: gameId,
    phase: 'lobby',
    round: 0,
    hostId: hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        role: null,
        alive: true,
        vote: null,
        action: null,
        connected: true,
      },
    ],
    nightActions: [],
    votes: {},
    nightDeathId: null,
    dayEliminatedId: null,
    winner: null,
    log: [],
  };
}

/**
 * Add a player to the game
 */
function addPlayer(game, playerId, playerName) {
  if (game.phase !== 'lobby') {
    return { success: false, error: 'Game already started' };
  }

  if (game.players.length >= 10) {
    return { success: false, error: 'Game is full (max 10 players)' };
  }

  const existing = game.players.find((p) => p.id === playerId);
  if (existing) {
    existing.connected = true;
    existing.name = playerName;
    return { success: true, reconnect: true };
  }

  // Check for duplicate name
  const nameTaken = game.players.find(
    (p) => p.name.toLowerCase() === playerName.toLowerCase()
  );
  if (nameTaken) {
    return { success: false, error: 'Name already taken' };
  }

  game.players.push({
    id: playerId,
    name: playerName,
    role: null,
    alive: true,
    vote: null,
    action: null,
    connected: true,
  });

  return { success: true };
}

/**
 * Remove a player from the lobby
 */
function removePlayer(game, playerId) {
  if (game.phase !== 'lobby') {
    const player = game.players.find((p) => p.id === playerId);
    if (player) player.connected = false;
    return;
  }
  game.players = game.players.filter((p) => p.id !== playerId);
}

/**
 * Assign roles randomly to all players
 */
function assignRoles(game) {
  const count = game.players.length;
  const config = ROLE_CONFIG[count];

  if (!config) {
    return { success: false, error: `Cannot start with ${count} players (need 4-10)` };
  }

  // Build role array
  const roles = [];
  for (let i = 0; i < config.mafia; i++) roles.push('mafia');
  for (let i = 0; i < config.doctor; i++) roles.push('doctor');
  for (let i = 0; i < config.detective; i++) roles.push('detective');
  for (let i = 0; i < config.citizen; i++) roles.push('citizen');

  const shuffled = shuffle(roles);

  game.players.forEach((player, idx) => {
    player.role = shuffled[idx];
  });

  return { success: true };
}

/**
 * Get the public game state (safe to send to all clients)
 */
function getPublicState(game) {
  const isEnded = game.phase === 'ended';
  return {
    id: game.id,
    phase: game.phase,
    round: game.round,
    hostId: game.hostId,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: p.connected,
      hasVoted: p.vote !== null,
      // Only show hasActed during voting (safe), never during night (leaks roles)
      hasActed: game.phase === 'night' ? false : p.action !== null,
      // Reveal roles to everyone when the game ends
      role: isEnded ? p.role : undefined,
    })),
    nightDeathId: game.nightDeathId,
    dayEliminatedId: game.dayEliminatedId,
    winner: game.winner,
    log: game.log,
  };
}

/**
 * Get private state for a specific player
 */
function getPlayerState(game, playerId) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return null;

  const state = getPublicState(game);

  // During night, only show YOUR OWN hasActed status
  if (game.phase === 'night') {
    state.players = state.players.map((p) => ({
      ...p,
      hasActed: p.id === playerId ? player.action !== null : false,
    }));
  }

  return {
    ...state,
    myRole: player.role,
    myVote: player.vote,
    myAction: player.action,
  };
}

/**
 * Get alive players
 */
function getAlivePlayers(game) {
  return game.players.filter((p) => p.alive);
}

/**
 * Get alive mafia players
 */
function getAliveMafia(game) {
  return game.players.filter((p) => p.alive && p.role === 'mafia');
}

/**
 * Get alive non-mafia (citizens side)
 */
function getAliveCitizens(game) {
  return game.players.filter((p) => p.alive && p.role !== 'mafia');
}

/**
 * Check win condition
 * Returns 'mafia', 'citizens', or null
 */
function checkWinCondition(game) {
  const mafiaAlive = getAliveMafia(game).length;
  const citizensAlive = getAliveCitizens(game).length;

  if (mafiaAlive === 0) return 'citizens';
  if (mafiaAlive >= citizensAlive) return 'mafia';

  return null;
}

module.exports = {
  createGame,
  addPlayer,
  removePlayer,
  assignRoles,
  getPublicState,
  getPlayerState,
  getAlivePlayers,
  getAliveMafia,
  getAliveCitizens,
  checkWinCondition,
  ROLE_CONFIG,
};
