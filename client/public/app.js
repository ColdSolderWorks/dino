const API_BASE = 'http://localhost:3000/api';

let token = localStorage.getItem('token');
let user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
let tracks = [];
let queue = [];
let currentIndex = -1;
let shuffle = false;
let repeat = 'off'; // off | all | one
const playlistSelection = new Set();

const els = {
  registerUsername: document.getElementById('register-username'),
  registerPassword: document.getElementById('register-password'),
  registerBtn: document.getElementById('register-btn'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  loginBtn: document.getElementById('login-btn'),
  sessionInfo: document.getElementById('session-info'),
  trackList: document.getElementById('track-list'),
  playlistName: document.getElementById('playlist-name'),
  createPlaylist: document.getElementById('create-playlist'),
  playlistList: document.getElementById('playlist-list'),
  nowTitle: document.getElementById('now-title'),
  artwork: document.getElementById('artwork'),
  audio: document.getElementById('audio'),
  prev: document.getElementById('prev'),
  play: document.getElementById('play'),
  next: document.getElementById('next'),
  shuffle: document.getElementById('shuffle'),
  repeat: document.getElementById('repeat'),
  progressBar: document.getElementById('progress-bar'),
  progressFill: document.getElementById('progress-fill'),
  currentTime: document.getElementById('current-time'),
  duration: document.getElementById('duration'),
};

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.message || 'İstek başarısız');
  }
  return data;
}

function updateSessionInfo() {
  if (user) {
    els.sessionInfo.textContent = `Aktif kullanıcı: ${user.username}`;
  } else {
    els.sessionInfo.textContent = 'Oturum yok';
  }
}

async function register() {
  const username = els.registerUsername.value.trim();
  const password = els.registerPassword.value;
  if (!username || !password) return alert('Kullanıcı adı ve parola gerekli');
  try {
    await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    alert('Kayıt başarılı, şimdi giriş yapın');
  } catch (err) {
    alert(err.message);
  }
}

async function login() {
  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  if (!username || !password) return alert('Kullanıcı adı ve parola gerekli');
  try {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    token = data.token;
    user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    updateSessionInfo();
    await refreshData();
  } catch (err) {
    alert(err.message);
  }
}

async function refreshData() {
  if (!token) return;
  await loadTracks();
  await loadPlaylists();
}

async function loadTracks() {
  try {
    const data = await request('/tracks');
    tracks = data.tracks || [];
    renderTracks();
  } catch (err) {
    console.error(err);
  }
}

async function loadPlaylists() {
  try {
    const data = await request('/playlists');
    renderPlaylists(data.playlists || []);
  } catch (err) {
    console.error(err);
  }
}

function renderTracks() {
  els.trackList.innerHTML = '';
  tracks.forEach((track, index) => {
    const row = document.createElement('div');
    row.className = 'track-row';

    const meta = document.createElement('div');
    meta.className = 'track-meta';
    const sizeLabel = `${Math.max(track.size / 1024 / 1024, 0.01).toFixed(2)} MB`;
    meta.innerHTML = `<strong>${index + 1}. ${track.title}</strong><span class="muted">${track.filename} • ${sizeLabel}</span>`;

    const actions = document.createElement('div');
    actions.className = 'track-actions';

    const playBtn = document.createElement('button');
    playBtn.textContent = '▶️ Oynat';
    playBtn.onclick = () => startPlayback(track.id, true);

    const queueBtn = document.createElement('button');
    queueBtn.textContent = '➕ Kuyruk';
    queueBtn.onclick = () => addToQueue(track.id);

    const selectBtn = document.createElement('button');
    selectBtn.textContent = playlistSelection.has(track.id) ? '✓ Seçildi' : 'Listeye ekle';
    selectBtn.onclick = () => togglePlaylistSelection(track.id, selectBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ İndir';
    downloadBtn.onclick = () => downloadTrack(track.id, track.filename);

    actions.append(playBtn, queueBtn, selectBtn, downloadBtn);
    row.append(meta, actions);
    els.trackList.appendChild(row);
  });
}

function togglePlaylistSelection(trackId, btn) {
  if (playlistSelection.has(trackId)) {
    playlistSelection.delete(trackId);
    btn.textContent = 'Listeye Ekle';
  } else {
    playlistSelection.add(trackId);
    btn.textContent = 'Seçildi';
  }
}

function addToQueue(trackId) {
  queue.push(trackId);
  if (currentIndex === -1) {
    currentIndex = 0;
    startPlayback(queue[currentIndex]);
  }
}

function startPlayback(trackId, replaceQueue = false) {
  const track = tracks.find((t) => t.id === trackId);
  if (!track) return;
  if (replaceQueue) {
    queue = [trackId];
    currentIndex = 0;
  } else if (currentIndex === -1) {
    queue = [trackId];
    currentIndex = 0;
  } else {
    const idx = queue.indexOf(trackId);
    currentIndex = idx >= 0 ? idx : queue.push(trackId) - 1;
  }
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  els.audio.src = `${API_BASE}/tracks/${encodeURIComponent(track.id)}/stream${tokenParam}`;
  els.nowTitle.textContent = track.title;
  els.artwork.textContent = '🎧';
  els.audio.play();
  updatePlayButton();
}

function nextTrack() {
  if (queue.length === 0) return;
  if (repeat === 'one') {
    return startPlayback(queue[currentIndex]);
  }
  if (shuffle) {
    const next = Math.floor(Math.random() * queue.length);
    currentIndex = next;
    return startPlayback(queue[currentIndex]);
  }
  if (currentIndex < queue.length - 1) {
    currentIndex += 1;
  } else if (repeat === 'all') {
    currentIndex = 0;
  } else {
    return;
  }
  startPlayback(queue[currentIndex]);
}

function previousTrack() {
  if (queue.length === 0) return;
  if (currentIndex > 0) {
    currentIndex -= 1;
  } else if (repeat === 'all') {
    currentIndex = queue.length - 1;
  } else {
    return;
  }
  startPlayback(queue[currentIndex]);
}

function toggleShuffle() {
  shuffle = !shuffle;
  els.shuffle.textContent = shuffle ? '🔀 Shuffle: Açık' : '🔀 Shuffle';
}

function toggleRepeat() {
  if (repeat === 'off') repeat = 'all';
  else if (repeat === 'all') repeat = 'one';
  else repeat = 'off';
  const label =
    repeat === 'off' ? 'Tekrar: Kapalı' : repeat === 'all' ? 'Tekrar: Liste' : 'Tekrar: Şarkı';
  els.repeat.textContent = label;
}

async function createPlaylist() {
  const name = els.playlistName.value.trim();
  if (!name) return alert('Çalma listesi ismi gerekli');
  try {
    await request('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, trackIds: Array.from(playlistSelection) }),
    });
    playlistSelection.clear();
    els.playlistName.value = '';
    await loadPlaylists();
  } catch (err) {
    alert(err.message);
  }
}

