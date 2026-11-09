// The Quiet Target - JavaScript

// ============================================
// STORAGE (safe wrappers: storage can be blocked)
// ============================================
const STORAGE_KEYS = {
  theme: 'quiet-target-theme',
  textSize: 'quiet-target-text-size',
  lastReadPosition: 'quiet-target-last-position'
};

const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
};

const htmlElement = document.documentElement;

// ============================================
// THEME
// ============================================
const themeToggle = document.querySelector('.theme-toggle');

function getSavedTheme() {
  const saved = store.get(STORAGE_KEYS.theme);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme) {
  if (theme === 'light') htmlElement.setAttribute('data-theme', 'light');
  else htmlElement.removeAttribute('data-theme');
  themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  store.set(STORAGE_KEYS.theme, theme);
}

themeToggle.addEventListener('click', () => {
  setTheme(htmlElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
});
setTheme(getSavedTheme());

// ============================================
// TEXT SIZE (applied to <html> so rem units scale)
// ============================================
const textSizeDecrease = document.querySelector('.text-size-decrease');
const textSizeReset = document.querySelector('.text-size-reset');
const textSizeIncrease = document.querySelector('.text-size-increase');
const TEXT_SIZE_STEPS = [75, 87.5, 100, 112.5, 125, 150, 175, 200];
const DEFAULT_TEXT_SIZE = 100;

function getSavedTextSize() {
  const saved = parseFloat(store.get(STORAGE_KEYS.textSize));
  return TEXT_SIZE_STEPS.includes(saved) ? saved : DEFAULT_TEXT_SIZE;
}

function setTextSize(percent) {
  htmlElement.style.fontSize = percent + '%';
  store.set(STORAGE_KEYS.textSize, percent);
  [textSizeDecrease, textSizeReset, textSizeIncrease].forEach(b => b.classList.remove('active'));
  if (percent < DEFAULT_TEXT_SIZE) textSizeDecrease.classList.add('active');
  else if (percent === DEFAULT_TEXT_SIZE) textSizeReset.classList.add('active');
  else textSizeIncrease.classList.add('active');
}

function changeTextSize(delta) {
  const index = TEXT_SIZE_STEPS.indexOf(getSavedTextSize());
  const next = Math.max(0, Math.min(TEXT_SIZE_STEPS.length - 1, index + delta));
  setTextSize(TEXT_SIZE_STEPS[next]);
}

textSizeDecrease.addEventListener('click', () => changeTextSize(-1));
textSizeReset.addEventListener('click', () => setTextSize(DEFAULT_TEXT_SIZE));
textSizeIncrease.addEventListener('click', () => changeTextSize(1));
setTextSize(getSavedTextSize());

// ============================================
// PRINT
// ============================================
document.querySelector('.print-btn').addEventListener('click', () => window.print());

// ============================================
// BUILD TOC + SEARCH INDEX FROM THE PAGE ITSELF
// (so they can never drift out of sync with the content)
// ============================================
const items = [];      // TOC entries, in reading order
const searchIndex = [];
let sectionNumber = 0;

document.querySelectorAll('#reader-column .part, #reader-column .section').forEach(el => {
  if (el.classList.contains('part')) {
    items.push({ type: 'part', id: el.id, title: el.querySelector('.part-title').textContent });
  } else {
    sectionNumber += 1;
    const title = el.querySelector('h2').textContent;
    items.push({ type: 'section', id: el.id, title: sectionNumber + '. ' + title });
    const text = Array.from(el.querySelectorAll('p, li, blockquote')).map(n => n.textContent).join(' ');
    searchIndex.push({ title: sectionNumber + '. ' + title, content: text, href: '#' + el.id });
  }
});

const tocRailList = document.getElementById('toc-rail-list');
const tocOverlayList = document.getElementById('toc-list');

function buildTocList(container) {
  container.innerHTML = items.map(i =>
    i.type === 'part'
      ? `<li class="toc-part" aria-hidden="true">${i.title}</li>`
      : `<li><a href="#${i.id}">${i.title}</a></li>`
  ).join('');
}
buildTocList(tocRailList);
buildTocList(tocOverlayList);

const tocLinks = document.querySelectorAll('.toc-list a');
const sectionElements = items.filter(i => i.type === 'section').map(i => document.getElementById(i.id));

// ============================================
// SCROLL SPY, PROGRESS BAR, LAST POSITION
// ============================================
function updateTocActive(activeId) {
  tocLinks.forEach(link => {
    link.setAttribute('aria-current', link.getAttribute('href') === '#' + activeId ? 'true' : 'false');
  });
}

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      updateTocActive(entry.target.id);
      store.set(STORAGE_KEYS.lastReadPosition, entry.target.id);
    }
  });
}, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
sectionElements.forEach(el => sectionObserver.observe(el));

