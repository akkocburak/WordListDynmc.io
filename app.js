// DOM elementleri
const englishInput = document.getElementById('english-word');
const turkishInput = document.getElementById('turkish-meaning');
const addBtn = document.getElementById('add-word-btn');
const wordTableBody = document.querySelector('#word-table tbody');
const addSection = document.getElementById('add-section');
const listSection = document.getElementById('list-section');
const welcomeMessage = document.getElementById('welcome-message');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');

// Google API ve Sheets ayarları
const CLIENT_ID = '554939963602-lhms59khlmetckfh8ln3f69rihq57ahg.apps.googleusercontent.com';
const SHEET_ID = '12TKClJTECaIrhB4lnRkoMUMK3JEcNgu2lHewRcU22Ws';
const API_KEY = '';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4'
];
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let userEmail = '';
let gapiReady = false;
let userObj = null;

// Google Identity Services ile giriş yapan kullanıcıyı çöz
function getUserFromToken() {
  const token = localStorage.getItem('google_id_token');
  if (!token) return null;
  const payload = JSON.parse(atob(token.split('.')[1]));
  return {
    email: payload.email,
    name: payload.given_name || payload.name,
    fullName: payload.name,
    picture: payload.picture,
    id_token: token
  };
}

// Giriş/çıkış butonları
loginBtn.onclick = () => {
  window.location.href = 'login.html';
};
logoutBtn.onclick = () => {
  localStorage.removeItem('google_id_token');
  window.location.href = 'login.html';
};

// UI güncelle
function updateUIForUser(user) {
  if (user) {
    userEmail = user.email;
    userNameSpan.textContent = user.fullName;
    welcomeMessage.textContent = `Hoş geldin, ${user.name}!`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    addSection.style.display = 'block';
    listSection.style.display = 'block';
  } else {
    userEmail = '';
    userNameSpan.textContent = '';
    welcomeMessage.textContent = 'Hoş geldin!';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    addSection.style.display = 'none';
    listSection.style.display = 'none';
    wordTableBody.innerHTML = '';
  }
}

// Google API yüklenince başlat
window.gapiLoaded = function() {
  userObj = getUserFromToken();
  if (!userObj) {
    updateUIForUser(null);
    return;
  }
  updateUIForUser(userObj); // Önce arayüzü aç
  // GAPI başlat
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      });
      // id_token ile yetkilendir
      gapi.client.setToken({access_token: userObj.id_token});
      gapiReady = true;
      fetchWordsFromSheet();
    } catch (e) {
      alert('Google Sheets servisine bağlanılamadı. Lütfen sayfayı yenileyin.');
    }
  });
};

// Sheets'ten kelimeleri oku
function fetchWordsFromSheet() {
  if (!gapiReady) return;
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'WordListDb!A2:D',
  }).then(function(response) {
    const rows = response.result.values || [];
    const userWords = rows.filter(row => row[1] === userEmail);
    renderTable(userWords);
  }, function(response) {
    alert('Kelimeler alınamadı: ' + response.result.error.message);
  });
}

// Tabloyu güncelle
function renderTable(words) {
  wordTableBody.innerHTML = '';
  (words || []).forEach((item, idx) => {
    const tr = document.createElement('tr');
    // İngilizce
    const tdEng = document.createElement('td');
    tdEng.textContent = item[2];
    tr.appendChild(tdEng);
    // Türkçesi
    const tdTr = document.createElement('td');
    tdTr.textContent = item[3];
    tr.appendChild(tdTr);
    // Sesli Oku
    const tdSpeaker = document.createElement('td');
    const speakerBtn = document.createElement('button');
    speakerBtn.className = 'speaker-btn';
    speakerBtn.title = 'Sesli Oku';
    speakerBtn.innerHTML = '<svg height="22" viewBox="0 0 24 24" width="22" fill="#1976d2"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.74 2.5-2.26 2.5-4.02z"/></svg>';
    speakerBtn.onclick = () => speak(item[2]);
    tdSpeaker.appendChild(speakerBtn);
    tr.appendChild(tdSpeaker);
    // Sil
    const tdDelete = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Sil';
    delBtn.onclick = () => deleteWordFromSheet(item[0]);
    tdDelete.appendChild(delBtn);
    tr.appendChild(tdDelete);
    wordTableBody.appendChild(tr);
  });
}

// İngilizce kelime girilince otomatik çeviri
englishInput.addEventListener('input', async (e) => {
  const word = e.target.value.trim();
  if (word.length === 0) {
    turkishInput.value = '';
    return;
  }
  turkishInput.value = '...';
  const tr = await translateToTurkish(word);
  turkishInput.value = tr || '';
});

// Kelime ekle
addBtn.addEventListener('click', async () => {
  if (!gapiReady) return;
  const english = englishInput.value.trim();
  const turkish = turkishInput.value.trim();
  if (!english || !turkish || !userEmail) return;
  const id = Date.now().toString();
  const values = [[id, userEmail, english, turkish]];
  try {
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'WordListDb!A:D',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });
    englishInput.value = '';
    turkishInput.value = '';
    englishInput.focus();
    fetchWordsFromSheet();
  } catch (e) {
    alert('Kelime eklenemedi: ' + (e.result?.error?.message || e.message));
  }
});

// Enter ile ekle
englishInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

// Kelime sil
async function deleteWordFromSheet(id) {
  if (!gapiReady) return;
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'WordListDb!A2:A',
  });
  const rows = response.result.values || [];
  const rowIndex = rows.findIndex(row => row[0] === id);
  if (rowIndex === -1) return;
  const sheetRow = rowIndex + 2;
  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: 0,
            dimension: 'ROWS',
            startIndex: sheetRow - 1,
            endIndex: sheetRow,
          },
        },
      }],
    },
  });
  fetchWordsFromSheet();
}

// Çeviri fonksiyonu
async function translateToTurkish(text) {
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|tr`);
    const data = await res.json();
    return data.responseData.translatedText;
  } catch {
    return '';
  }
}

// Sesli okuma
function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  window.speechSynthesis.speak(utter);
} 