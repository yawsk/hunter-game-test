// ==========================
// Firebase Setup
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBghUe2JnEgj9ZWEHEmnJMirJ0hX4nEGW4",
  authDomain: "ucapan-balon.firebaseapp.com",
  projectId: "ucapan-balon",
  storageBucket: "ucapan-balon.appspot.com",
  messagingSenderId: "72153682380",
  appId: "1:72153682380:web:0e87ad71e05a8330108d69"
};

let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("✅ Firebase berhasil diinisialisasi.");
} catch (e) {
  console.error("❌ Firebase gagal init:", e);
}

// ==========================
// Data Icon Target
// ==========================
const TARGET_ICONS = {
  'icon_1': { name: 'Api Semangat', image: 'jumanji1.png' },
  'icon_2': { name: 'Air Kehidupan', image: 'jumanji2.png' },
  'icon_3': { name: 'Bumi Pertiwi', image: 'jumanji3.png' },
  'icon_4': { name: 'Angin Perubahan', image: 'jumanji4.png' },
  'icon_5': { name: 'Logam Keteguhan', image: 'jumanji5.png' }
};
const iconIds = Object.keys(TARGET_ICONS);

// ==========================
// LocalStorage Key
// ==========================
const ICON_STORAGE_KEY = 'iconHunterProgress';
const PARTICIPANT_STORAGE_KEY = 'iconHunterParticipant';
const SUBMITTED_STORAGE_KEY = 'iconHunterSubmitted';

// ==========================
// Save to Firebase
// ==========================
async function saveCompletionToFirebase(participantId) {
  const firebaseStatus = document.getElementById('firebase-status');
  try {
    const completionRef = doc(db, "messages", participantId);
    await setDoc(completionRef, {
      participantId: participantId,
      completionTime: serverTimestamp(),
      type: 'IconHunterCompletion'
    });
    console.log("✅ Data terkirim ke Firebase:", participantId);
    firebaseStatus.textContent = "Data berhasil disimpan! 🎉";
    firebaseStatus.classList.add("text-green-400");
  } catch (e) {
    console.error("❌ Gagal simpan ke Firebase:", e);
    firebaseStatus.textContent = "Gagal simpan data.";
    firebaseStatus.classList.add("text-red-400");
  }
}

// ==========================
// Main Game Logic
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('login-screen');
  const gameContainer = document.getElementById('game-container');
  const startButton = document.getElementById('start-button');
  const participantInput = document.getElementById('participant-id-input');
  const sceneEl = document.querySelector('a-scene');

  // reset progress tiap refresh
  localStorage.removeItem(ICON_STORAGE_KEY);
  localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
  localStorage.removeItem(SUBMITTED_STORAGE_KEY);

  loginScreen.classList.remove('hidden');
  gameContainer.classList.add('hidden');

  function initializeGame(participantId) {
    loginScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    sceneEl.setAttribute('mindar-image', { 
      imageTargetSrc: 'targets.mind',
      autoStart: false,
      uiScanning: '#scan-status'
    });

    // tambahin target AR
    iconIds.forEach((id, i) => {
      const entity = document.createElement('a-entity');
      entity.setAttribute('id', `target-${i}`);
      entity.setAttribute('mindar-image-target', `targetIndex: ${i}`);
      sceneEl.appendChild(entity);
    });

    // 🎥 kamera jalan kalau AR siap
    sceneEl.addEventListener("arReady", () => {
      const arSystem = sceneEl.systems["mindar-image-system"];
      if (arSystem) {
        console.log("✅ Kamera siap, nyalain...");
        arSystem.start();
      }
    });

    sceneEl.addEventListener("arError", (e) => {
      console.error("❌ AR Error:", e);
      alert("Kamera gagal nyala. Cek permission browser atau coba Chrome/Edge.");
    });

    // state game
    const collectedIcons = new Set();
    const stampsContainer = document.getElementById('stamps-container');
    const popup = document.getElementById('popup');
    const popupImg = document.getElementById('popup-img');
    const popupTitle = document.getElementById('popup-title');
    const winMessage = document.getElementById('win-message');
    const scanStatus = document.getElementById('scan-status');

    window.closePopup = () => popup.classList.add('hidden');

    function updateStampsUI() {
      stampsContainer.innerHTML = '';
      for (const iconId in TARGET_ICONS) {
        const iconData = TARGET_ICONS[iconId];
        const isCollected = collectedIcons.has(iconId);
        const stampElement = document.createElement('div');
        stampElement.className = `stamp w-16 h-16 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center border-4 border-gray-500 ${isCollected ? 'collected border-indigo-400' : 'grayscale'}`;
        const imgElement = document.createElement('img');
        imgElement.src = isCollected ? iconData.image : 'https://placehold.co/128x128/333/FFF?text=?';
        imgElement.alt = iconData.name;
        imgElement.className = 'w-full h-full object-cover rounded-full';
        stampElement.appendChild(imgElement);
        stampsContainer.appendChild(stampElement);
      }
    }

    function showPopup(iconId) {
      const iconData = TARGET_ICONS[iconId];
      popupImg.src = iconData.image;
      popupTitle.textContent = `Ikon Ditemukan!`;
      popup.classList.remove('hidden');
      if (navigator.vibrate) navigator.vibrate(200);
    }

    async function showWinScreen() {
      const winStampsContainer = document.getElementById('win-stamps-container');
      winStampsContainer.innerHTML = stampsContainer.innerHTML;
      winMessage.classList.remove('hidden');
      winMessage.classList.add('flex');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

      const participantId = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
      if (participantId) {
        await saveCompletionToFirebase(participantId);
      }
    }

    function handleTargetFound(iconId) {
      if (collectedIcons.has(iconId)) {
        scanStatus.textContent = "Ikon ini udah kamu ambil!";
        return;
      }
      scanStatus.textContent = `Berhasil nemuin ${TARGET_ICONS[iconId].name}!`;
      scanStatus.classList.add('text-green-400');
      collectedIcons.add(iconId);
      updateStampsUI();
      showPopup(iconId);

      if (collectedIcons.size === iconIds.length) {
        setTimeout(showWinScreen, 1000);
      }
    }

    // listener target AR
    for (let i = 0; i < iconIds.length; i++) {
      const targetEntity = document.querySelector(`#target-${i}`);
      if (targetEntity) {
        const iconId = iconIds[i];
        targetEntity.addEventListener('targetFound', () => handleTargetFound(iconId));
        targetEntity.addEventListener('targetLost', () => {
          scanStatus.textContent = "Arahkan kamera ke salah satu ikon target.";
          scanStatus.classList.remove('text-green-400');
        });
      }
    }

    updateStampsUI();
  }

  // tombol mulai
  startButton.addEventListener('click', () => {
    const participantId = participantInput.value.trim();
    if (participantId) {
      localStorage.setItem(PARTICIPANT_STORAGE_KEY, participantId);
      initializeGame(participantId);
    } else {
      alert('Nama / ID jangan kosong bro!');
    }
  });
});
