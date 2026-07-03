// Firebase project: stu-gov-jeopardy
// Loaded as an ES module directly from the CDN — no npm, no build step.
// The apiKey below is a public web client key (safe to ship in a static
// site); access control is enforced by Firestore security rules, not by
// keeping this value secret. See firestore.rules for the rules to publish.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { initializeFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDzUEM67GhAS2_JOMZHTGRfHjEo9if8fbM',
  authDomain: 'stu-gov-jeopardy.firebaseapp.com',
  projectId: 'stu-gov-jeopardy',
  storageBucket: 'stu-gov-jeopardy.firebasestorage.app',
  messagingSenderId: '641244717588',
  appId: '1:641244717588:web:0b6433e053e5c4e8b93d01',
};

const app = initializeApp(firebaseConfig);

// Long polling instead of WebChannel streaming: campus wifi and school
// network proxies frequently choke on the streaming transport, which
// shows up as a room that never syncs with no obvious error. Long
// polling is slightly chattier but works behind almost any firewall —
// worth the tradeoff for a room full of phones on guest wifi.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// Point at the local Firestore emulator when serving from localhost, e.g.
// `firebase emulators:start --only firestore` during development. Never
// triggers on the deployed GitHub Pages origin.
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  connectFirestoreEmulator(db, window.location.hostname, 8081);
}
