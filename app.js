// DOM elementleri
const englishInput = document.getElementById('english-word');
const turkishInput = document.getElementById('turkish-meaning');
const addBtn = document.getElementById('add-word-btn');
const wordTableBody = document.querySelector('#word-table tbody');

// localStorage anahtarı
const STORAGE_KEY = 'myWords';

// Kelimeleri yükle
function loadWords() {
  const words = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return words;
}

// Kelimeleri kaydet
function saveWords(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

// Tabloyu güncelle
function renderTable() {
  const words = loadWords();
  wordTableBody.innerHTML = '';
  words.forEach((item, idx) => {
    const tr = document.createElement('tr');
    // İngilizce
    const tdEng = document.createElement('td');
    tdEng.textContent = item.english;
    tr.appendChild(tdEng);
    // Türkçesi
    const tdTr = document.createElement('td');
    tdTr.textContent = item.turkish;
    tr.appendChild(tdTr);
    // Sesli Oku
    const tdSpeaker = document.createElement('td');
    const speakerBtn = document.createElement('button');
    speakerBtn.className = 'speaker-btn';
    speakerBtn.title = 'Sesli Oku';
    speakerBtn.innerHTML = '<svg height="22" viewBox="0 0 24 24" width="22" fill="#1976d2"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.74 2.5-2.26 2.5-4.02z"/></svg>';
    speakerBtn.onclick = () => speak(item.english);
    tdSpeaker.appendChild(speakerBtn);
    tr.appendChild(tdSpeaker);
    // Sil
    const tdDelete = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Sil';
    delBtn.onclick = () => {
      words.splice(idx, 1);
      saveWords(words);
      renderTable();
    };
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
addBtn.addEventListener('click', () => {
  const english = englishInput.value.trim();
  const turkish = turkishInput.value.trim();
  if (!english || !turkish) return;
  const words = loadWords();
  words.push({ english, turkish });
  saveWords(words);
  renderTable();
  englishInput.value = '';
  turkishInput.value = '';
  englishInput.focus();
});

// Enter ile ekle
englishInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

// Çeviri fonksiyonu (ücretsiz MyMemory API)
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

// Sayfa yüklenince tabloyu göster
renderTable(); 