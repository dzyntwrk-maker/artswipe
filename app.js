// ============================================================
// CONSTANTS
// ============================================================

const ART_STYLES = [
  { id: 'impressionism',   label: 'Impressionism',         icon: '🌸', query: 'impressionism painting' },
  { id: 'abstract',        label: 'Abstract',              icon: '🔷', query: 'abstract painting' },
  { id: 'surrealism',      label: 'Surrealism',            icon: '🌀', query: 'surrealism' },
  { id: 'pop',             label: 'Pop Art',               icon: '🎯', query: 'pop art' },
  { id: 'street',          label: 'Street Art & Graffiti', icon: '🏙', query: 'street art graffiti' },
  { id: 'expressionism',   label: 'Expressionism',         icon: '🔥', query: 'expressionism painting' },
  { id: 'abstractexpr',    label: 'Abstract Expressionism',icon: '💥', query: 'abstract expressionism' },
  { id: 'minimalism',      label: 'Minimalism',            icon: '▪', query: 'minimalism art' },
  { id: 'cubism',          label: 'Cubism',                icon: '◈', query: 'cubism painting' },
  { id: 'renaissance',     label: 'Renaissance',           icon: '🏛', query: 'renaissance painting' },
  { id: 'baroque',         label: 'Baroque',               icon: '✦', query: 'baroque painting' },
  { id: 'romanticism',     label: 'Romanticism',           icon: '🌹', query: 'romanticism painting' },
  { id: 'realism',         label: 'Realism',               icon: '🖼', query: 'realism painting' },
  { id: 'artnouveau',      label: 'Art Nouveau',           icon: '🌿', query: 'art nouveau' },
  { id: 'digital',         label: 'Digital Art',           icon: '💻', query: 'digital art' },
  { id: 'photography',     label: 'Photography',           icon: '📷', query: 'fine art photography' },
  { id: 'psychedelic',     label: 'Psychedelic',           icon: '🌈', query: 'psychedelic art' },
  { id: 'futurism',        label: 'Futurism',              icon: '⚡', query: 'futurism painting' },
  { id: 'contemporary',    label: 'Contemporary',          icon: '◉', query: 'contemporary art painting' },
  { id: 'japanese',        label: 'Japanese Art',          icon: '⛩', query: 'japanese woodblock ukiyo-e' },
];

const ARTISTS = [
  { id: 'vangogh',    label: 'Van Gogh',          icon: '🌻', query: 'Van Gogh' },
  { id: 'picasso',    label: 'Picasso',            icon: '◈', query: 'Pablo Picasso' },
  { id: 'dali',       label: 'Dalí',              icon: '🕰', query: 'Salvador Dali' },
  { id: 'warhol',     label: 'Warhol',             icon: '🎯', query: 'Andy Warhol' },
  { id: 'basquiat',   label: 'Basquiat',           icon: '🖊', query: 'Jean-Michel Basquiat' },
  { id: 'klimt',      label: 'Klimt',              icon: '✨', query: 'Gustav Klimt' },
  { id: 'haring',     label: 'Keith Haring',       icon: '💗', query: 'Keith Haring' },
  { id: 'kahlo',      label: 'Frida Kahlo',        icon: '🌺', query: 'Frida Kahlo' },
  { id: 'monet',      label: 'Monet',              icon: '💧', query: 'Claude Monet' },
  { id: 'pollock',    label: 'Pollock',            icon: '💥', query: 'Jackson Pollock' },
  { id: 'hokusai',    label: 'Hokusai',            icon: '🌊', query: 'Katsushika Hokusai' },
  { id: 'magritte',   label: 'Magritte',           icon: '🎩', query: 'René Magritte' },
  { id: 'rothko',     label: 'Rothko',             icon: '▪', query: 'Mark Rothko' },
  { id: 'munch',      label: 'Munch',              icon: '😱', query: 'Edvard Munch' },
  { id: 'matisse',    label: 'Matisse',            icon: '🎨', query: 'Henri Matisse' },
  { id: 'lichtenstein', label: 'Lichtenstein',     icon: '💬', query: 'Roy Lichtenstein' },
];

