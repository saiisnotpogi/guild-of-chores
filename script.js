// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  update,
  push,
  get,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD10SJYmvn8axhnxq31R-thTRGO2hmjl9U",
  authDomain: "guild-of-chores.firebaseapp.com",
  databaseURL: "https://guild-of-chores-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "guild-of-chores",
  storageBucket: "guild-of-chores.appspot.com",
  messagingSenderId: "407610685284",
  appId: "1:407610685284:web:560267d2a67dfe30b12c71",
  measurementId: "G-MEWLR783TV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const email = document.getElementById("email");
const password = document.getElementById("password");
const usernameInput = document.getElementById("username");
const loginBtn = document.getElementById("login");
const signupBtn = document.getElementById("signup");
const logoutBtn = document.getElementById("logout");

const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const usernameDisplay = document.getElementById("usernameDisplay");
const xpEl = document.getElementById("xp");
const levelEl = document.getElementById("level");
const streakEl = document.getElementById("streak");

const questForm = document.getElementById("questForm");
const customQuestForm = document.getElementById("customQuestForm");
const publicQuests = document.getElementById("publicQuests");
const questFeed = document.getElementById("questFeed");
const leaderboard = document.getElementById("leaderboard");

let currentUser = null;
let userXP = 0;
let userStreak = 0;
let lastCompletedDate = null;

function calculateLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

function getXP(difficulty) {
  return { easy: 10, medium: 25, hard: 50 }[difficulty] || 0;
}

function updateUserData() {
  const uid = currentUser.uid;
  update(ref(db, `users/${uid}`), {
    xp: userXP,
    streak: userStreak,
    lastCompleted: new Date().toDateString()
  });
}

function loadLeaderboard() {
  get(ref(db, 'users')).then(snapshot => {
    const data = [];
    snapshot.forEach(child => {
      const val = child.val();
      if (val.username) {
        data.push({ username: val.username, xp: val.xp || 0 });
      }
    });
    data.sort((a, b) => b.xp - a.xp);
    leaderboard.innerHTML = "";
    data.forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `${entry.username}: ${entry.xp} XP`;
      leaderboard.appendChild(li);
    });
  });
}

function loadQuestFeed() {
  onValue(ref(db, "feed"), snapshot => {
    questFeed.innerHTML = "";
    const data = snapshot.val() || {};
    Object.values(data).slice(-10).reverse().forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `${entry.username} completed "${entry.quest}" (+${entry.xp} XP)`;
      questFeed.appendChild(li);
    });
  });
}

function loadPublicQuests() {
  onValue(ref(db, "publicQuests"), snapshot => {
    publicQuests.innerHTML = "";
    const data = snapshot.val() || {};
    Object.entries(data).forEach(([key, quest]) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${quest.name}</strong> - Reward: ${quest.reward} 
        <button onclick="acceptQuest('${key}', '${quest.name}', '${quest.reward}', '${quest.creator}')">Complete</button>
      `;
      publicQuests.appendChild(li);
    });
  });
}

window.acceptQuest = function (id, name, reward, creator) {
  userXP += 25;
  updateUserData();
  push(ref(db, "feed"), {
    username: currentUser.displayName,
    quest: name,
    xp: 25
  });
  alert(`You completed "${name}" and earned ${reward} from ${creator}`);
};

signupBtn.onclick = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value).then(cred => {
    return updateProfile(cred.user, {
      displayName: usernameInput.value
    }).then(() => {
      return set(ref(db, `users/${cred.user.uid}`), {
        username: usernameInput.value,
        xp: 0,
        streak: 0,
        lastCompleted: "",
        email: email.value
      });
    });
  }).catch(alert);
};

loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value).catch(alert);
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    authSection.style.display = "none";
    appSection.style.display = "block";
    usernameDisplay.textContent = user.displayName;
    const userRef = ref(db, `users/${user.uid}`);
    onValue(userRef, snap => {
      const val = snap.val();
      userXP = val?.xp || 0;
      userStreak = val?.streak || 0;
      lastCompletedDate = val?.lastCompleted || "";
      xpEl.textContent = userXP;
      levelEl.textContent = calculateLevel(userXP);
      streakEl.textContent = userStreak;
    });
    loadLeaderboard();
    loadQuestFeed();
    loadPublicQuests();
  } else {
    currentUser = null;
    authSection.style.display = "block";
    appSection.style.display = "none";
  }
});

questForm.onsubmit = e => {
  e.preventDefault();
  const name = document.getElementById("questName").value;
  const difficulty = document.getElementById("difficulty").value;
  const today = new Date().toDateString();
  const xpGain = getXP(difficulty);

  if (today !== lastCompletedDate) {
    userStreak += 1;
  }
  userXP += xpGain;
  updateUserData();
  push(ref(db, "feed"), {
    username: currentUser.displayName,
    quest: name,
    xp: xpGain
  });
  questForm.reset();
};

customQuestForm.onsubmit = e => {
  e.preventDefault();
  const name = document.getElementById("customQuestName").value;
  const reward = document.getElementById("customQuestReward").value;
  push(ref(db, "publicQuests"), {
    name,
    reward,
    creator: currentUser.displayName
  });
  customQuestForm.reset();
};
