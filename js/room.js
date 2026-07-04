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
  getDocs,
  onSnapshot,
  runTransaction,
  updateDoc,
  setDoc,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ROOM_REF = doc(db, 'rooms', 'main');
const PLAYERS_COL = collection(db, 'rooms', 'main', 'players');

// A host is only "live" while its tab is open and heartbeating — Firestore
// has no server-side disconnect hook (that's an RTDB-only feature), so
// presence is approximated: the host writes hostLastSeen on an interval,
// and anyone reading the room treats it as stale (host gone) once it's
// older than this. Plain client Date.now() (not serverTimestamp()) so a
// reader never has to deal with the "pending write shows null" gap.
export const HOST_HEARTBEAT_MS = 4000;
export const HOST_TIMEOUT_MS = 10000;

// How many buzz-ins we track (in order) per question, so the host can see
// who came in 1st through 5th instead of just the winner.
export const MAX_BUZZ_ORDER = 5;

export const DEFAULT_ROOM = {
  board: {},
  currentTile: null,
  buzzLock: null,
  buzzOrder: [],
  buzzToken: 0,
  hostSessionId: null,
  hostLastSeen: null,
};

export function boardKey(catIdx, rowIdx) {
  return `c${catIdx}r${rowIdx}`;
}

export function isHostActive(room) {
  return !!(
    room &&
    room.hostSessionId &&
    room.hostLastSeen &&
    Date.now() - room.hostLastSeen < HOST_TIMEOUT_MS
  );
}

function generateSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// The host board is the game's anchor: every time it loads (first open,
// manual refresh, or reopening after being closed) it starts a brand new
// session — wipes every player doc and resets the board/buzzer state, so
// there's no stale "half-answered" game sitting around and no leftover
// players from whoever was in the room before. Buzzer clients detect the
// new hostSessionId and get bounced back to name entry.
export async function startHostSession() {
  const sessionId = generateSessionId();
  const playersSnap = await getDocs(PLAYERS_COL);
  const batch = writeBatch(db);
  playersSnap.forEach((d) => batch.delete(d.ref));
  batch.set(ROOM_REF, {
    ...DEFAULT_ROOM,
    hostSessionId: sessionId,
    hostLastSeen: Date.now(),
  });
  await batch.commit();
  return sessionId;
}

export async function sendHostHeartbeat() {
  await updateDoc(ROOM_REF, { hostLastSeen: Date.now() });
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
        buzzOrder: [],
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

    tx.set(ROOM_REF, { board, currentTile: null, buzzLock: null, buzzOrder: [] }, { merge: true });

    if (playerRef) {
      const curScore = playerSnap.exists() ? playerSnap.data().score || 0 : 0;
      const delta = result === 'correct' ? value : -value;
      tx.set(playerRef, { score: curScore + delta }, { merge: true });
    }
  });
}

export async function closeQuestion() {
  await updateDoc(ROOM_REF, { currentTile: null, buzzLock: null, buzzOrder: [] });
}

// ---- Player actions ----

export async function joinRoom(playerId, name) {
  await setDoc(doc(db, 'rooms', 'main', 'players', playerId), { name, score: 0 }, { merge: true });
}

// Race-safe: appends the caller to buzzOrder if the tile is in 'question'
// phase, they haven't already buzzed, and fewer than MAX_BUZZ_ORDER people
// have buzzed yet. buzzLock stays pinned to the first entry (whoever gets
// to answer); buzzOrder is the full 1st-through-5th list the host sees.
// Also checks buzzToken so a buzz queued from a just-closed question can't
// reactivate a new one.
export async function buzzIn(playerId, buzzToken) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ROOM_REF);
    if (!snap.exists()) return;
    const room = snap.data();
    if (!room.currentTile || room.currentTile.phase !== 'question') return;
    if (room.buzzToken !== buzzToken) return;
    const order = room.buzzOrder || [];
    if (order.includes(playerId) || order.length >= MAX_BUZZ_ORDER) return;
    const nextOrder = [...order, playerId];
    tx.set(ROOM_REF, { buzzOrder: nextOrder, buzzLock: room.buzzLock || nextOrder[0] }, { merge: true });
  });
}