const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const SWIPE_THRESHOLD = 100;
const PREFETCH_SIZE = 6;

// ── Art quality filter ──────────────────────────────────────────────────────
// Block museum junk — buttons, pottery, beads, ancient artifacts, etc.
const BLOCKED_TITLE_WORDS = [
  'button','buttons','bead','beads','vessel','bowl','bowls','jar','jars',
  'cup','cups','plate','plates','pitcher','pitchers','vase','vases',
  'ewer','flask','amphora','kylix','lekythos','krater','oinochoe',
  'coin','coins','medal','medals','badge','brooch','pin','clasp',
  'buckle','hook','needle','tile','tiles','shard','fragment',
  'textile','fabric','tapestry','carpet','rug','furniture','chair',
  'table','cabinet','box','chest','lock','key','knife','sword',
  'helmet','armor','armour','spear','axe','dagger',
  'necklace','bracelet','ring','earring','pendant','fibula',
  'statuette','figurine','amulet','scarab','mummy',
  'inscription','relief','frieze','sarcophagus',
];

const BLOCKED_MEDIUMS = [
  'ceramic','earthenware','stoneware','faience','porcelain',
  'terracotta','bone','ivory','shell','amber',
];

const GOOD_DEPARTMENTS = new Set([
  'European Paintings',
  'American Paintings and Sculpture',
  'Drawings and Prints',
  'Photographs',
  'Modern Art',
  'Contemporary Art',
  'Robert Lehman Collection',
  'The American Wing',
  'Asian Art',
]);

function isQualityArt(data) {
  const title  = (data.title || '').toLowerCase();
  const medium = (data.medium || '').toLowerCase();
  const dept   = data.department || '';
  const type   = (data.objectName || '').toLowerCase();

  // Must have an image
  if (!data.primaryImageSmall && !data.primaryImage) return false;

  // Block by title keyword
  for (const w of BLOCKED_TITLE_WORDS) {
    if (title.includes(w)) return false;
  }

  // Block ugly mediums
  for (const m of BLOCKED_MEDIUMS) {
    if (medium.includes(m)) return false;
  }

  // If we know the department, prefer good ones
  if (dept && !GOOD_DEPARTMENTS.has(dept)) {
    // Allow if it's clearly a painting or drawing regardless of dept
    if (!medium.includes('oil') && !medium.includes('acrylic') &&
        !medium.includes('watercolor') && !medium.includes('gouache') &&
        !medium.includes('ink') && !medium.includes('pencil') &&
        !medium.includes('chalk') && !medium.includes('pastel') &&
        !type.includes('painting') && !type.includes('print') &&
        !type.includes('drawing') && !type.includes('photograph')) {
      return false;
    }
  }

  return true;
}

// ============================================================
// STATE
// ============================================================

const state = {
  user: null,       // { name, preferences: { styles: [], artists: [] } }
  queue: [],        // objectIDs to show
  cache: {},        // objectID -> artData
  liked: [],        // array of artData
  currentArt: null, // artData for top card
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  isAnimating: false,
};

// ============================================================
// PERSISTENCE
// ============================================================

function save() {
  if (!state.user) return;
  localStorage.setItem('artswipe_user', JSON.stringify(state.user));
  localStorage.setItem('artswipe_liked', JSON.stringify(state.liked));
  localStorage.setItem('artswipe_queue', JSON.stringify(state.queue));
  localStorage.setItem('artswipe_cache', JSON.stringify(state.cache));
}

function load() {
  try {
    const user = localStorage.getItem('artswipe_user');
    const liked = localStorage.getItem('artswipe_liked');
    const queue = localStorage.getItem('artswipe_queue');
    const cache = localStorage.getItem('artswipe_cache');
    if (user) state.user = JSON.parse(user);
    if (liked) state.liked = JSON.parse(liked);
    if (queue) state.queue = JSON.parse(queue);
    if (cache) state.cache = JSON.parse(cache);
  } catch (e) {
    console.warn('Failed to load saved state', e);
  }
}

// ============================================================
// PAGE NAVIGATION
// ============================================================

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ============================================================
// MET MUSEUM API
// ============================================================

