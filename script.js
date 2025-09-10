import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================
// Firebase Config & Init
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyBghUe2JnEgj9ZWEHEmnJMirJ0hX4nEGW4",
  authDomain: "ucapan-balon.firebaseapp.com",
  databaseURL: "https://ucapan-balon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ucapan-balon",
  storageBucket: "ucapan-balon.appspot.com",
  messagingSenderId: "72153682380",
  appId: "1:72153682380:web:0e87ad71e05a8330108d69"
};

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log("✅ Firebase berhasil diinisialisasi.");

  window.saveCompletionToFirebase = async (participantId) => {
    const firebaseStatus = document.getElementById('firebase-status');
    try {
      const completionRef = doc(db, "messages", participantId);
      await setDoc(completionRef, {
        participantId: participantId,
        completionTime: serverTimestamp(),
        type: 'IconHunterCompletion'
      });
      firebaseStatus.textContent = "Data berhasil disimpan! Tunjukkan layar ini ke panitia.";
      firebaseStatus.classList.remove('text-yellow-300');
      firebaseStatus.classList.add('text-green-300');
    } catch (e) {
      console.error("❌ Gagal mengirim data ke Firebase: ", e);
      firebaseStatus.textContent = "Gagal menyimpan data. Cek koneksi & tunjukkan layar ini.";
      firebaseStatus.classList.remove('text-yellow-300');
      firebaseStatus.classList.add('text-red-400');
    }
  };
} catch (e) {
  console.error("❌ Gagal inisialisasi Firebase.", e);
  window.saveCompletionToFirebase = async () => {
    document.getElementById('firebase-status').textContent = "Error: Firebase tidak terkonfigurasi.";
  };
}

