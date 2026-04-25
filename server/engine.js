// ============================================================
// engine.js — Phase Transitions & Game Flow
// ============================================================

const {
  assignRoles,
  getAlivePlayers,
  checkWinCondition,
} = require('./game');

/**
 * Start the game from lobby
 */
function startGame(game) {
  if (game.phase !== 'lobby') {
    return { success: false, error: 'Game is not in lobby' };
  }

  if (game.players.length < 4) {
    return { success: false, error: 'Need at least 4 players to start' };
  }

  const result = assignRoles(game);
  if (!result.success) return result;

  game.round = 1;
  game.log.push({ type: 'system', message: 'The game has begun! Roles have been assigned.' });

  return { success: true };
}

/**
 * Transition to night phase
 */
function startNightPhase(game) {
  game.phase = 'night';
  game.nightActions = [];
  game.nightDeathId = null;

  // Reset actions for all alive players
  getAlivePlayers(game).forEach((p) => {
    p.action = null;
  });

  game.log.push({
    type: 'phase',
    message: `🌙 Night ${game.round} has fallen. The town sleeps...`,
  });

  return { success: true };
}

/**
 * Submit a night action
 */
function submitNightAction(game, playerId, targetId) {
  if (game.phase !== 'night') {
    return { success: false, error: 'Not night phase' };
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };
  if (!player.alive) return { success: false, error: 'Dead players cannot act' };

  const target = game.players.find((p) => p.id === targetId);
  if (!target) return { success: false, error: 'Target not found' };
  if (!target.alive) return { success: false, error: 'Cannot target dead player' };

  // Validate role-specific actions
  if (player.role === 'citizen') {
    return { success: false, error: 'Citizens have no night action' };
  }

  if (player.role === 'mafia' && target.role === 'mafia') {
    return { success: false, error: 'Cannot target fellow mafia' };
  }

  // Record the action
  player.action = { targetId };

  // Remove any previous action by this player
  game.nightActions = game.nightActions.filter((a) => a.playerId !== playerId);

  game.nightActions.push({
    playerId: player.id,
    role: player.role,
    type: getActionType(player.role),
    targetId: targetId,
  });

  return { success: true };
}

/**
 * Get action type based on role
 */
function getActionType(role) {
  switch (role) {
    case 'mafia':
      return 'kill';
    case 'doctor':
      return 'protect';
    case 'detective':
      return 'investigate';
    default:
      return null;
  }
}

/**
 * Check if all night actions have been submitted
 */
function allNightActionsSubmitted(game) {
  const alivePlayers = getAlivePlayers(game);
  const actionRoles = ['mafia', 'doctor', 'detective'];

  for (const player of alivePlayers) {
    if (actionRoles.includes(player.role) && player.action === null) {
      return false;
    }
  }

  return true;
}

/**
 * Resolve all night actions
 * Returns { died, protected, detectiveResults }
 */
function resolveNight(game) {
  const results = {
    died: null,
    protected: false,
    detectiveResults: [],
  };

  // Find all actions by type
  const killActions = game.nightActions.filter((a) => a.type === 'kill');
  const protectAction = game.nightActions.find((a) => a.type === 'protect');
  const investigateActions = game.nightActions.filter((a) => a.type === 'investigate');

  // Resolve mafia kill (majority vote if multiple mafia)
  let killTargetId = null;
  if (killActions.length > 0) {
    // Count votes for each target
    const killVotes = {};
    killActions.forEach((a) => {
      killVotes[a.targetId] = (killVotes[a.targetId] || 0) + 1;
    });

    // Find target with most votes (first mafia's choice as tiebreaker)
    let maxVotes = 0;
    for (const [tid, count] of Object.entries(killVotes)) {
      if (count > maxVotes) {
        maxVotes = count;
        killTargetId = tid;
      }
    }
  }

  // Check if doctor protected the target
  const protectedId = protectAction ? protectAction.targetId : null;

  if (killTargetId) {
    if (killTargetId === protectedId) {
      results.protected = true;
      game.log.push({
        type: 'night',
        message: '☀️ The sun rises. No one was killed tonight — the Doctor saved someone!',
      });
    } else {
      const victim = game.players.find((p) => p.id === killTargetId);
      if (victim) {
        victim.alive = false;
        results.died = { id: victim.id, name: victim.name, role: victim.role };
        game.nightDeathId = victim.id;
        game.log.push({
          type: 'death',
          message: `☀️ The sun rises. ${victim.name} was found dead. They were a ${victim.role}.`,
        });
      }
    }
  } else {
    game.log.push({
      type: 'night',
      message: '☀️ The sun rises. No one was killed tonight.',
    });
  }

  // Resolve detective investigations
  investigateActions.forEach((action) => {
    const target = game.players.find((p) => p.id === action.targetId);
    if (target) {
      results.detectiveResults.push({
        detectiveId: action.playerId,
        targetId: target.id,
        targetName: target.name,
        isMafia: target.role === 'mafia',
      });
    }
  });

  return results;
}

