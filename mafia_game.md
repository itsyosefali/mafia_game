# 🕵️ Mafia Online Game – MVP Specification

## 🎯 Overview

This project is a **turn-based multiplayer online Mafia game**.

Players are assigned hidden roles and progress through **Night** and **Day** phases until one team wins.

The system is designed as a **server-authoritative real-time game**, where:
- The server controls all game logic
- Clients only send actions and display state

---

# 🧠 Game Design

## 🎭 Roles

- **Mafia**
  - Chooses a player to kill at night

- **Doctor**
  - Chooses a player to protect at night

- **Detective**
  - Investigates a player at night (finds if Mafia)

- **Citizen**
  - No special ability

---

## 🔁 Game Phases

### 1. Lobby
- Players join the game
- Host starts the match

---

### 2. Night Phase 🌙
- Mafia selects a target to kill
- Doctor selects a player to protect
- Detective selects a player to investigate

All actions are **hidden**

---

### 3. Night Resolution ⚖️
- If target is NOT protected → player dies
- If protected → survives
- Detective receives result privately

---

### 4. Day Phase ☀️
- Server announces:
  - Who died (if any)
- Players discuss (optional in MVP)

---

### 5. Voting Phase 🗳️
- All alive players vote to eliminate one player

---

### 6. Elimination
- Player with highest votes is removed

---

### 7. Win Check 🏁

- If all Mafia are dead → **Citizens win**
- If Mafia >= Citizens → **Mafia win**

---

### 8. Loop
- Repeat:
  Night → Day → Voting → Check Win

---

# ⚙️ Game State (Server Side)

```js
game = {
  phase: "lobby | night | day | voting | ended",
  players: [
    {
      id,
      name,
      role,
      alive,
      vote,
      action
    }
  ],
  nightActions: [],
  votes: {},
  round: 1
}