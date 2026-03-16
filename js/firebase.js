// js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZ191bua36sut5t3tRvxb6cnarQNYos3E",
  authDomain: "fila-de-oracao.firebaseapp.com",
  databaseURL: "https://fila-de-oracao-default-rtdb.firebaseio.com", // Atencao: configure no console Firebase o URL do Realtime Database e copie aqui.
  projectId: "fila-de-oracao",
  storageBucket: "fila-de-oracao.firebasestorage.app",
  messagingSenderId: "206074223775",
  appId: "1:206074223775:web:ed8e6ce92255880e6f16aa"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, onValue, push, remove };
