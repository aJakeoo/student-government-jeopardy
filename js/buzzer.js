import { ensureRoom, subscribeRoom, subscribePlayers, joinRoom, buzzIn } from './room.js';

const NAME_KEY = 'ccsSgJeopardyName';
const PLAYER_ID_KEY = 'ccsSgJeopardyPlayerId';

const statusName = document.getElementById('statusName');
const statusScore = document.getElementById('statusScore');

const joinScreen = document.getElementById('joinScreen');
const nameInput = document.getElementById('nameInput');
const joinButton = document.getElementById('joinButton');

const gameScreen = document.getElementById('gameScreen');
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
  // throws on plain-HTTP LAN testing, so fall back to a Math.random id —
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
let latestRoom = null;
let latestPlayers = {};

function showScreenForState() {
  const hasName = !!playerName;
  joinScreen.hidden = hasName;
  gameScreen.hidden = !hasName;
}

async function doJoin() {
  const n = nameInput.value.trim();
  if (!n) return;
  playerName = n;
  localStorage.setItem(NAME_KEY, n);
  await joinRoom(playerId, n);
  showScreenForState();
}

joinButton.addEventListener('click', doJoin);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doJoin();
});

buzzButton.addEventListener('click', () => {
  if (!latestRoom) return;
  const tile = latestRoom.currentTile;
  if (!tile || tile.phase !== 'question' || latestRoom.buzzLock) return;
  buzzIn(playerId, latestRoom.buzzToken);
});

function render() {
  if (!latestRoom) return;
  const room = latestRoom;
  const players = latestPlayers;
  const me = players[playerId];

  statusName.textContent = playerName;
  statusScore.textContent = fmt(me && me.score);

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

  const buzzedSelf = room.buzzLock === playerId;
  const buzzedOther = !!room.buzzLock && !buzzedSelf;
  const buzzerActive = !!tile && tile.phase === 'question' && !room.buzzLock;
  const buzzedOtherName = buzzedOther && players[room.buzzLock] ? players[room.buzzLock].name : 'Someone';

  buzzButton.classList.remove('buzz-button--active', 'buzz-button--won', 'buzz-button--lost');
  if (buzzedSelf) {
    buzzButton.classList.add('buzz-button--won');
  } else if (buzzedOther) {
    buzzButton.classList.add('buzz-button--lost');
  } else if (buzzerActive) {
    buzzButton.classList.add('buzz-button--active');
  }
  buzzButton.style.cursor = buzzerActive ? 'pointer' : 'default';

  buzzStatus.classList.remove('buzz-status--won', 'buzz-status--lost', 'buzz-status--active');
  if (buzzedSelf) {
    buzzStatus.classList.add('buzz-status--won');
    buzzStatus.textContent = '🎉 You buzzed first!';
  } else if (buzzedOther) {
    buzzStatus.classList.add('buzz-status--lost');
    buzzStatus.textContent = `${buzzedOtherName} got there first`;
  } else if (buzzerActive) {
    buzzStatus.classList.add('buzz-status--active');
    buzzStatus.textContent = 'Tap to buzz in!';
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

showScreenForState();
await ensureRoom();
if (playerName) {
  await joinRoom(playerId, playerName);
}
subscribeRoom((room) => {
  latestRoom = room;
  render();
});
subscribePlayers((players) => {
  latestPlayers = players;
  render();
});
