// Shared Firestore layer for the single game room. Both index.html (host)
// and buzzer.html (player) import this — it's the only place that talks
// to Firestore, so the read/write shape stays in one spot.
//
// Shape:
//   rooms/main = { currentTile, buzzLock, board, buzzToken }
//   rooms/main/players/{playerId} = { name, score }
// Players are keyed by a per-device playerId (not name) so two people
// with the same first name still get separate, individually-tracked
// scores — the room doc alone can't (and shouldn't) enforce name
// uniqueness at a live event.

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ROOM_REF = doc(db, 'rooms', 'main');
const PLAYERS_COL = collection(db, 'rooms', 'main', 'players');

export const DEFAULT_ROOM = {
  board: {},
  currentTile: null,
  buzzLock: null,
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

export function subscribePlayers(callback) {
  return onSnapshot(PLAYERS_COL, (snap) => {
    const players = {};
    snap.forEach((d) => {
      players[d.id] = d.data();
    });
    callback(players);
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
        currentTile: { catIdx, rowIdx, phase: 'feather' },
        buzzLock: null,
        buzzToken: (room.buzzToken || 0) + 1,
      },
      { merge: true }
    );
  });
}

export async function openBuzzer() {
  await updateDoc(ROOM_REF, { 'currentTile.phase': 'question' });
}

export async function revealAnswer() {
  await updateDoc(ROOM_REF, { 'currentTile.phase': 'answer' });
}

export async function markResult(result) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    if (!snap.exists()) return;
    const room = snap.data();
    const tile = room.currentTile;
    if (!tile) return;
    const key = boardKey(tile.catIdx, tile.rowIdx);
    const value = (tile.rowIdx + 1) * 100;
    const board = { ...(room.board || {}), [key]: result };
    const buzzLock = room.buzzLock;

    let playerSnap = null;
    let playerRef = null;
    if (buzzLock && (result === 'correct' || result === 'incorrect')) {
      playerRef = doc(db, 'rooms', 'main', 'players', buzzLock);
      playerSnap = await tx.get(playerRef);
    }

    tx.set(ROOM_REF, { board, currentTile: null, buzzLock: null }, { merge: true });

    if (playerRef) {
      const curScore = playerSnap.exists() ? playerSnap.data().score || 0 : 0;
      const delta = result === 'correct' ? value : -value;
      tx.set(playerRef, { score: curScore + delta }, { merge: true });
    }
  });
}

export async function closeQuestion() {
  await updateDoc(ROOM_REF, { currentTile: null, buzzLock: null });
}

// ---- Player actions ----

export async function joinRoom(playerId, name) {
  await setDoc(doc(db, 'rooms', 'main', 'players', playerId), { name, score: 0 }, { merge: true });
}

// Race-safe: only the first transaction to commit while the tile is in
// 'question' phase and buzzLock is unset actually wins. Also checks
// buzzToken so a buzz queued from a just-closed question can't reactivate
// a new one.
export async function buzzIn(playerId, buzzToken) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    if (!snap.exists()) return;
    const room = snap.data();
    if (!room.currentTile || room.currentTile.phase !== 'question' || room.buzzLock) return;
    if (room.buzzToken !== buzzToken) return;
    tx.set(ROOM_REF, { buzzLock: playerId }, { merge: true });
  });
}
