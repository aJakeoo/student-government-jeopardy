import { CATEGORIES } from '../data/questions.js';
import {
  ensureRoom,
  subscribeRoom,
  openQuestion,
  openBuzzer,
  revealAnswer,
  markResult,
  closeQuestion,
  simulateBuzz,
  boardKey,
} from './room.js';

const boardGrid = document.getElementById('boardGrid');
const scoreBar = document.getElementById('scoreBar');
const qrImg = document.getElementById('qrCode');
const buzzerViewLink = document.getElementById('buzzerViewLink');

const questionOverlay = document.getElementById('questionOverlay');
const feather = document.getElementById('feather');
const questionContent = document.getElementById('questionContent');
const aqCat = document.getElementById('aqCat');
const aqValue = document.getElementById('aqValue');
const aqQuestion = document.getElementById('aqQuestion');
const aqAnswer = document.getElementById('aqAnswer');
const buzzBanner = document.getElementById('buzzBanner');
const answerBox = document.getElementById('answerBox');
const answerControls = document.getElementById('answerControls');
const preAnswerControls = document.getElementById('preAnswerControls');
const waitingHint = document.getElementById('waitingHint');

const btnCorrect = document.getElementById('btnCorrect');
const btnIncorrect = document.getElementById('btnIncorrect');
const btnSkip = document.getElementById('btnSkip');
const btnSimBuzz = document.getElementById('btnSimBuzz');
const btnReveal = document.getElementById('btnReveal');
const btnClose = document.getElementById('btnClose');

function fmt(n) {
  const v = n ?? 0;
  return v >= 0 ? `$${v}` : `-$${Math.abs(v)}`;
}

// ---- QR code ----
const buzzerUrl = new URL('buzzer.html', window.location.href).href;
buzzerViewLink.addEventListener('click', () => {
  window.location.href = 'buzzer.html';
});

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

function renderScores(room) {
  scoreBar.innerHTML = '';
  const entries = Object.entries(room.scores).sort(([, a], [, b]) => b - a);
  entries.forEach(([name, score]) => {
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

function renderQuestion(room) {
  const { activeQuestion, questionPhase, buzzedBy } = room;

  if (!activeQuestion) {
    questionOverlay.hidden = true;
    return;
  }
  questionOverlay.hidden = false;

  const { catIdx, rowIdx } = activeQuestion;
  const cat = CATEGORIES[catIdx];
  const clue = cat.clues[rowIdx];

  aqCat.textContent = cat.name.replace('\n', ' ');
  aqValue.textContent = `$${clue.value}`;
  aqQuestion.textContent = clue.question || '';
  aqAnswer.textContent = clue.answer || '';

  feather.classList.toggle('show', questionPhase === 'feather');
  questionContent.classList.toggle('show', questionPhase === 'question' || questionPhase === 'answer');

  buzzBanner.hidden = !buzzedBy;
  if (buzzedBy) buzzBanner.textContent = `${buzzedBy} BUZZES IN!`;

  const showAnswer = questionPhase === 'answer';
  const showPreAnswer = questionPhase === 'question';

  answerBox.hidden = !showAnswer;
  answerControls.hidden = !showAnswer;
  preAnswerControls.hidden = !showPreAnswer;
  waitingHint.hidden = !showPreAnswer;
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
btnSimBuzz.addEventListener('click', () => simulateBuzz());
btnReveal.addEventListener('click', () => revealAnswer());
btnClose.addEventListener('click', () => closeQuestion());

// ---- Boot ----
await ensureRoom();
subscribeRoom((room) => {
  renderBoard(room);
  renderScores(room);
  renderQuestion(room);
});
