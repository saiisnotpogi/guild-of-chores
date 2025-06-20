import { db, auth } from './firebase-config.js';
import {
  ref,
  onValue,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const pendingList = document.getElementById('pendingVerifications');

function renderVerifications(userId) {
  const verifRef = ref(db, 'verifications');

  onValue(verifRef, snapshot => {
    const data = snapshot.val();
    pendingList.innerHTML = '';
    if (!data) {
      pendingList.innerHTML = '<li>No pending quests to verify.</li>';
      return;
    }

    Object.entries(data).forEach(([id, entry]) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${entry.questName}</strong> completed by <em>${entry.username}</em><br/>
        <p>Proof: ${entry.proof || 'No proof submitted'}</p>
        <button class="approve">✅ Approve</button>
        <button class="reject">❌ Reject</button>
      `;

      li.querySelector('.approve').onclick = () => {
        const userRef = ref(db, 'users/' + entry.userId);
        update(userRef, {
          xp: (entry.xp || 10) + (entry.userXP || 0),
          gold: (entry.reward || 5) + (entry.userGold || 0)
        });
        remove(ref(db, 'verifications/' + id));
        alert('Quest approved!');
      };

      li.querySelector('.reject').onclick = () => {
        remove(ref(db, 'verifications/' + id));
        alert('Quest rejected.');
      };

      pendingList.appendChild(li);
    });
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    renderVerifications(user.uid);
  } else {
    window.location.href = 'index.html';
  }
});
