import { db, auth } from './firebase-config.js';
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const goldAmount = document.getElementById('goldAmount');
const shopItemsContainer = document.getElementById('shopItems');

const shopItems = [
  { id: 'sword', name: 'Golden Sword', price: 50, image: '/rewards/sword.png' },
  { id: 'scroll', name: 'Magic Scroll', price: 30, image: '/rewards/scroll.png' },
  { id: 'cookie', name: 'Energy Cookie', price: 10, image: '/rewards/cookie.png' }
];

function displayShop(userId) {
  const userRef = ref(db, 'users/' + userId);
  onValue(userRef, snapshot => {
    const data = snapshot.val();
    const gold = data?.gold || 0;
    goldAmount.textContent = gold;

    shopItemsContainer.innerHTML = '';
    shopItems.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'shop-item';
      itemDiv.innerHTML = `
        <img src="${item.image}" alt="${item.name}" />
        <h3>${item.name}</h3>
        <p>${item.price} 🪙</p>
        <button>Buy</button>
      `;
      const button = itemDiv.querySelector('button');
      button.onclick = () => {
        if (gold >= item.price) {
          update(userRef, {
            gold: gold - item.price
          });
          alert(`You bought ${item.name}!`);
        } else {
          alert("Not enough gold!");
        }
      };
      shopItemsContainer.appendChild(itemDiv);
    });
  });
}

onAuthStateChanged(auth, user => {
  if (user) {
    displayShop(user.uid);
  } else {
    window.location.href = 'index.html';
  }
});