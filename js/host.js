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

const winOverlay = document.getElementById('winOverlay');
const confettiEl = document.getElementById('confetti');
const podiumFirst = document.getElementById('podiumFirst');
const podiumSecond = document.getElementById('podiumSecond');
const podiumThird = document.getElementById('podiumThird');
const firstNameEl = document.getElementById('firstName');
const firstScoreEl = document.getElementById('firstScore');
const secondNameEl = document.getElementById('secondName');
const secondScoreEl = document.getElementById('secondScore');
const thirdNameEl = document.getElementById('thirdName');
const thirdScoreEl = document.getElementById('thirdScore');
const winRest = document.getElementById('winRest');
const attribution = document.getElementById('attribution');
const attributionTooltip = document.getElementById('attributionTooltip');

let latestRoom = null;
let latestPlayers = {};

// Total tiles that can actually be played. Categories flagged `empty`
// have no content, so they can never be resolved and must not count
// toward "the board is finished".
const PLAYABLE_TILES = CATEGORIES.reduce(
  (n, cat) => n + cat.clues.filter((clue) => !clue.empty).length,
  0
);

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
  qrImg.src = qr.createDataURL(9, 4);
})();

// ---- Board rendering ----
function renderBoard(room) {
  boardGrid.innerHTML = '';
  // Keep the grid as wide as the question bank, so adding or dropping a
  // category is a data-only change.
  boardGrid.style.setProperty('--board-cols', CATEGORIES.length);

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
        labelEl.textContent = '–';
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

// ---- Win screen ----
// The board is finished once every playable tile has a result. Scores
// count up from zero when the screen first appears, so the final
// standings land with some weight instead of just being printed.
const WIN_COUNTUP_MS = 1100;
const CONFETTI_COUNT = 26;
const CONFETTI_COLORS = ['#FFDE59', '#B78FD6', '#5EB090', '#FFC7EC'];

let winShown = false;
let countUpFrame = null;
let countUpStart = null;
// The standings the win screen should be drawing. Kept in a variable
// rather than closed over by the count-up, because the last question's
// score write usually lands in a *later* snapshot than the board write
// that ends the game: closing over the array read at trigger time would
// freeze the winner's total one question short.
let winRanked = [];

function isBoardComplete(room) {
  const results = Object.values(room.board || {}).filter(Boolean);
  return PLAYABLE_TILES > 0 && results.length >= PLAYABLE_TILES;
}

function buildConfetti() {
  confettiEl.innerHTML = '';
  // Deterministic spread rather than Math.random(): the same pleasant
  // distribution every time, and no reflow-dependent surprises.
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const size = 6 + (i % 4) * 3;
    const piece = document.createElement('div');
    piece.className = 'confetti__piece';
    piece.style.left = `${(i * 37) % 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.6}px`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animation = `confettiFall ${2.6 + (i % 5) * 0.4}s linear ${(i % 13) * 0.18}s infinite`;
    confettiEl.appendChild(piece);
  }
}

function paintPodium(ranked, progress) {
  const at = (idx) => {
    if (!ranked[idx]) return null;
    const [name, score] = ranked[idx];
    return { name, score: Math.round(score * progress) };
  };

  const first = at(0);
  podiumFirst.hidden = !first;
  if (first) {
    firstNameEl.textContent = first.name;
    firstScoreEl.textContent = fmt(first.score);
  }

  const second = at(1);
  podiumSecond.hidden = !second;
  if (second) {
    secondNameEl.textContent = second.name;
    secondScoreEl.textContent = fmt(second.score);
  }

  const third = at(2);
  podiumThird.hidden = !third;
  if (third) {
    thirdNameEl.textContent = third.name;
    thirdScoreEl.textContent = fmt(third.score);
  }

  const rest = ranked.slice(3);
  winRest.hidden = rest.length === 0;
  winRest.innerHTML = '';
  rest.forEach(([name, score], idx) => {
    const row = document.createElement('div');
    row.className = 'win-rest__row';
    const nameEl = document.createElement('span');
    nameEl.className = 'win-rest__name';
    nameEl.textContent = `${idx + 4}. ${name}`;
    const scoreEl = document.createElement('span');
    scoreEl.className = 'win-rest__score';
    scoreEl.textContent = fmt(Math.round(score * progress));
    row.appendChild(nameEl);
    row.appendChild(scoreEl);
    winRest.appendChild(row);
  });
}

function renderWin(room, players) {
  const complete = isBoardComplete(room);

  if (!complete) {
    // Reset so a fresh session can play the reveal again.
    winOverlay.hidden = true;
    if (winShown) {
      winShown = false;
      countUpStart = null;
      if (countUpFrame) cancelAnimationFrame(countUpFrame);
      countUpFrame = null;
      confettiEl.innerHTML = '';
    }
    return;
  }

  winRanked = Object.values(players)
    .map((p) => [p.name, p.score || 0])
    .sort((a, b) => b[1] - a[1]);

  winOverlay.hidden = false;

  if (!winShown) {
    winShown = true;
    buildConfetti();
    countUpStart = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - countUpStart) / WIN_COUNTUP_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      paintPodium(winRanked, eased);
      if (p < 1) {
        countUpFrame = requestAnimationFrame(tick);
      } else {
        countUpFrame = null;
        // Settle on whatever the latest snapshot says, so a score that
        // arrived during the animation isn't left rounded to the old total.
        paintPodium(winRanked, 1);
      }
    };
    countUpFrame = requestAnimationFrame(tick);
    return;
  }

  // Already counted up: a later snapshot (the final award landing, a
  // player doc arriving late) repaints at full value rather than
  // restarting the animation.
  if (!countUpFrame) paintPodium(winRanked, 1);
}

attribution.addEventListener('mouseenter', () => {
  attributionTooltip.hidden = false;
});
attribution.addEventListener('mouseleave', () => {
  attributionTooltip.hidden = true;
});

// If the mark can't load, drop the whole badge rather than leave a
// broken-image icon sitting on a projector at the end of a game. This
// module is deferred, so the image has usually already resolved (or
// failed) by the time we get here: check the settled state as well as
// listening, or a failure that happened during parsing is missed.
const attributionMark = attribution.querySelector('.attribution__mark');
function hideAttributionIfBroken() {
  if (attributionMark.complete && attributionMark.naturalWidth === 0) {
    attribution.hidden = true;
  }
}
attributionMark.addEventListener('error', () => {
  attribution.hidden = true;
});
hideAttributionIfBroken();

function renderAll() {
  if (!latestRoom) return;
  renderBoard(latestRoom);
  renderScores(latestPlayers);
  renderQuestion(latestRoom, latestPlayers);
  renderWin(latestRoom, latestPlayers);
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
// or reopening after being closed) starts a fresh session, wiping all
// players and resetting the board so there's never a stale half-played
// game or leftover players sitting in the room from before.
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
