// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ✅ Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD10SJYmvn8axhnxq31R-thTRGO2hmjl9U",
  authDomain: "guild-of-chores.firebaseapp.com",
  databaseURL: "https://guild-of-chores-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "guild-of-chores",
  storageBucket: "guild-of-chores.firebasestorage.app",
  messagingSenderId: "407610685284",
  appId: "1:407610685284:web:560267d2a67dfe30b12c71",
  measurementId: "G-MEWLR783TV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM
const email = document.getElementById('email');
const password = document.getElementById('password');
const loginBtn = document.getElementById('login');
const signupBtn = document.getElementById('signup');
const logoutBtn = document.getElementById('logout');
const authSection = document.getElementById('auth');
const appSection = document.getElementById('app');
const usernameEl = document.getElementById('username');
const levelEl = document.getElementById('level');
const xpEl = document.getElementById('xp');
const questForm = document.getElementById('questForm');
const leaderboard = document.getElementById('leaderboard');

let currentUser = null;
let totalXP = 0;

function getXP(difficulty) {
  return { easy: 10, medium: 20, hard: 30 }[difficulty] || 0;
}

function calculateLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

// 🔐 Auth Events
signupBtn.onclick = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
    .then(() => alert('Signed up!'))
    .catch(err => alert(err.message));
};

loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .catch(err => alert(err.message));
};

logoutBtn.onclick = () => signOut(auth);

// 🔄 Auth State Listener
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    usernameEl.textContent = user.email;
    loadUserData();
    loadLeaderboard();
  } else {
    currentUser = null;
    authSection.style.display = 'block';
    appSection.style.display = 'none';
  }
});

// 📥 Load XP
function loadUserData() {
  const userRef = ref(db, `users/${currentUser.uid}`);
  onValue(userRef, snapshot => {
    const data = snapshot.val() || { xp: 0, email: currentUser.email };
    totalXP = data.xp || 0;
    levelEl.textContent = calculateLevel(totalXP);
    xpEl.textContent = totalXP;
  });

  // Save email for leaderboard
  update(ref(db, `users/${currentUser.uid}`), {
    email: currentUser.email
  });
}

// 🧾 Submit Quest
questForm.onsubmit = e => {
  e.preventDefault();
  const questName = document.getElementById('questName').value;
  const difficulty = document.getElementById('difficulty').value;
  const xpGain = getXP(difficulty);
  totalXP += xpGain;

  const userRef = ref(db, `users/${currentUser.uid}`);
  update(userRef, { xp: totalXP });

  levelEl.textContent = calculateLevel(totalXP);
  xpEl.textContent = totalXP;
  questForm.reset();
  loadLeaderboard();
};

// 🏆 Leaderboard
function loadLeaderboard() {
  const usersRef = ref(db, 'users');
  get(usersRef).then(snapshot => {
    const users = [];
    snapshot.forEach(child => {
      const val = child.val();
      users.push({ email: val.email || "Unknown", xp: val.xp || 0 });
    });
    users.sort((a, b) => b.xp - a.xp);

    leaderboard.innerHTML = '';
    users.forEach(u => {
      const li = document.createElement('li');
      li.textContent = `${u.email}: ${u.xp} XP`;
      leaderboard.appendChild(li);
    });
  });
}
