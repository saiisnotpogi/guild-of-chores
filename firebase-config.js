import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD10SJYmvn8axhnxq31R-thTRGO2hmjl9U",
  authDomain: "guild-of-chores.firebaseapp.com",
  databaseURL: "https://guild-of-chores-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "guild-of-chores",
  storageBucket: "guild-of-chores.appspot.com", // ✅ this was corrected
  messagingSenderId: "407610685284",
  appId: "1:407610685284:web:560267d2a67dfe30b12c71",
  measurementId: "G-MEWLR783TV"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
