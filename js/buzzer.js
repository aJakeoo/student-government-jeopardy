import { subscribeRoom, subscribePlayers, joinRoom, buzzIn, isHostActive, MAX_BUZZ_ORDER } from './room.js';
import { CATEGORIES } from '../data/questions.js';

// Mirrors the host's completion rule: only clues with real content can
// ever be resolved, so only those count toward finishing the board.
const PLAYABLE_TILES = CATEGORIES.reduce(
  (n, cat) => n + cat.clues.filter((clue) => !clue.empty).length,
  0
);

const NAME_KEY = 'ccsSgJeopardyName';
const PLAYER_ID_KEY = 'ccsSgJeopardyPlayerId';
const HOST_SESSION_KEY = 'ccsSgJeopardyHostSession';

const statusName = document.getElementById('statusName');
const statusScore = document.getElementById('statusScore');

const hostGoneScreen = document.getElementById('hostGoneScreen');
const joinScreen = document.getElementById('joinScreen');
const nameInput = document.getElementById('nameInput');
const joinButton = document.getElementById('joinButton');

const gameScreen = document.getElementById('gameScreen');
const playerOverScreen = document.getElementById('playerOverScreen');
const playerOverRank = document.getElementById('playerOverRank');
const playerOverScore = document.getElementById('playerOverScore');
const valueDisplay = document.getElementById('valueDisplay');
const waitingDisplay = document.getElementById('waitingDisplay');
const buzzButton = document.getElementById('buzzButton');
const buzzStatus = document.getElementById('buzzStatus');
const leaderboardList = document.getElementById('leaderboardList');

function fmt(n) {
  const v = n ?? 0;
  return v >= 0 ? `$${v}` : `-$${Math.abs(v)}`;
}

function generatePlayerId() {
  // crypto.randomUUID() needs a secure context (HTTPS/localhost) and
  // throws on plain-HTTP LAN testing, so fall back to a Math.random id;
  // this only needs to be unique per device, not cryptographically strong.
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Persistent per-device identity, survives refresh/tab close so a
// player's score stays theirs even if their phone browser gets killed.
let playerId = localStorage.getItem(PLAYER_ID_KEY);
if (!playerId) {
  playerId = generatePlayerId();
  localStorage.setItem(PLAYER_ID_KEY, playerId);
}

let playerName = localStorage.getItem(NAME_KEY) || '';
// Which host game session this device last joined/knows about; used to
// detect "the host started a new game" vs. "my own page just refreshed
// mid-game", which need different treatment (rejoin from scratch vs.
// silently resume).
let knownHostSessionId = localStorage.getItem(HOST_SESSION_KEY) || null;
let hasJoinedThisSession = false;
let latestRoom = null;
let latestPlayers = {};

function showScreenForState(hostActive, gameOver = false) {
  const hasName = !!playerName;
  const playing = hostActive && hasName;
  hostGoneScreen.hidden = hostActive;
  joinScreen.hidden = !hostActive || hasName;
  gameScreen.hidden = !playing || gameOver;
  playerOverScreen.hidden = !playing || !gameOver;
}

function isBoardComplete(room) {
  const results = Object.values(room.board || {}).filter(Boolean);
  return PLAYABLE_TILES > 0 && results.length >= PLAYABLE_TILES;
}

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

async function doJoin() {
  const n = nameInput.value.trim();
  if (!n || !latestRoom) return;
  playerName = n;
  localStorage.setItem(NAME_KEY, n);
  knownHostSessionId = latestRoom.hostSessionId;
  localStorage.setItem(HOST_SESSION_KEY, knownHostSessionId || '');
  await joinRoom(playerId, playerName);
  hasJoinedThisSession = true;
  showScreenForState(isHostActive(latestRoom));
}

joinButton.addEventListener('click', doJoin);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doJoin();
});

buzzButton.addEventListener('click', () => {
  if (!latestRoom) return;
  const tile = latestRoom.currentTile;
  if (!tile || tile.phase !== 'question') return;
  const order = latestRoom.buzzOrder || [];
  if (order.includes(playerId) || order.length >= MAX_BUZZ_ORDER) return;
  buzzIn(playerId, latestRoom.buzzToken);
});

