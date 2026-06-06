# 🧙‍♀️ السحارة (Al-Sahara) — Online Card Game

A real-time multiplayer adaptation of the Libyan folklore social-deduction card game **السحارة**, set in the old alleys of Tripoli. Citizens must uncover and execute the hidden witches (السحارة) before the witches pick them off one by one.

The app is **server-authoritative**: all rules, the deck, hidden trial cards, and resolution live on the server. Clients only send actions and render the personalized state they receive.

---

## Teams & Hidden Roles

Each player is dealt a hand of face-down **trial cards** (كروت المحاكمة) that secretly decide their allegiance:

- **مواطن (Citizen)** — the default. Win by exposing every witch.
- **سحّارة (Witch)** — holds at least one `sahara` trial card. Kills citizens at night.
- **كبير السحرة (Master Witch)** — holds both a `sahara` and a `sahir` card.
- **الشيخ (Sheikh)** — holds a `sheikh` card (and no `sahara`). Protects one player each night; loses the role if also a witch.

A player's team is derived from the trial cards they currently hold, so allegiances can shift mid-game via the Conspiracy event.

### Trial-card distribution (from the rule sheet)

| Players | Cards/player | Citizen | Witch | Sheikh |
|--------:|-------------:|--------:|------:|-------:|
| 4 | 5 | 18 | 1 | 1 |
| 5 | 5 | 23 | 1 | 1 |
| 6 | 5 | 27 | 2 | 1 |
| 7 | 5 | 32 | 2 | 1 |
| 8 | 4 | 29 | 2 | 1 |
| 9 | 4 | 33 | 2 | 1 |
| 10 | 3 | 27 | 2 | 1 |
| 11 | 3 | 30 | 2 | 1 |
| 12 | 3 | 33 | 2 | 1 |

Defined in [`shared/constants.js`](shared/constants.js) and dealt in [`server/engine.js`](server/engine.js).

---

## Cards

The draw deck mixes four colors plus public character cards. The full catalog lives in [`shared/cards/`](shared/cards/); cards documented in the rule sheet are fully implemented, and the remainder are `placeholder` (labelled "قريباً") so the deck still shuffles and deals at full scale.

| Color | Behavior | Examples |
|-------|----------|----------|
| 🟩 Green | One-shot, discarded after use | فاروق، الحصان، الفيل (move accusations / break Greatness) |
| 🟦 Blue | Persistent, stays in front of a player | العظمة (Greatness), الربط (Link) |
| 🟥 Red | Accusations; 7 in front of a player triggers a trial | تهمة |
| ⬛ Black | Must resolve immediately when drawn | المؤامرة (Conspiracy), عزرائيل (Azrael), عزّ الليل (Shadow) |

**Characters (زنقة الزنقة):** 15 public identity cards dealt one per player. Currently flavor-only; abilities are stubbed for future expansion.

---

## Game Flow

```
lobby → setup → day ⇄ night → … → ended
                 │
                 ├─ trial            (7 red cards on one player)
                 ├─ conspiracy       (Conspiracy card rotates trial cards)
                 ├─ attack_response  (a night victim defends or stays silent)
                 └─ last_words       (an eliminated player's 3 final words)
```

### Setup
1. Deal one character card per player (public).
2. Deal the trial-card pool face-down per the table above.
3. Build the draw pile; deal 3 hand cards each.
4. The holder of العظمة (Greatness) begins, otherwise the host.

### Day (turn-based)
On their turn a player either:
- **Draws** two cards (ends the turn), or
- **Plays** any number of cards from hand, then ends the turn.

Black cards drawn (Conspiracy, Shadow) resolve immediately. After every player has taken a turn, night falls.

### Trial (7 accusations)
When a player accumulates 7 red cards, the player who placed the 7th reveals one of the accused's hidden trial cards. A revealed `sahara` means execution; otherwise the accusations are cleared.

### Night
The server acts as the Leader. Witches secretly converge on a victim (majority vote); the Sheikh secretly protects one player (never themselves). The victim then chooses to **defend** (discard two cards to survive) or **stay silent** (survive only if the Sheikh protected them).

### Conspiracy
Reveals one trial card of the drawer's left neighbour, then rotates one hidden trial card around the circle — quietly reshaping the teams.

### Win conditions
- **Citizens** win when no witches remain alive.
- **Sahara** win when witches are at least as many as the surviving non-witches.

---

## Core Rules (enforced server-side)
- No self-targeting.
- Played cards are final.
- An eliminated player may speak exactly three last words, then stays silent.
- Black cards interrupt play immediately.
- Greatness blocks cards being placed in front of its holder (until removed by a movement card).

---

## Architecture

| Layer | Files |
|-------|-------|
| Shared catalog & constants | [`shared/constants.js`](shared/constants.js), [`shared/cards/`](shared/cards/) |
| State & serialization | [`server/game.js`](server/game.js) |
| Phase/turn/resolution engine | [`server/engine.js`](server/engine.js) |
| Card effect handlers | [`server/cards.js`](server/cards.js) |
| Socket orchestration & anti-stall timers | [`server/sockets.js`](server/sockets.js) |
| React client | [`client/src/`](client/src/) |

The server requires the `shared/` catalog directly (CommonJS) and embeds full card display objects into each personalized `game_state` broadcast, so the client renders cards without importing the catalog.

### Socket events

Client → Server: `create_game`, `join_game`, `start_game`, `draw_cards`, `play_card`, `end_turn`, `resolve_trial`, `witch_vote`, `sheikh_protect`, `attack_response`, `submit_last_words`, `request_state`.

Server → Client: `game_state` (personalized), `card_drawn` (private), `timer_start`.

---

## Running locally

```bash
# Server (port 3001)
npm install
npm run dev

# Client (port 5173)
cd client
npm install
npm run dev
```

Production builds the client and serves it from the Node server; see the [`Dockerfile`](Dockerfile).