async function fetchIDs(query) {
  try {
    const url = `${MET_BASE}/search?hasImages=true&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.objectIDs || [];
  } catch {
    return [];
  }
}

async function fetchArt(objectID) {
  if (state.cache[objectID]) return state.cache[objectID];
  try {
    const res = await fetch(`${MET_BASE}/objects/${objectID}`);
    const data = await res.json();

    // Quality gate — skip pottery, beads, buttons, artifacts
    if (!isQualityArt(data)) return null;

    const art = {
      id: data.objectID,
      title: data.title || 'Untitled',
      artist: data.artistDisplayName || 'Unknown Artist',
      date: data.objectDate || '',
      dept: data.department || '',
      medium: data.medium || '',
      imageSmall: data.primaryImageSmall || data.primaryImage,
      imageLarge: data.primaryImage || data.primaryImageSmall,
      metUrl: data.objectURL || `https://www.metmuseum.org/art/collection/search/${data.objectID}`,
    };
    state.cache[objectID] = art;
    return art;
  } catch {
    return null;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function buildQueue(preferences) {
  const queries = [
    ...preferences.styles.map(id => ART_STYLES.find(s => s.id === id)?.query).filter(Boolean),
    ...preferences.artists.map(id => ARTISTS.find(a => a.id === id)?.query).filter(Boolean),
  ];

  // Fetch in parallel, plus add some broad "always-good" searches
  const broadQueries = ['painting oil canvas', 'watercolor painting', 'fine art print'];
  const allQueries = [...queries, ...broadQueries];

  const idSets = await Promise.all(allQueries.map(fetchIDs));
  const seen = new Set(state.liked.map(a => String(a.id)));

  const merged = shuffle([...new Set(idSets.flat())])
    .filter(id => !seen.has(String(id)))
    .slice(0, 2000); // big pool so we don't run dry

  state.queue = merged;
  save();
}

// Auto-refill queue when running low
async function refillQueueIfNeeded() {
  if (state.queue.length < 30 && state.user?.preferences) {
    const extra = await fetchIDs('painting fine art');
    const seen = new Set([
      ...state.liked.map(a => String(a.id)),
      ...state.queue.map(String),
    ]);
    const fresh = shuffle(extra).filter(id => !seen.has(String(id))).slice(0, 500);
    state.queue.push(...fresh);
    save();
  }
}

// ============================================================
// CARD RENDERING
// ============================================================

function getCardStack() {
  return document.getElementById('card-stack');
}

function setLikeCount() {
  document.getElementById('like-count').textContent = state.liked.length;
}

function createCardEl(art) {
  const card = document.createElement('div');
  card.className = 'card card-enter';
  card.dataset.id = art.id;

  const img = document.createElement('img');
  img.className = 'card-image';
  img.src = art.imageSmall;
  img.alt = art.title;
  img.draggable = false;

  const loveInd = document.createElement('div');
  loveInd.className = 'card-indicator love';
  loveInd.textContent = 'LOVE ♥';

  const nopeInd = document.createElement('div');
  nopeInd.className = 'card-indicator nope';
  nopeInd.textContent = 'NOPE ✕';

  const info = document.createElement('div');
  info.className = 'card-info';
  info.innerHTML = `
    <div class="card-title">${escHtml(art.title)}</div>
    <div class="card-artist">${escHtml(art.artist)}${art.date ? ' · ' + escHtml(art.date) : ''}</div>
    ${art.dept ? `<div class="card-dept">${escHtml(art.dept)}</div>` : ''}
  `;

  card.appendChild(img);
  card.appendChild(loveInd);
  card.appendChild(nopeInd);
  card.appendChild(info);

  return card;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// SWIPE ENGINE
// ============================================================

let prefetchPromise = null;
let prefetchedCards = []; // { art, el } ready to insert

async function prefetch() {
  refillQueueIfNeeded(); // kick off refill in background if low
  while (prefetchedCards.length < PREFETCH_SIZE && state.queue.length > 0) {
    const id = state.queue.shift();
    save();
    const art = await fetchArt(id);
    if (!art) continue; // filtered out by quality gate
    const el = createCardEl(art);
    prefetchedCards.push({ art, el });
  }
}

async function loadNextCard() {
  if (state.isAnimating) return;

  const stack = getCardStack();

  // Remove the first card (just swiped)
  const first = stack.querySelector('.card');
  if (first) first.remove();

  // Fill stack up to 3 from prefetch buffer
  while (prefetchedCards.length > 0 && stack.querySelectorAll('.card').length < 3) {
    const { el } = prefetchedCards.shift();
    stack.appendChild(el);
  }

  const cards = stack.querySelectorAll('.card');

  if (cards.length === 0) {
    if (state.queue.length === 0 && prefetchedCards.length === 0) {
      showEmptyState();
    } else {
      showLoadingState();
      await prefetch();
      hideLoadingState();
      loadNextCard();
    }
    return;
  }

  // First card in DOM = new top; attach handlers and update currentArt
  const newTop = cards[0];
  state.currentArt = state.cache[newTop.dataset.id] || null;
  makeTopCard(newTop);

  prefetch();
}

function showLoadingState() {
  document.getElementById('card-stack').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('loading-state').style.display = 'flex';
}
function hideLoadingState() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('card-stack').style.display = '';
}
function showEmptyState() {
  document.getElementById('card-stack').style.display = 'none';
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'flex';
}

async function initSwipe() {
  showLoadingState();
  await prefetch();
  hideLoadingState();

  const stack = getCardStack();
  stack.querySelectorAll('.card').forEach(c => c.remove());

  // Render up to 3 initial cards (first in DOM = top card)
  const initial = prefetchedCards.splice(0, 3);
  initial.forEach(({ art, el }) => stack.appendChild(el));

  const first = stack.querySelector('.card');
  if (first) {
    state.currentArt = state.cache[first.dataset.id] || initial[0]?.art || null;
    makeTopCard(first);
  }

  prefetch();
}

function makeTopCard(cardEl) {
  if (cardEl._swipeAttached) return;
  cardEl._swipeAttached = true;
  attachSwipeHandlers(cardEl);
}

// ============================================================
// DRAG / SWIPE HANDLERS
// ============================================================

function attachSwipeHandlers(card) {
  const ac = new AbortController();
  const sig = ac.signal;
  let startX = 0, startY = 0, isDragging = false;

  function onDown(e) {
    if (state.isAnimating) return;
    isDragging = true;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    card.style.transition = 'none';
  }

  function onMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - startX;
    const dy = pt.clientY - startY;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.08}deg)`;
    const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
    card.querySelector('.card-indicator.love').style.opacity = dx > 0 ? progress : 0;
    card.querySelector('.card-indicator.nope').style.opacity = dx < 0 ? progress : 0;
  }

  function onUp(e) {
    if (!isDragging) return;
    isDragging = false;
    const pt = e.changedTouches ? e.changedTouches[0] : e;
    const dx = pt.clientX - startX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      ac.abort(); // clean up listeners — card is done
      completeSwipe(dx > 0 ? 'right' : 'left', card);
    } else {
      card.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      card.style.transform = '';
      card.querySelector('.card-indicator.love').style.opacity = 0;
      card.querySelector('.card-indicator.nope').style.opacity = 0;
    }
  }

  card.addEventListener('mousedown', onDown, { signal: sig });
  window.addEventListener('mousemove', onMove, { signal: sig });
  window.addEventListener('mouseup', onUp, { signal: sig });
  card.addEventListener('touchstart', onDown, { passive: true, signal: sig });
  card.addEventListener('touchmove', onMove, { passive: false, signal: sig });
  card.addEventListener('touchend', onUp, { signal: sig });
}

function completeSwipe(direction, card) {
  if (state.isAnimating) return;
  state.isAnimating = true;

  card.classList.add(direction === 'right' ? 'card-fly-right' : 'card-fly-left');

  if (direction === 'right' && state.currentArt) {
    const alreadyLiked = state.liked.some(a => a.id === state.currentArt.id);
    if (!alreadyLiked) {
      state.liked.push(state.currentArt);
      save();
    }
    setLikeCount();

    const likeBtn = document.getElementById('like-btn');
    likeBtn.classList.remove('heart-pulse');
    void likeBtn.offsetWidth;
    likeBtn.classList.add('heart-pulse');
  }

  setTimeout(async () => {
    state.isAnimating = false;
    await loadNextCard();
  }, 420);
}

// ============================================================
// LOGIN
// ============================================================

function initLogin() {
  const input = document.getElementById('username-input');
  const btn = document.getElementById('login-btn');

  input.addEventListener('input', () => {
    btn.disabled = input.value.trim().length < 2;
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim().length >= 2) handleLogin();
  });

  btn.addEventListener('click', handleLogin);
}

function handleLogin() {
  const name = document.getElementById('username-input').value.trim();
  if (name.length < 2) return;

  state.user = state.user || {};
  state.user.name = name;

  if (state.user.preferences && state.queue.length > 0) {
    showPage('page-swipe');
    setLikeCount();
    initSwipe();
  } else {
    showPage('page-preferences');
    renderPreferences();
  }
}

// ============================================================
// PREFERENCES
// ============================================================

function renderPreferences() {
  const styleContainer = document.getElementById('style-chips');
  const artistContainer = document.getElementById('artist-chips');

  styleContainer.innerHTML = '';
  artistContainer.innerHTML = '';

  const savedPrefs = state.user?.preferences || { styles: [], artists: [] };

  ART_STYLES.forEach(s => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (savedPrefs.styles.includes(s.id) ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${s.icon}</span>${s.label}`;
    chip.dataset.id = s.id;
    chip.dataset.type = 'style';
    chip.addEventListener('click', () => toggleChip(chip, 'style'));
    styleContainer.appendChild(chip);
  });

  ARTISTS.forEach(a => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (savedPrefs.artists.includes(a.id) ? ' selected' : '');
    chip.innerHTML = `<span class="chip-icon">${a.icon}</span>${a.label}`;
    chip.dataset.id = a.id;
    chip.dataset.type = 'artist';
    chip.addEventListener('click', () => toggleChip(chip, 'artist'));
    artistContainer.appendChild(chip);
  });

  updatePrefCount();
}