function render() {
  if (!latestRoom) return;
  const room = latestRoom;
  const players = latestPlayers;

  // The host board wiped everyone and started fresh, so anyone who was
  // playing under the old session gets bounced back to name entry.
  if (room.hostSessionId !== knownHostSessionId) {
    knownHostSessionId = room.hostSessionId;
    localStorage.setItem(HOST_SESSION_KEY, knownHostSessionId || '');
    playerName = '';
    hasJoinedThisSession = false;
    localStorage.removeItem(NAME_KEY);
    // Don't leave the previous game's name sitting in the box for whoever
    // picks this phone up next.
    nameInput.value = '';
  }

  const hostActive = isHostActive(room);
  const gameOver = isBoardComplete(room);
  showScreenForState(hostActive, gameOver);
  if (!hostActive) return;

  // Re-establish our player doc once per session (covers this device's
  // own page refresh while the same game is still running).
  if (playerName && !hasJoinedThisSession) {
    hasJoinedThisSession = true;
    joinRoom(playerId, playerName);
  }

  const me = players[playerId];

  statusName.textContent = playerName;
  statusScore.textContent = fmt(me && me.score);

  if (gameOver) {
    const ranked = Object.entries(players).sort(
      ([, a], [, b]) => (b.score || 0) - (a.score || 0)
    );
    const myRank = ranked.findIndex(([id]) => id === playerId) + 1;
    playerOverRank.textContent = myRank > 0 ? `You came in ${ordinal(myRank)}!` : '';
    playerOverScore.textContent = fmt(me && me.score);
    return;
  }

  const tile = room.currentTile;
  const hasActiveQ = !!tile;
  if (hasActiveQ) {
    const value = (tile.rowIdx + 1) * 100;
    valueDisplay.textContent = `$${value}`;
    valueDisplay.hidden = false;
    waitingDisplay.hidden = true;
  } else {
    valueDisplay.hidden = true;
    waitingDisplay.hidden = false;
  }

  const buzzOrder = room.buzzOrder || [];
  const myRank = buzzOrder.indexOf(playerId); // -1 if not buzzed in
  const buzzedSelf = myRank !== -1;
  const buzzerFull = buzzOrder.length >= MAX_BUZZ_ORDER;
  const buzzerActive = !!tile && tile.phase === 'question' && !buzzedSelf && !buzzerFull;
  const firstName = buzzOrder.length && players[buzzOrder[0]] ? players[buzzOrder[0]].name : 'Someone';

  buzzButton.classList.remove('buzz-button--active', 'buzz-button--won', 'buzz-button--lost');
  if (myRank === 0) {
    buzzButton.classList.add('buzz-button--won');
  } else if (buzzedSelf) {
    buzzButton.classList.add('buzz-button--lost');
  } else if (buzzerActive) {
    buzzButton.classList.add('buzz-button--active');
  }
  buzzButton.style.cursor = buzzerActive ? 'pointer' : 'default';

  buzzStatus.classList.remove('buzz-status--won', 'buzz-status--lost', 'buzz-status--active');
  if (myRank === 0) {
    buzzStatus.classList.add('buzz-status--won');
    buzzStatus.textContent = '🎉 You buzzed first!';
  } else if (buzzedSelf) {
    buzzStatus.classList.add('buzz-status--lost');
    buzzStatus.textContent = `You buzzed in: #${myRank + 1}, after ${firstName}`;
  } else if (buzzerActive) {
    buzzStatus.classList.add('buzz-status--active');
    buzzStatus.textContent = 'Tap to buzz in!';
  } else if (buzzerFull) {
    buzzStatus.textContent = `Buzzer closed: ${MAX_BUZZ_ORDER} players already in`;
  } else if (hasActiveQ) {
    buzzStatus.textContent = 'Get ready...';
  } else {
    buzzStatus.textContent = 'Waiting for host...';
  }

  leaderboardList.innerHTML = '';
  Object.values(players)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .forEach(({ name, score }) => {
      const row = document.createElement('div');
      row.className = 'leaderboard__row';
      const nameEl = document.createElement('span');
      nameEl.className = 'leaderboard__name';
      nameEl.textContent = name;
      const scoreEl = document.createElement('span');
      scoreEl.className = 'leaderboard__score';
      scoreEl.textContent = fmt(score);
      row.appendChild(nameEl);
      row.appendChild(scoreEl);
      leaderboardList.appendChild(row);
    });
}

showScreenForState(false);

// isHostActive() is a clock check against the last heartbeat, but render()
// otherwise only runs when a Firestore snapshot arrives. When the host tab
// simply goes away it stops writing, so no snapshot ever comes and nothing
// re-evaluates staleness: the player would sit on a live-looking game
// screen indefinitely. Poll the clock as well, and only re-render on an
// actual change so the leaderboard isn't rebuilt every tick.
let lastHostActive = null;
setInterval(() => {
  if (!latestRoom) return;
  const active = isHostActive(latestRoom);
  if (active === lastHostActive) return;
  lastHostActive = active;
  render();
}, 2000);

subscribeRoom((room) => {
  latestRoom = room;
  render();
});
subscribePlayers((players) => {
  latestPlayers = players;
  render();
});
