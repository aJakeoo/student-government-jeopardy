import { CATEGORIES } from '../data/questions.js';
import {
  startHostSession,
  sendHostHeartbeat,
  HOST_HEARTBEAT_MS,
  subscribeRoom,
  subscribePlayers,
  openQuestion,
  openBuzzer,
  revealAnswer,
  markResult,
  closeQuestion,
  boardKey,
} from './room.js';

const boardGrid = document.getElementById('boardGrid');
const scoreBar = document.getElementById('scoreBar');
const qrImg = document.getElementById('qrCode');

const questionOverlay = document.getElementById('questionOverlay');
const feather = document.getElementById('feather');
const questionContent = document.getElementById('questionContent');
const aqCat = document.getElementById('aqCat');
const aqValue = document.getElementById('aqValue');
const aqQuestion = document.getElementById('aqQuestion');
const aqAnswer = document.getElementById('aqAnswer');
const buzzOrderEl = document.getElementById('buzzOrder');
const answerBox = document.getElementById('answerBox');
const answerControls = document.getElementById('answerControls');
const preAnswerControls = document.getElementById('preAnswerControls');
const waitingHint = document.getElementById('waitingHint');

const btnCorrect = document.getElementById('btnCorrect');
const btnIncorrect = document.getElementById('btnIncorrect');
const btnSkip = document.getElementById('btnSkip');
const btnReveal = document.getElementById('btnReveal');
const btnClose = document.getElementById('btnClose');

let latestRoom = null;
let latestPlayers = {};

function fmt(n) {
  const v = n ?? 0;
  return v >= 0 ? `$${v}` : `-$${Math.abs(v)}`;
}

// ---- QR code ----
const buzzerUrl = new URL('buzzer.html', window.location.href).href;

(function renderQr() {
  const qr = qrcode(0, 'M');
  qr.addData(buzzerUrl);
  qr.make();
  qrImg.src = qr.createDataURL(6, 4);
})();

// ---- Board rendering ----
function renderBoard(room) {
  boardGrid.innerHTML = '';

  CATEGORIES.forEach((cat) => {
    const header = document.createElement('div');
    header.className = 'board-header';
    const label = document.createElement('span');
    label.className = 'board-header__label';
    label.textContent = cat.name;
    header.appendChild(label);
    boardGrid.appendChild(header);
  });

  for (let rowIdx = 0; rowIdx < 5; rowIdx++) {
    for (let catIdx = 0; catIdx < CATEGORIES.length; catIdx++) {
      const cat = CATEGORIES[catIdx];
      const clue = cat.clues[rowIdx];
      const key = boardKey(catIdx, rowIdx);
      const result = room.board[key];
      const isEmpty = !!clue.empty;

      const tile = document.createElement('div');
      tile.className = 'tile';
      const labelEl = document.createElement('span');
      labelEl.className = 'tile__label';

      if (isEmpty) {
        tile.classList.add('tile--empty');
        labelEl.classList.add('tile__label--result');
        labelEl.textContent = '—';
      } else if (result) {
        tile.classList.add('tile--answered', `tile--${result}`);
        labelEl.classList.add('tile__label--result');
        labelEl.textContent = result === 'correct' ? '✓' : result === 'incorrect' ? '✗' : '·';
      } else {
        labelEl.classList.add('tile__label--value');
        labelEl.textContent = `$${clue.value}`;
        tile.addEventListener('click', () => handleOpenQuestion(catIdx, rowIdx));
      }

      tile.appendChild(labelEl);
      boardGrid.appendChild(tile);
    }
  }
}

function renderScores(players) {
  scoreBar.innerHTML = '';
  const entries = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
  entries.forEach(({ name, score }) => {
    const chip = document.createElement('div');
    chip.className = 'score-chip';
    const nameEl = document.createElement('span');
    nameEl.className = 'score-chip__name';
    nameEl.textContent = name;
    const scoreEl = document.createElement('span');
    scoreEl.className = 'score-chip__value';
    scoreEl.textContent = fmt(score);
    chip.appendChild(nameEl);
    chip.appendChild(scoreEl);
    scoreBar.appendChild(chip);
  });
}

function renderQuestion(room, players) {
  const tile = room.currentTile;

  if (!tile) {
    questionOverlay.hidden = true;
    return;
  }
  questionOverlay.hidden = false;

  const { catIdx, rowIdx, phase } = tile;
  const cat = CATEGORIES[catIdx];
  const clue = cat.clues[rowIdx];

  aqCat.textContent = cat.name.replace('\n', ' ');
  aqValue.textContent = `$${clue.value}`;
  aqQuestion.textContent = clue.question || '';
  aqAnswer.textContent = clue.answer || '';

  feather.classList.toggle('show', phase === 'feather');
  questionContent.classList.toggle('show', phase === 'question' || phase === 'answer');

  const buzzOrder = room.buzzOrder || [];
  buzzOrderEl.hidden = buzzOrder.length === 0;
  buzzOrderEl.innerHTML = '';
  buzzOrder.forEach((playerId, idx) => {
    const name = (players[playerId] && players[playerId].name) || 'Unknown';
    const item = document.createElement('div');
    item.className = 'buzz-order__item';
    if (idx === 0) item.classList.add('buzz-order__item--first');
    const rank = document.createElement('span');
    rank.className = 'buzz-order__rank';
    rank.textContent = idx + 1;
    const nameEl = document.createElement('span');
    nameEl.className = 'buzz-order__name';
    nameEl.textContent = name;
    item.appendChild(rank);
    item.appendChild(nameEl);
    buzzOrderEl.appendChild(item);
  });

  const showAnswer = phase === 'answer';
  const showPreAnswer = phase === 'question';

  answerBox.hidden = !showAnswer;
  answerControls.hidden = !showAnswer;
  preAnswerControls.hidden = !showPreAnswer;
  waitingHint.hidden = !showPreAnswer;
}

function renderAll() {
  if (!latestRoom) return;
  renderBoard(latestRoom);
  renderScores(latestPlayers);
  renderQuestion(latestRoom, latestPlayers);
}

// ---- Host actions ----
async function handleOpenQuestion(catIdx, rowIdx) {
  await openQuestion(catIdx, rowIdx);
  setTimeout(() => {
    openBuzzer();
  }, 500);
}

btnCorrect.addEventListener('click', () => markResult('correct'));
btnIncorrect.addEventListener('click', () => markResult('incorrect'));
btnSkip.addEventListener('click', () => markResult('skipped'));
btnReveal.addEventListener('click', () => revealAnswer());
btnClose.addEventListener('click', () => closeQuestion());

// ---- Boot ----
// The host board is the game's anchor: every load (first open, refresh,
// or reopening after being closed) starts a fresh session — wipes all
// players and resets the board so there's never a stale half-played game
// or leftover players sitting in the room from before.
await startHostSession();
const heartbeatTimer = setInterval(sendHostHeartbeat, HOST_HEARTBEAT_MS);
window.addEventListener('beforeunload', () => clearInterval(heartbeatTimer));

subscribeRoom((room) => {
  latestRoom = room;
  renderAll();
});
subscribePlayers((players) => {
  latestPlayers = players;
  renderAll();
});