const progressBar = document.getElementById('progress-bar');
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// ============================================
// SEARCH
// ============================================
const searchToggle = document.querySelector('.search-toggle');
const searchOverlay = document.getElementById('search-overlay');
const searchClose = document.querySelector('.search-close');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

function openSearch() {
  searchOverlay.hidden = false;
  searchToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  setTimeout(() => searchInput.focus(), 50);
}

function closeSearch() {
  searchOverlay.hidden = true;
  searchToggle.setAttribute('aria-expanded', 'false');
  searchInput.value = '';
  searchResults.innerHTML = '';
  document.body.style.overflow = '';
}

searchToggle.addEventListener('click', openSearch);
searchClose.addEventListener('click', closeSearch);
searchOverlay.addEventListener('click', e => { if (e.target === searchOverlay) closeSearch(); });
searchResults.addEventListener('click', e => { if (e.target.closest('a')) closeSearch(); });

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const escaped = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp('(' + escaped + ')', 'gi'), '<span class="search-match">$1</span>');
}

function createExcerpt(content, query, maxLength = 170) {
  const index = content.toLowerCase().indexOf(query.toLowerCase());
  const start = index === -1 ? 0 : Math.max(0, index - 60);
  const end = Math.min(content.length, start + maxLength);
  return (start > 0 ? '…' : '') + highlightMatch(content.substring(start, end), query) + (end < content.length ? '…' : '');
}

function performSearch() {
  const query = searchInput.value.trim();
  searchResults.innerHTML = '';
  if (query.length < 2) return;

  const lower = query.toLowerCase();
  const hits = searchIndex.filter(i => i.title.toLowerCase().includes(lower) || i.content.toLowerCase().includes(lower));

  if (!hits.length) {
    searchResults.innerHTML = '<div class="no-results" role="status">No matches. Try: control, anger, sleep, prayer, Marcus, thought record</div>';
    return;
  }

  searchResults.innerHTML = hits.map(hit => `
    <div class="search-hit" role="listitem">
      <h3><a href="${hit.href}">${highlightMatch(hit.title, query)}</a></h3>
      <p class="search-excerpt">${createExcerpt(hit.content, query)}</p>
    </div>`).join('');
}

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(performSearch, 120);
});

// ============================================
// TOC OVERLAY (mobile)
// ============================================
const tocToggle = document.querySelector('.toc-toggle');
const tocOverlay = document.getElementById('toc-overlay');
const tocClose = document.querySelector('.toc-close');

function openToc() {
  tocOverlay.hidden = false;
  tocToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeToc() {
  tocOverlay.hidden = true;
  tocToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

tocToggle.addEventListener('click', openToc);
tocClose.addEventListener('click', closeToc);
tocOverlay.addEventListener('click', e => { if (e.target === tocOverlay) closeToc(); });
tocOverlayList.addEventListener('click', e => { if (e.target.closest('a')) closeToc(); });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!searchOverlay.hidden) closeSearch();
  if (!tocOverlay.hidden) closeToc();
});

// ============================================
// COPY BUTTONS
// ============================================
const copyContent = {
  brief: '',

  thought: `THOUGHT RECORD

Date / time:

1. SITUATION (facts only, as a camera would record it):

2. THOUGHT (what went through my mind?)   Belief 0–100:

3. FEELING (name it)   Intensity 0–100:

4. OTHER POSSIBLE EXPLANATIONS (at least two, even ones I doubt):
   a)
   b)
   Evidence for / against each:

5. BALANCED VIEW AND MY NEXT STEP:

Feeling now 0–100:`,

  log: 'Date\tTime\tFact (what happened)\tInterpretation (what I made of it)\tFeeling 0-100\tResponse (what I did / will do)\tThree good things\n',

  goodlife: `MY GOOD LIFE LIST

Ten things that make a day good (a song, a meal, a place, a person, a task):
1.
2.
3.
4.
5.
6.
7.
8.
9.
10.

THIS WEEK:
- One new song I love:
- One good meal I will cook:
- Three long walks (days):
- One thing I am building or learning (first 20-minute step):
- One person I will call:`,

  prayer: `THE QUIET TARGET — PRAYER CARD

MORNING OFFERING
O Jesus, through the Immaculate Heart of Mary, I offer You my prayers, works, joys and sufferings of this day, for all the intentions of Your Sacred Heart. Amen.

GUARDIAN ANGEL
Angel of God, my guardian dear, to whom God's love commits me here, ever this day be at my side, to light and guard, to rule and guide. Amen.

THE JESUS PRAYER
Lord Jesus Christ, Son of God, have mercy on me, a sinner.

PRAYER TO SAINT MICHAEL
Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.

THE MEMORARE
Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thy intercession, was left unaided. Inspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother; to thee do I come, before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.

A PRAYER FOR THOSE WHO TROUBLE ME
Lord, I place before You those who trouble me. I do not understand them, and I am not asked to. Bless them, heal what is broken in them, and keep my heart free of bitterness. Amen.

ACT OF CONTRITION (EVENING)
O my God, I am heartily sorry for having offended Thee, and I detest all my sins because of Thy just punishments, but most of all because they offend Thee, my God, who art all-good and deserving of all my love. I firmly resolve, with the help of Thy grace, to sin no more and to avoid the near occasion of sin. Amen.

SERENITY PRAYER
God, grant me the serenity to accept the things I cannot change, courage to change the things I can, and wisdom to know the difference.`,

  pocket: `THE QUIET TARGET — POCKET CARD

MORNING: same wake time · water · "mine / not mine" list · offer the day
DAY: do the work in front of me · one walk · one valued activity · one kind conversation · check only in my window
EVENING: fact / interpretation / response · three good things · St Michael prayer · lights out

WHEN ALARM RISES: breathe in 4, out 6 · "This is an impression. I will look at it before I believe it."
IN DANGER OR THINKING OF HARM: 911 or 988

"It is in thy power whenever thou shalt choose to retire into thyself." — Marcus Aurelius
"Pray, hope, and don't worry." — Padre Pio

God, grant me the serenity to accept the things I cannot change, courage to change the things I can, and wisdom to know the difference.`
};

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(textarea);
  return ok;
}