/**
 * Transition to day phase
 */
function startDayPhase(game) {
  game.phase = 'day';

  game.log.push({
    type: 'phase',
    message: `☀️ Day ${game.round} — Discuss and find the mafia!`,
  });

  return { success: true };
}

/**
 * Transition to voting phase
 */
function startVotingPhase(game) {
  game.phase = 'voting';
  game.votes = {};

  // Reset votes for all alive players
  getAlivePlayers(game).forEach((p) => {
    p.vote = null;
  });

  game.log.push({
    type: 'phase',
    message: `🗳️ Voting Phase — Vote to eliminate a suspect!`,
  });

  return { success: true };
}

/**
 * Submit a vote
 */
function submitVote(game, playerId, targetId) {
  if (game.phase !== 'voting') {
    return { success: false, error: 'Not voting phase' };
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };
  if (!player.alive) return { success: false, error: 'Dead players cannot vote' };

  // Allow "skip" vote (null target)
  if (targetId !== null) {
    const target = game.players.find((p) => p.id === targetId);
    if (!target) return { success: false, error: 'Target not found' };
    if (!target.alive) return { success: false, error: 'Cannot vote for dead player' };
    if (targetId === playerId) return { success: false, error: 'Cannot vote for yourself' };
  }

  player.vote = targetId;
  game.votes[playerId] = targetId;

  return { success: true };
}

/**
 * Check if all votes are in
 */
function allVotesSubmitted(game) {
  const alivePlayers = getAlivePlayers(game);
  return alivePlayers.every((p) => p.vote !== null);
}

/**
 * Resolve the vote
 * Returns { eliminated, voteCounts, tie }
 */
function resolveVotes(game) {
  const results = {
    eliminated: null,
    voteCounts: {},
    tie: false,
  };

  // Count votes (excluding skip votes)
  for (const [voterId, targetId] of Object.entries(game.votes)) {
    if (targetId !== null) {
      results.voteCounts[targetId] = (results.voteCounts[targetId] || 0) + 1;
    }
  }

  // Find player with most votes
  let maxVotes = 0;
  let eliminatedId = null;
  let isTie = false;

  for (const [targetId, count] of Object.entries(results.voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = targetId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  if (isTie || maxVotes === 0) {
    results.tie = true;
    game.log.push({
      type: 'vote',
      message: '⚖️ The vote was tied! No one was eliminated.',
    });
  } else {
    const eliminated = game.players.find((p) => p.id === eliminatedId);
    if (eliminated) {
      eliminated.alive = false;
      results.eliminated = {
        id: eliminated.id,
        name: eliminated.name,
        role: eliminated.role,
      };
      game.dayEliminatedId = eliminatedId;
      game.log.push({
        type: 'death',
        message: `⚰️ ${eliminated.name} was eliminated by vote. They were a ${eliminated.role}.`,
      });
    }
  }

  return results;
}

/**
 * End the game
 */
function endGame(game, winner) {
  game.phase = 'ended';
  game.winner = winner;

  const winnerText = winner === 'mafia' ? '🔴 The Mafia' : '🟢 The Citizens';
  game.log.push({
    type: 'system',
    message: `🏁 Game Over! ${winnerText} win!`,
  });

  return { success: true };
}

/**
 * Advance to next round
 */
function nextRound(game) {
  game.round++;
  game.nightDeathId = null;
  game.dayEliminatedId = null;
}

module.exports = {
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
  checkWinCondition: require('./game').checkWinCondition,
};
