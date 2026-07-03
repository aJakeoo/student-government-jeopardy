import { ensureRoom, subscribeRoom, joinRoom, buzzIn } from './room.js';

const NAME_KEY = 'ccsSgJeopardyName';

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
const backLink = document.getElementById('backLink');

function fmt(n) {
  const v = n ?? 0;
  return v >= 0 ? `$${v}` : `-$${Math.abs(v)}`;
}

let playerName = sessionStorage.getItem(NAME_KEY) || '';
let latestRoom = null;

function showScreenForState() {
  const hasName = !!playerName;
  joinScreen.hidden = hasName;
  gameScreen.hidden = !hasName;
}

async function doJoin() {
  const n = nameInput.value.trim();
  if (!n) return;
  playerName = n;
  sessionStorage.setItem(NAME_KEY, n);
  await joinRoom(n);
  showScreenForState();
}

joinButton.addEventListener('click', doJoin);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doJoin();
});

backLink.addEventListener('click', () => {
  window.location.href = 'index.html';
});

buzzButton.addEventListener('click', () => {
  if (!latestRoom || !latestRoom.buzzerOpen || latestRoom.buzzedBy) return;
  buzzIn(playerName, latestRoom.buzzToken);
});

function render(room) {
  latestRoom = room;

  statusName.textContent = playerName;
  statusScore.textContent = fmt(room.scores[playerName]);

  const hasActiveQ = !!room.activeQuestion;
  if (hasActiveQ) {
    const { catIdx, rowIdx } = room.activeQuestion;
    const value = (rowIdx + 1) * 100;
    valueDisplay.textContent = `$${value}`;
    valueDisplay.hidden = false;
    waitingDisplay.hidden = true;
  } else {
    valueDisplay.hidden = true;
    waitingDisplay.hidden = false;
  }

  const buzzedSelf = room.buzzedBy === playerName;
  const buzzedOther = !!room.buzzedBy && !buzzedSelf;
  const buzzerActive = room.buzzerOpen && !room.buzzedBy;

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
    buzzStatus.textContent = `${room.buzzedBy} got there first`;
  } else if (buzzerActive) {
    buzzStatus.classList.add('buzz-status--active');
    buzzStatus.textContent = 'Tap to buzz in!';
  } else if (hasActiveQ) {
    buzzStatus.textContent = 'Get ready...';
  } else {
    buzzStatus.textContent = 'Waiting for host...';
  }

  leaderboardList.innerHTML = '';
  Object.entries(room.scores)
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, score]) => {
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
  await joinRoom(playerName);
}
subscribeRoom(render);