// ==========================
// Script utama Game
// ==========================
document.addEventListener('DOMContentLoaded', () => {
  const TARGET_ICONS = {
    'icon_1': { name: 'Api Semangat', placeholder: 'https://placehold.co/128x128/333/FFF?text=1', image: 'jumanji1.png' },
    'icon_2': { name: 'Air Kehidupan', placeholder: 'https://placehold.co/128x128/333/FFF?text=2', image: 'jumanji2.png' },
    'icon_3': { name: 'Bumi Pertiwi', placeholder: 'https://placehold.co/128x128/333/FFF?text=3', image: 'jumanji3.png' },
    'icon_4': { name: 'Angin Perubahan', placeholder: 'https://placehold.co/128x128/333/FFF?text=4', image: 'jumanji4.png' },
    'icon_5': { name: 'Logam Keteguhan', placeholder: 'https://placehold.co/128x128/333/FFF?text=5', image: 'jumanji5.png' }
  };
  const iconIds = Object.keys(TARGET_ICONS);

  const ICON_STORAGE_KEY = 'iconHunterProgress';
  const PARTICIPANT_STORAGE_KEY = 'iconHunterParticipant';
  const SUBMITTED_STORAGE_KEY = 'iconHunterSubmitted';

  const loginScreen = document.getElementById('login-screen');
  const gameContainer = document.getElementById('game-container');
  const startButton = document.getElementById('start-button');
  const participantInput = document.getElementById('participant-id-input');

  // ==========================
  // Fungsi untuk mulai game
  // ==========================
  function initializeGame(participantId) {
    loginScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    const sceneEl = document.querySelector('a-scene');
    const targetSrc = new URL('./targets.mind', window.location.href).href;

    // Tambahkan attribute mindar-image
    sceneEl.setAttribute('mindar-image', { 
      imageTargetSrc: targetSrc, 
      autoStart: false, 
      uiScanning: '#scan-status' 
    });

    // FIX: Tunggu scene "loaded" baru start AR
    sceneEl.addEventListener('loaded', () => {
      const arSystem = sceneEl.systems['mindar-image-system'];
      if (arSystem) {
        console.log("✅ AR System ditemukan, memulai kamera...");
        arSystem.start();
      } else {
        console.error("❌ AR System tidak ditemukan!");
      }
    });

    // ==========================
    // State game
    // ==========================
    const savedIcons = localStorage.getItem(ICON_STORAGE_KEY);
    const collectedIcons = savedIcons ? new Set(JSON.parse(savedIcons)) : new Set();

    const stampsContainer = document.getElementById('stamps-container');
    const popup = document.getElementById('popup');
    const popupImg = document.getElementById('popup-img');
    const popupTitle = document.getElementById('popup-title');
    const winMessage = document.getElementById('win-message');
    const scanStatus = document.getElementById('scan-status');

    // Reset dengan klik 5x di title
    const titleElement = document.querySelector('.ui-header h1');
    let resetClickCount = 0;
    let resetTimeout;
    titleElement.addEventListener('click', () => {
      resetClickCount++;
      clearTimeout(resetTimeout);
      resetTimeout = setTimeout(() => { resetClickCount = 0; }, 2000);
      if (resetClickCount >= 5) {
        localStorage.removeItem(ICON_STORAGE_KEY);
        localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
        localStorage.removeItem(SUBMITTED_STORAGE_KEY);
        titleElement.textContent = 'Memori Dihapus!';
        titleElement.style.color = '#ef4444';
        setTimeout(() => window.location.reload(), 800);
      }
    });

    window.closePopup = () => popup.classList.add('hidden');

    // ==========================
    // UI update functions
    // ==========================
    function updateStampsUI() {
      stampsContainer.innerHTML = '';
      for (const iconId in TARGET_ICONS) {
        const iconData = TARGET_ICONS[iconId];
        const isCollected = collectedIcons.has(iconId);
        const stampElement = document.createElement('div');
        stampElement.className = `stamp w-16 h-16 md:w-20 md:h-20 bg-gray-700 rounded-full flex items-center justify-center border-4 border-gray-500 ${isCollected ? 'collected border-indigo-400' : 'grayscale'}`;
        const imgElement = document.createElement('img');
        imgElement.src = isCollected ? iconData.image : iconData.placeholder;
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
      winStampsContainer.querySelectorAll('.stamp').forEach(s => s.classList.remove('w-16', 'h-16'));
      winMessage.classList.remove('hidden');
      winMessage.classList.add('flex');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

      const alreadySubmitted = localStorage.getItem(SUBMITTED_STORAGE_KEY);
      if (!alreadySubmitted && window.saveCompletionToFirebase) {
        await window.saveCompletionToFirebase(participantId);
        localStorage.setItem(SUBMITTED_STORAGE_KEY, 'true');
      } else if (alreadySubmitted) {
        document.getElementById('firebase-status').textContent = "Data sudah pernah dikirim sebelumnya!";
      }
    }

    function handleTargetFound(iconId) {
      if (collectedIcons.has(iconId)) {
        scanStatus.textContent = "Ikon ini sudah kamu kumpulkan!";
        return;
      }
      scanStatus.textContent = `Berhasil mengenali ${TARGET_ICONS[iconId].name}!`;
      scanStatus.classList.add('text-green-400');
      collectedIcons.add(iconId);
      localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(Array.from(collectedIcons)));
      updateStampsUI();
      showPopup(iconId);
      if (collectedIcons.size === iconIds.length) {
        setTimeout(showWinScreen, 1000);
      }
    }

    // Event listener untuk target AR
    for (let i = 0; i < iconIds.length; i++) {
      const targetEntity = document.querySelector(`#target-${i}`);
      if (targetEntity) {
        const iconId = iconIds[i];
        targetEntity.addEventListener('targetFound', () => handleTargetFound(iconId));
        targetEntity.addEventListener('targetLost', () => {
          scanStatus.textContent = "Arahkan kamera ke salah satu Ikon Target.";
          scanStatus.classList.remove('text-green-400');
        });
      }
    }

    updateStampsUI();
    if (collectedIcons.size === iconIds.length) {
      showWinScreen();
    }
  }

  // ==========================
  // Login Check
  // ==========================
  const savedParticipantId = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
  if (savedParticipantId) {
    initializeGame(savedParticipantId);
  } else {
    loginScreen.classList.remove('hidden');
  }

startButton.addEventListener('click', () => {
  const participantId = participantInput.value.trim();
  if (participantId) {
    localStorage.setItem(PARTICIPANT_STORAGE_KEY, participantId);
    initializeGame(participantId);
  } else {
    alert("Nama atau ID tidak boleh kosong!");
  }
});
});