function toggleChip(chip, type) {
  chip.classList.toggle('selected');
  updatePrefCount();
}

function updatePrefCount() {
  const selected = document.querySelectorAll('.chip.selected').length;
  const countEl = document.getElementById('pref-count');
  const btn = document.getElementById('start-btn');
  if (selected === 0) {
    countEl.textContent = 'Select at least 1 preference';
    btn.disabled = true;
  } else {
    countEl.textContent = `${selected} selected`;
    btn.disabled = false;
  }
}

function getSelectedPrefs() {
  const styles = [...document.querySelectorAll('#style-chips .chip.selected')].map(c => c.dataset.id);
  const artists = [...document.querySelectorAll('#artist-chips .chip.selected')].map(c => c.dataset.id);
  return { styles, artists };
}

async function handleStartExploring() {
  const prefs = getSelectedPrefs();
  if (prefs.styles.length === 0 && prefs.artists.length === 0) return;

  state.user.preferences = prefs;
  state.queue = [];
  state.cache = {};
  prefetchedCards = [];

  // Clear card stack
  const stack = getCardStack();
  stack.querySelectorAll('.card').forEach(c => c.remove());

  save();
  showPage('page-swipe');
  setLikeCount();

  showLoadingState();
  await buildQueue(prefs);
  await initSwipe();
  hideLoadingState();
}

