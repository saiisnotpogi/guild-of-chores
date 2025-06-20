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
  onValue,
  remove
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

function updateUserData(proofDate = null) {
  const uid = currentUser.uid;
  const data = {
    xp: userXP,
    streak: userStreak,
    lastCompleted: new Date().toDateString(),
    username: currentUser.displayName
  };
  update(ref(db, `users/${uid}`), data);
}

function loadLeaderboard() {
  get(ref(db, 'users')).then(snapshot => {
    const data = [];
    snapshot.forEach(child => {
      const val = child.val();
      if (val.username != null) {
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
    // Show last 10 entries
    const entries = Object.values(data);
    entries.slice(-10).reverse().forEach(entry => {
      const li = document.createElement("li");
      const proofText = entry.proof ? ` Proof: ${entry.proof}` : '';
      li.textContent = `${entry.username} completed "${entry.quest}" (+${entry.xp} XP).${proofText}`;
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
        <strong>${quest.name}</strong> - Reward: ${quest.reward} - XP: ${quest.xp} - Creator: ${quest.creator}
        <button data-id="${key}" data-name="${quest.name}" data-reward="${quest.reward}" data-xp="${quest.xp}" data-creator="${quest.creator}">Complete</button>
      `;
      const btn = li.querySelector('button');
      btn.onclick = () => acceptQuest(key, quest.name, quest.reward, quest.creator, quest.xp);
      publicQuests.appendChild(li);
    });
  });
}

async function acceptQuest(id, name, reward, creator, xpValue) {
  // Prompt for proof
  const proof = prompt(`Enter proof/description for completing "${name}":`);
  if (proof == null || proof.trim() === '') {
    alert('Proof is required to complete this quest.');
    return;
  }
  // Remove quest from public list
  await remove(ref(db, `publicQuests/${id}`));
  // Update user data
  // Update streak if daily completion
  const today = new Date().toDateString();
  if (today !== lastCompletedDate) {
    userStreak += 1;
  }
  userXP += Number(xpValue);
  updateUserData();
  // Push to feed
  push(ref(db, "feed"), {
    username: currentUser.displayName,
    quest: name,
    xp: Number(xpValue),
    proof: proof
  });
  alert(`You completed "${name}"! You earned ${xpValue} XP and reward: ${reward}`);
  loadLeaderboard();
}

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
  }).catch(err => alert(err.message));
};

loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, email.value, password.value).catch(err => alert(err.message));
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
    xp: xpGain,
    proof: "Daily quest"
  });
  alert(`Daily quest "${name}" completed! You earned ${xpGain} XP.`);
  questForm.reset();
  loadLeaderboard();
};

customQuestForm.onsubmit = e => {
  e.preventDefault();
  const name = document.getElementById("customQuestName").value;
  const xpValue = document.getElementById("customQuestXP").value;
  const reward = document.getElementById("customQuestReward").value;
  push(ref(db, "publicQuests"), {
    name,
    reward,
    xp: Number(xpValue),
    creator: currentUser.displayName
  });
  alert(`Quest "${name}" posted for others! Reward: ${reward}, XP: ${xpValue}`);
  customQuestForm.reset();
};