document.querySelectorAll('.copy-btn').forEach(btn => {
  const originalText = btn.textContent;
  const flash = label => {
    btn.textContent = label;
    setTimeout(() => { btn.textContent = originalText; }, 1500);
  };
  btn.addEventListener('click', async () => {
    const text = getToolText(btn.getAttribute('data-copy'));
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flash('Copied!');
    } catch (e) {
      flash(fallbackCopy(text) ? 'Copied!' : 'Copy failed');
    }
  });
});

// ============================================
// START BUTTON + RESUME
// ============================================
const startBtn = document.getElementById('start-btn');
const savedPosition = store.get(STORAGE_KEYS.lastReadPosition);
const resumeTarget = savedPosition && savedPosition !== 'section-1' ? document.getElementById(savedPosition) : null;

if (resumeTarget && !location.hash) startBtn.textContent = 'Continue where you left off';

startBtn.addEventListener('click', () => {
  const target = (resumeTarget && !location.hash) ? resumeTarget : document.getElementById('section-1');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ============================================
// SMOOTH ANCHOR SCROLLING (runs after TOC is built)
// ============================================
document.addEventListener('click', e => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const target = document.getElementById(anchor.getAttribute('href').slice(1));
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', '#' + target.id);
  }
});

// ============================================
// ONE-PAGE BRIEF (built from the sections, so it is always in sync)
// ============================================
function buildBrief() {
  const lines = ['THE QUIET TARGET — ONE-PAGE BRIEF', ''];
  document.querySelectorAll('#reader-column .section').forEach((sec, i) => {
    const title = sec.querySelector('h2').textContent;
    const action = sec.querySelector('.action');
    let practice = '';
    if (action) {
      const clone = action.cloneNode(true);
      clone.querySelectorAll('.done-btn').forEach(b => b.remove());
      practice = clone.textContent.replace(/^\s*Practice\.?\s*/, '').trim();
    }
    lines.push((i + 1) + '. ' + title + (practice ? '\n   → ' + practice : ''));
  });
  lines.push('', 'Serenity Prayer: God, grant me the serenity to accept the things I cannot change, courage to change the things I can, and wisdom to know the difference.');
  return lines.join('\n');
}

// ============================================
// BREATHING EXERCISE
// ============================================
const breatheBtn = document.querySelector('.breathe-btn');
const breatheOverlay = document.getElementById('breathe-overlay');
const breatheClose = document.querySelector('.breathe-close');
const breathLabel = document.getElementById('breath-label');
let breathTimer;

function runBreath(inhale) {
  breathLabel.textContent = inhale ? 'Breathe in' : 'Breathe out';
  breathTimer = setTimeout(() => runBreath(!inhale), inhale ? 4000 : 6000);
}

function openBreathe() {
  breatheOverlay.hidden = false;
  breatheBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  clearTimeout(breathTimer);
  runBreath(true);
  breatheClose.focus();
}

function closeBreathe() {
  clearTimeout(breathTimer);
  breatheOverlay.hidden = true;
  breatheBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  breatheBtn.focus();
}