// ============================================================
// PROFILE
// ============================================================

function showProfile() {
  document.getElementById('profile-username').textContent = state.user?.name || 'My Collection';
  document.getElementById('profile-stats').textContent =
    `${state.liked.length} piece${state.liked.length !== 1 ? 's' : ''} saved`;

  renderLikedGrid();
  showPage('page-profile');
}

function renderLikedGrid() {
  const grid = document.getElementById('liked-grid');
  grid.innerHTML = '';

  if (state.liked.length === 0) {
    grid.innerHTML = '<div class="empty-collection"><p>No saved art yet.</p><p>Start swiping to build your collection!</p></div>';
    return;
  }

  [...state.liked].reverse().forEach(art => {
    const item = document.createElement('div');
    item.className = 'liked-item';

    const img = document.createElement('img');
    img.src = art.imageSmall;
    img.alt = art.title;
    img.loading = 'lazy';

    const info = document.createElement('div');
    info.className = 'liked-item-info';
    info.innerHTML = `
      <div class="liked-item-title">${escHtml(art.title)}</div>
      <div class="liked-item-artist">${escHtml(art.artist)}</div>
    `;

    const dlBtn = document.createElement('button');
    dlBtn.className = 'liked-item-download';
    dlBtn.title = 'Download';
    dlBtn.textContent = '↓';
    dlBtn.addEventListener('click', e => {
      e.stopPropagation();
      downloadArt(art.imageLarge || art.imageSmall, art.title);
    });

    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(dlBtn);
    item.addEventListener('click', () => openModal(art));
    grid.appendChild(item);
  });
}