function renderPlaylists(playlists) {
  els.playlistList.innerHTML = '';
  playlists.forEach((p) => {
    const li = document.createElement('li');
    const title = document.createElement('div');
    title.innerHTML = `<strong>${p.name}</strong>`;
    const meta = document.createElement('div');
    meta.className = 'playlist-meta';
    meta.textContent = `${p.trackIds.length} parça`;
    const playBtn = document.createElement('button');
    playBtn.textContent = 'Oynat';
    playBtn.onclick = () => {
      queue = [...p.trackIds];
      currentIndex = 0;
      if (queue.length > 0) startPlayback(queue[0]);
    };
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Sil';
    removeBtn.onclick = async () => {
      if (!confirm('Silinsin mi?')) return;
      await request(`/playlists/${p.id}`, { method: 'DELETE' });
      await loadPlaylists();
    };
    const group = document.createElement('div');
    group.className = 'track-actions';
    group.append(playBtn, removeBtn);
    li.append(title, meta, group);
    els.playlistList.appendChild(li);
  });
}

async function downloadTrack(trackId, filename) {
  try {
    const res = await fetch(`${API_BASE}/tracks/${encodeURIComponent(trackId)}/download`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error('İndirme başarısız');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
}

// Events
els.registerBtn.onclick = register;
els.loginBtn.onclick = login;
els.createPlaylist.onclick = createPlaylist;
els.prev.onclick = previousTrack;
els.next.onclick = nextTrack;
els.play.onclick = () => {
  if (els.audio.paused) {
    els.audio.play();
  } else {
    els.audio.pause();
  }
  updatePlayButton();
};
els.shuffle.onclick = toggleShuffle;
els.repeat.onclick = toggleRepeat;
els.audio.addEventListener('ended', nextTrack);
els.audio.addEventListener('timeupdate', () => {
  const { currentTime, duration } = els.audio;
  const percent = duration ? (currentTime / duration) * 100 : 0;
  els.progressFill.style.width = `${percent}%`;
  els.currentTime.textContent = formatTime(currentTime);
  els.duration.textContent = formatTime(duration || 0);
});
els.audio.addEventListener('play', updatePlayButton);
els.audio.addEventListener('pause', updatePlayButton);
els.progressBar.addEventListener('click', (event) => {
  const rect = els.progressBar.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  if (!isNaN(els.audio.duration)) {
    els.audio.currentTime = ratio * els.audio.duration;
  }
});

function formatTime(value) {
  if (!value || isNaN(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updatePlayButton() {
  els.play.textContent = els.audio.paused ? '▶️ Oynat' : '⏸ Duraklat';
}

updateSessionInfo();
if (token) {
  refreshData();
}