breatheBtn.addEventListener('click', openBreathe);
breatheClose.addEventListener('click', closeBreathe);
breatheOverlay.addEventListener('click', e => { if (e.target === breatheOverlay) closeBreathe(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !breatheOverlay.hidden) closeBreathe(); });

// ============================================
// GENTLE REVEAL ON SCROLL
// ============================================
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.part').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
}

// ============================================
// TOOL CARDS: preview, download, print
// ============================================
function getToolText(key) {
  return key === 'brief' ? buildBrief() : copyContent[key];
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printText(title, text) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>body{font:13pt/1.5 Georgia,serif;margin:2cm;color:#111}pre{font:inherit;white-space:pre-wrap}</style></head><body><pre>' + safe + '</pre></body></html>');
  doc.close();
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1500);
  };
}

document.querySelectorAll('.tool-card').forEach(card => {
  const key = card.dataset.tool;
  const title = card.querySelector('h3').textContent;
  const ext = key === 'log' ? 'tsv' : 'txt';
  const preview = card.querySelector('.tool-preview');
  preview.addEventListener('toggle', () => {
    if (preview.open) preview.querySelector('pre').textContent = getToolText(key);
  });
  card.querySelector('.dl-btn').addEventListener('click', () => {
    downloadText('quiet-target-' + key + '.' + ext, getToolText(key), ext === 'tsv' ? 'text/tab-separated-values' : 'text/plain');
  });
  card.querySelector('.print-tool-btn').addEventListener('click', () => {
    printText('The Quiet Target — ' + title, getToolText(key));
  });
});

// ============================================
// GUIDE FEATURES: part overviews, reading time, practice tracking
// ============================================
const PART_BLURBS = {
  'part-1': 'Start here. One idea sits underneath everything else.',
  'part-2': 'Ancient training for a steady mind: judgement, endurance, courage, and how to meet hostility.',
  'part-3': 'Modern tools for fear, rumination and sleep. Practical, and done on paper.',
  'part-zen': 'Come back to now. Thoughts are weather, and you are the sky.',
  'part-4': 'Offer it up, order your day, and pray. The Church’s old, free toolkit.',
  'part-good': 'Philosophy is for living. Music, food, walks and work worth doing.',
  'part-5': 'People, work, time, and knowing when to ask for help.'
};

(function buildPartOverviews() {
  const parts = Array.from(document.querySelectorAll('#reader-column .part'));
  parts.forEach(part => {
    const blurb = PART_BLURBS[part.id];
    const links = [];
    let n = part.nextElementSibling;
    while (n && !n.classList.contains('part') && !n.classList.contains('tool-cards')) {
      if (n.classList.contains('section')) {
        const entry = items.find(i => i.id === n.id);
        if (entry) links.push('<a href="#' + n.id + '">' + entry.title.replace(/^\d+\.\s*/, '') + '</a>');
      }
      n = n.nextElementSibling;
    }
    if (blurb) {
      const p = document.createElement('p');
      p.className = 'part-blurb';
      p.textContent = blurb;
      part.appendChild(p);
    }
    if (links.length) {
      const div = document.createElement('div');
      div.className = 'part-contents';
      div.innerHTML = links.join('');
      part.appendChild(div);
    }
  });
})();

// Reading time
document.querySelectorAll('#reader-column .section').forEach(sec => {
  const words = sec.textContent.trim().split(/\s+/).length;
  sec.querySelector('h2').dataset.time = Math.max(1, Math.round(words / 200)) + ' min read';
});

// Practice tracking (kept only in this browser; no streaks, no pressure)
const PRACTICE_KEY = 'quiet-target-practised';
let practised = [];
try { practised = JSON.parse(store.get(PRACTICE_KEY) || '[]'); } catch (e) { practised = []; }
const practiceSections = Array.from(document.querySelectorAll('#reader-column .section')).filter(sec => sec.querySelector('.action'));

function updatePractice() { /* progress display removed; checkmarks are saved per section */ }

practiceSections.forEach(sec => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'done-btn';
  const sync = () => {
    const done = practised.includes(sec.id);
    btn.setAttribute('aria-pressed', done ? 'true' : 'false');
    btn.textContent = done ? '✓ Tried it' : 'Mark as tried';
    btn.classList.toggle('done', done);
  };
  btn.addEventListener('click', () => {
    practised = practised.includes(sec.id) ? practised.filter(id => id !== sec.id) : practised.concat(sec.id);
    store.set(PRACTICE_KEY, JSON.stringify(practised));
    sync();
    updatePractice();
  });
  sync();
  sec.querySelector('.action').appendChild(btn);
});

updatePractice();

// Quick-help buttons
document.getElementById('path-relief').addEventListener('click', openBreathe);
document.querySelector('.inline-breathe').addEventListener('click', openBreathe);
