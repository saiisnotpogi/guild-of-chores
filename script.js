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

const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
  // Grab elements after DOM ready:
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
    console.log("Updating user data:", { userXP, userStreak });
    const uid = currentUser.uid;
    update(ref(db, `users/${uid}`), {
      xp: userXP,
      streak: userStreak,
      lastCompleted: new Date().toDateString(),
      username: currentUser.displayName
    }).catch(err => console.error("Error updating user data:", err));
  }

  function loadLeaderboard() {
    console.log("Loading leaderboard...");
    get(ref(db, 'users')).then(snapshot => {
      const data = [];
      snapshot.forEach(child => {
        const val = child.val();
        if (val.username) data.push({ username: val.username, xp: val.xp || 0 });
      });
      data.sort((a, b) => b.xp - a.xp);
      leaderboard.innerHTML = "";
      data.forEach(entry => {
        const li = document.createElement("li");
        li.textContent = `${entry.username}: ${entry.xp} XP`;
        leaderboard.appendChild(li);
      });
    }).catch(err => console.error("Error loading leaderboard:", err));
  }

  function loadQuestFeed() {
    console.log("Setting up quest feed listener...");
    onValue(ref(db, "feed"), snapshot => {
      questFeed.innerHTML = "";
      const data = snapshot.val() || {};
      const entries = Object.values(data);
      entries.slice(-10).reverse().forEach(entry => {
        const li = document.createElement("li");
        const proofText = entry.proof ? ` Proof: ${entry.proof}` : '';
        li.textContent = `${entry.username} completed "${entry.quest}" (+${entry.xp} XP).${proofText}`;
        questFeed.appendChild(li);
      });
    }, err => console.error("Error reading feed:", err));
  }

  function loadPublicQuests() {
    console.log("Setting up public quests listener...");
    onValue(ref(db, "publicQuests"), snapshot => {
      publicQuests.innerHTML = "";
      const data = snapshot.val();
      console.log("publicQuests snapshot:", data);
      if (!data) {
        // No quests currently
        return;
      }
      Object.entries(data).forEach(([key, quest]) => {
        console.log("Rendering quest:", key, quest);
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${quest.name}</strong> - Reward: ${quest.reward} - XP: ${quest.xp} - Creator: ${quest.creator}
          <button>Complete</button>
        `;
        const btn = li.querySelector('button');
        btn.onclick = () => acceptQuest(key, quest.name, quest.reward, quest.creator, quest.xp);
        publicQuests.appendChild(li);
      });
    }, err => console.error("Error reading publicQuests:", err));
  }

  async function acceptQuest(id, name, reward, creator, xpValue) {
    console.log("acceptQuest called:", { id, name, reward, creator, xpValue });
    const proof = prompt(`Enter proof/description for completing "${name}":`);
    console.log("Proof entered:", proof);
    if (proof == null || proof.trim() === '') {
      alert('Proof is required to complete this quest.');
      return;
    }
    try {
      await remove(ref(db, `publicQuests/${id}`));
      const today = new Date().toDateString();
      if (today !== lastCompletedDate) {
        userStreak += 1;
      }
      userXP += Number(xpValue);
      updateUserData();
      push(ref(db, "feed"), {
        username: currentUser.displayName,
        quest: name,
        xp: Number(xpValue),
        proof: proof
      });
      alert(`You completed "${name}"! You earned ${xpValue} XP and reward: ${reward}`);
      loadLeaderboard();
    } catch(err) {
      console.error("Error in acceptQuest:", err);
      alert("Error completing quest. See console.");
    }
  }

  signupBtn.onclick = () => {
    console.log("Signing up:", usernameInput.value, email.value);
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
    }).then(() => {
      console.log("Signup + profile set done");
    }).catch(err => {
      console.error("Signup error:", err);
      alert(err.message);
    });
  };

  loginBtn.onclick = () => {
    console.log("Logging in:", email.value);
    signInWithEmailAndPassword(auth, email.value, password.value).catch(err => {
      console.error("Login error:", err);
      alert(err.message);
    });
  };

  logoutBtn.onclick = () => {
    console.log("Logging out");
    signOut(auth);
  };

  onAuthStateChanged(auth, user => {
    if (user) {
      console.log("Auth state: signed in as", user.displayName);
      currentUser = user;
      authSection.style.display = "none";
      appSection.style.display = "block";
      usernameDisplay.textContent = user.displayName;
      const userRef = ref(db, `users/${user.uid}`);
      onValue(userRef, snap => {
        const val = snap.val() || {};
        userXP = val.xp || 0;
        userStreak = val.streak || 0;
        lastCompletedDate = val.lastCompleted || "";
        xpEl.textContent = userXP;
        levelEl.textContent = calculateLevel(userXP);
        streakEl.textContent = userStreak;
        console.log("Loaded user data:", val);
      }, err => console.error("Error reading user data:", err));
      loadLeaderboard();
      loadQuestFeed();
      loadPublicQuests();
    } else {
      console.log("Auth state: signed out");
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
    console.log("Completing daily quest:", name, difficulty, xpGain);
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
    const xpValue = Number(document.getElementById("customQuestXP").value);
    const reward = document.getElementById("customQuestReward").value;
    console.log("Posting custom quest:", name, xpValue, reward);
    push(ref(db, "publicQuests"), {
      name,
      reward,
      xp: xpValue,
      creator: currentUser.displayName
    }).then(() => {
      console.log("Custom quest posted");
      alert(`Quest "${name}" posted for others! Reward: ${reward}, XP: ${xpValue}`);
      customQuestForm.reset();
    }).catch(err => {
      console.error("Error posting custom quest:", err);
      alert("Error posting quest. See console.");
    });
  };
});