// ============================================================
// ART INFO MODAL
// ============================================================

function openModal(art) {
  document.getElementById('modal-image').src = art.imageLarge || art.imageSmall;
  document.getElementById('modal-title').textContent = art.title;
  document.getElementById('modal-artist').textContent = art.artist;
  document.getElementById('modal-date').textContent = art.date;
  document.getElementById('modal-dept').textContent = art.dept;
  document.getElementById('modal-medium').textContent = art.medium;
  document.getElementById('modal-met-link').href = art.metUrl;

  document.getElementById('modal-download').onclick = () =>
    downloadArt(art.imageLarge || art.imageSmall, art.title);

  document.getElementById('art-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('art-modal').style.display = 'none';
}

// ============================================================
// DOWNLOAD
// ============================================================

async function downloadArt(url, title) {
  const filename = title.replace(/[^a-z0-9]/gi, '_').slice(0, 60) + '.jpg';
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

// ============================================================
// KEYBOARD
// ============================================================

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (document.getElementById('page-swipe').classList.contains('active')) {
      if (e.key === 'ArrowRight') {
        const top = getCardStack().querySelector('.card');
        if (top) completeSwipe('right', top);
      } else if (e.key === 'ArrowLeft') {
        const top = getCardStack().querySelector('.card');
        if (top) completeSwipe('left', top);
      }
    }
  });
}

// ============================================================
// BUTTON WIRING
// ============================================================

function initButtons() {
  // Login
  initLogin();

  // Preferences
  document.getElementById('start-btn').addEventListener('click', handleStartExploring);

  // Swipe page
  document.getElementById('like-btn').addEventListener('click', () => {
    const top = getCardStack().querySelector('.card');
    if (top && !state.isAnimating) completeSwipe('right', top);
  });
  document.getElementById('skip-btn').addEventListener('click', () => {
    const top = getCardStack().querySelector('.card');
    if (top && !state.isAnimating) completeSwipe('left', top);
  });
  document.getElementById('info-btn').addEventListener('click', () => {
    if (state.currentArt) openModal(state.currentArt);
  });
  document.getElementById('profile-btn').addEventListener('click', showProfile);
  document.getElementById('prefs-btn').addEventListener('click', () => {
    showPage('page-preferences');
    renderPreferences();
  });
  document.getElementById('new-prefs-btn').addEventListener('click', () => {
    document.getElementById('empty-state').style.display = 'none';
    showPage('page-preferences');
    renderPreferences();
  });

  // Profile page
  document.getElementById('back-btn').addEventListener('click', () => showPage('page-swipe'));
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    location.reload();
  });

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
}

// ============================================================
// INIT
// ============================================================

function init() {
  load();
  initButtons();
  initKeyboard();

  if (state.user?.name) {
    document.getElementById('username-input').value = state.user.name;
    if (state.user.preferences && state.queue.length > 0) {
      showPage('page-swipe');
      setLikeCount();
      initSwipe();
      return;
    }
  }

  showPage('page-login');
}

init();
