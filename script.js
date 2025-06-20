import { db, auth } from './firebase-config.js';
import {
  ref,
  onValue,
  push,
  set,
  get
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const authSection = document.getElementById('auth');
const appSection = document.getElementById('app');
const questForm = document.getElementById('questForm');
const questNameInput = document.getElementById('questName');
const difficultySelect = document.getElementById('difficulty');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupButton = document.getElementById('signup');
const loginButton = document.getElementById('login');
const logoutButton = document.getElementById('logout');
const xpDisplay = document.getElementById('xp');
const levelDisplay = document.getElementById('level');
const streakDisplay = document.getElementById('streak');
const leaderboard = document.getElementById('leaderboard');
const publicQuestsList = document.getElementById('publicQuests');
const customQuestForm = document.getElementById('customQuestForm');
const questFeed = document.getElementById('questFeed');
const usernameDisplay = document.getElementById('usernameDisplay');
const avatarImage = document.getElementById('avatarImage');
const notification = document.getElementById('notification');

let currentUser = null;

function getLevelFromXP(xp) {
  return Math.floor(1 + xp / 100);
}

function getAvatarFromLevel(level) {
  if (level >= 15) return '/avatars/rogue.png';
  if (level >= 10) return '/avatars/mage.png';
  if (level >= 5) return '/avatars/knight.png';
  return '/avatars/novice.png';
}

function showNotification(message) {
  notification.textContent = message;
  notification.style.display = 'block';
  setTimeout(() => notification.style.display = 'none', 4000);
}

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    const userRef = ref(db, 'users/' + user.uid);
    onValue(userRef, snapshot => {
      const data = snapshot.val();
      const xp = data?.xp || 0;
      const level = getLevelFromXP(xp);
      xpDisplay.textContent = xp;
      levelDisplay.textContent = level;
      streakDisplay.textContent = data?.streak || 0;
      usernameDisplay.textContent = data?.username || user.email;
      avatarImage.src = getAvatarFromLevel(level);
    });
    loadLeaderboard();
    loadPublicQuests();
    loadQuestFeed();
  } else {
    authSection.style.display = 'block';
    appSection.style.display = 'none';
  }
});

signupButton.onclick = () => {
  createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(cred => {
      set(ref(db, 'users/' + cred.user.uid), {
        email: emailInput.value,
        username: usernameInput.value,
        xp: 0,
        gold: 0,
        streak: 0
      });
    });
};

loginButton.onclick = () => {
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
};

logoutButton.onclick = () => {
  signOut(auth);
};

questForm.onsubmit = async e => {
  e.preventDefault();
  const questName = questNameInput.value;
  const difficulty = difficultySelect.value;
  const xpReward = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 40;
  const goldReward = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 20;
  const proof = prompt('Enter proof or explanation (e.g. "I sent a photo to Discord")');

  const userSnapshot = await get(ref(db, 'users/' + currentUser.uid));
  const userData = userSnapshot.val();

  const verificationRef = push(ref(db, 'verifications'));
  set(verificationRef, {
    questName,
    proof,
    username: userData.username,
    userId: currentUser.uid,
    userXP: userData.xp || 0,
    userGold: userData.gold || 0,
    xp: xpReward,
    reward: goldReward
  });

  push(ref(db, 'questFeed'), {
    user: userData.username,
    quest: questName,
    timestamp: Date.now()
  });

  questNameInput.value = '';
  showNotification(`Quest completed: ${questName} (+${xpReward} XP)`);
};

customQuestForm.onsubmit = e => {
  e.preventDefault();
  const title = document.getElementById('customQuestName').value;
  const xp = parseInt(document.getElementById('customQuestXP').value);
  const reward = document.getElementById('customQuestReward').value;
  push(ref(db, 'quests'), { title, xp, reward });
  customQuestForm.reset();
  showNotification(`New quest posted: "${title}"`);
};

function loadLeaderboard() {
  onValue(ref(db, 'users'), snapshot => {
    const data = snapshot.val();
    const sorted = Object.values(data || {}).sort((a, b) => (b.xp || 0) - (a.xp || 0));
    leaderboard.innerHTML = '';
    sorted.forEach(user => {
      const li = document.createElement('li');
      li.textContent = `${user.username || user.email}: ${user.xp || 0} XP`;
      leaderboard.appendChild(li);
    });
  });
}

function loadPublicQuests() {
  onValue(ref(db, 'quests'), snapshot => {
    const data = snapshot.val();
    publicQuestsList.innerHTML = '';
    for (let id in data) {
      const quest = data[id];
      const li = document.createElement('li');
      li.textContent = `${quest.title} – Reward: ${quest.xp} XP, ${quest.reward}`;
      publicQuestsList.appendChild(li);
    }
  });
}

function loadQuestFeed() {
  onValue(ref(db, 'questFeed'), snapshot => {
    const data = snapshot.val();
    if (!data) return;
    const items = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    questFeed.innerHTML = '';
    items.forEach(entry => {
      const li = document.createElement('li');
      const date = new Date(entry.timestamp).toLocaleString();
      li.textContent = `${entry.user} completed '${entry.quest}' at ${date}`;
      questFeed.appendChild(li);
    });
  });
}
