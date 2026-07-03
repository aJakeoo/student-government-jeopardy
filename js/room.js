// Shared Firestore layer for the single game room. Both index.html (host)
// and buzzer.html (player) import this — it's the only place that talks
// to Firestore, so the read/write shape stays in one spot.

import { db } from './firebase-config.js';
import {
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ROOM_REF = doc(db, 'rooms', 'main');

export const DEFAULT_ROOM = {
  board: {},
  scores: {},
  activeQuestion: null,
  questionPhase: null,
  buzzerOpen: false,
  buzzedBy: null,
  buzzToken: 0,
};

export function boardKey(catIdx, rowIdx) {
  return `c${catIdx}r${rowIdx}`;
}

// Ensures rooms/main exists. Safe to call from both pages on load —
// only creates the doc if it's genuinely missing, never clobbers state.
export async function ensureRoom() {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    if (!snap.exists()) {
      tx.set(ROOM_REF, DEFAULT_ROOM);
    }
  });
}

export function subscribeRoom(callback) {
  return onSnapshot(ROOM_REF, (snap) => {
    callback(snap.exists() ? { ...DEFAULT_ROOM, ...snap.data() } : DEFAULT_ROOM);
  });
}

// ---- Host actions ----

export async function openQuestion(catIdx, rowIdx) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    const room = snap.exists() ? snap.data() : DEFAULT_ROOM;
    const key = boardKey(catIdx, rowIdx);
    if (room.board && room.board[key]) return; // already answered, ignore
    tx.set(
      ROOM_REF,
      {
        activeQuestion: { catIdx, rowIdx },
        questionPhase: 'feather',
        buzzerOpen: false,
        buzzedBy: null,
        buzzToken: (room.buzzToken || 0) + 1,
      },
      { merge: true }
    );
  });
}

export async function openBuzzer() {
  await updateDoc(ROOM_REF, { questionPhase: 'question', buzzerOpen: true });
}

export async function revealAnswer() {
  await updateDoc(ROOM_REF, { questionPhase: 'answer', buzzerOpen: false });
}

export async function markResult(result) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    if (!snap.exists()) return;
    const room = snap.data();
    const aq = room.activeQuestion;
    if (!aq) return;
    const key = boardKey(aq.catIdx, aq.rowIdx);
    const value = (aq.rowIdx + 1) * 100;
    const board = { ...(room.board || {}), [key]: result };
    const scores = { ...(room.scores || {}) };
    if (room.buzzedBy && (result === 'correct' || result === 'incorrect')) {
      const delta = result === 'correct' ? value : -value;
      scores[room.buzzedBy] = (scores[room.buzzedBy] || 0) + delta;
    }
    tx.set(
      ROOM_REF,
      {
        board,
        scores,
        activeQuestion: null,
        questionPhase: null,
        buzzerOpen: false,
        buzzedBy: null,
      },
      { merge: true }
    );
  });
}

export async function closeQuestion() {
  await updateDoc(ROOM_REF, {
    activeQuestion: null,
    questionPhase: null,
    buzzerOpen: false,
    buzzedBy: null,
  });
}

// Host-only testing aid — reuses the same transaction as a real buzz-in
// so it exercises the identical race-safe path.
export async function simulateBuzz() {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    if (!snap.exists()) return;
    const room = snap.data();
    const names = Object.keys(room.scores || {});
    if (!names.length || !room.buzzerOpen || room.buzzedBy) return;
    const name = names[Math.floor(Math.random() * names.length)];
    tx.set(ROOM_REF, { buzzedBy: name, buzzerOpen: false }, { merge: true });
  });
}

// ---- Player actions ----

export async function joinRoom(name) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    const room = snap.exists() ? snap.data() : DEFAULT_ROOM;
    if (room.scores && Object.prototype.hasOwnProperty.call(room.scores, name)) return;
    const scores = { ...(room.scores || {}), [name]: 0 };
    tx.set(ROOM_REF, { scores }, { merge: true });
  });
}

// Race-safe: only the first transaction to commit while buzzerOpen is
// true and buzzedBy is unset actually wins. Also checks buzzToken so a
// buzz queued from a just-closed question can't reactivate a new one.
export async function buzzIn(name, buzzToken) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    if (!snap.exists()) return;
    const room = snap.data();
    if (!room.buzzerOpen || room.buzzedBy) return;
    if (room.buzzToken !== buzzToken) return;
    tx.set(ROOM_REF, { buzzedBy: name, buzzerOpen: false }, { merge: true });
  });
}
