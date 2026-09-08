/* ═══════════════════════════════════════════════
   SCRIPT.JS — A Little Universe, just for you.
   ═══════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ────────────────────────────────────────────────
   LOADING SCREEN
   ────────────────────────────────────────────── */
function initLoadingStars() {
  const canvas = $('loading-stars');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: rand(0.4, 1.8),
    alpha: 0,
    targetAlpha: rand(0.3, 0.9),
    speed: rand(0.003, 0.012),
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.alpha = Math.min(s.alpha + s.speed, s.targetAlpha);
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 215, 255, ${s.alpha})`;
      ctx.fill();
    });
    frame = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(frame);
}

function hideLoading() {
  const loader = $('loading-screen');
  loader.classList.add('fade-out');
  loader.addEventListener('transitionend', () => {
    loader.remove();
  }, { once: true });
}

/* ────────────────────────────────────────────────
   AUDIO MANAGEMENT
   ────────────────────────────────────────────── */
const AudioManager = {
  audio: null,
  wasPlaying: false,
  init() {
    this.audio = $('bg-music');
    this.audio.volume = 0.22;
  },
  tryAutoplay() {
    const promise = this.audio.play();
    if (promise !== undefined) {
      promise.then(() => {
        this.showControl();
        this.syncAll();
      }).catch(() => {
        // Autoplay blocked — show overlay
        const overlay = $('music-overlay');
        if (overlay) overlay.classList.remove('hidden');
      });
    }
  },
  play() {
    this.audio.play().then(() => {
      this.showControl();
      this.syncAll();
    }).catch(() => {});
  },
  pause() { this.audio.pause(); this.syncAll(); },
  toggle() { this.audio.paused ? this.play() : this.pause(); },
  showControl() {
    const ctrl = $('music-control');
    if (ctrl) ctrl.classList.remove('hidden');
  },
  mute() {
    this.audio.muted = !this.audio.muted;
    this.syncAll();
  },
  setVolume(v) { this.audio.volume = v; },
  syncAll() {
    const isPlaying = !this.audio.paused;
    // Global music control
    $('icon-play').classList.toggle('hidden', isPlaying);
    $('icon-pause').classList.toggle('hidden', !isPlaying);
    $('icon-vol').classList.toggle('hidden', this.audio.muted);
    $('icon-mute').classList.toggle('hidden', !this.audio.muted);
    // Music bars
    const bars = $('music-bars');
    if (bars) bars.classList.toggle('paused', !isPlaying || this.audio.muted);
    // Section player
    const pPlay = $('player-icon-play');
    const pPause = $('player-icon-pause');
    if (pPlay) pPlay.classList.toggle('hidden', isPlaying);
    if (pPause) pPause.classList.toggle('hidden', !isPlaying);
    const vinyl = $('player-vinyl');
    if (vinyl) vinyl.classList.toggle('spinning', isPlaying);
  },
  // For video interaction
  pauseForVideo() {
    this.wasPlaying = !this.audio.paused;
    if (this.wasPlaying) this.pause();
  },
  resumeAfterVideo() {
    if (this.wasPlaying) this.play();
  },
};

function initMusicControls() {
  AudioManager.init();

  // Music overlay buttons
  const playBtn = $('play-music-btn');
  const skipBtn = $('skip-music-btn');
  const overlay = $('music-overlay');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      AudioManager.play();
    });
  }
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      AudioManager.showControl();
    });
  }

  // Global music control buttons
  $('music-toggle')?.addEventListener('click', () => AudioManager.toggle());
  $('music-mute')?.addEventListener('click', () => AudioManager.mute());
  $('music-volume')?.addEventListener('input', e => AudioManager.setVolume(+e.target.value));

  // Progress bar — global
  const progress = $('music-progress');
  AudioManager.audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = AudioManager.audio;
    if (!isNaN(duration) && duration > 0) {
      const pct = (currentTime / duration) * 100;
      if (progress) progress.value = pct;
      const pp = $('player-progress');
      if (pp) pp.value = pct;
    }
  });

  progress?.addEventListener('input', e => {
    const { duration } = AudioManager.audio;
    if (!isNaN(duration)) AudioManager.audio.currentTime = (e.target.value / 100) * duration;
  });

  // Section player
  $('player-toggle')?.addEventListener('click', () => AudioManager.toggle());

  $('player-progress')?.addEventListener('input', e => {
    const { duration } = AudioManager.audio;
    if (!isNaN(duration)) AudioManager.audio.currentTime = (e.target.value / 100) * duration;
  });

  AudioManager.audio.addEventListener('play',  () => AudioManager.syncAll());
  AudioManager.audio.addEventListener('pause', () => AudioManager.syncAll());
}

/* ────────────────────────────────────────────────
   HERO STAR CANVAS
   ────────────────────────────────────────────── */
function initHeroCanvas() {
  const canvas = $('star-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  const MAX_STARS = prefersReducedMotion ? 100 : 250;
  let stars = [];
  let mouse = { x: 0.5, y: 0.5 };

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    createStars();
  }

  function createStars() {
    stars = Array.from({ length: MAX_STARS }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.3, 2),
      alpha: rand(0.2, 1),
      twinkle: rand(0.001, 0.006),
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
      pxBase: 0, pyBase: 0,
      parallax: rand(0.02, 0.08),
    }));
    stars.forEach(s => { s.pxBase = s.x; s.pyBase = s.y; });
  }

  function drawNebula() {
    // Subtle nebula clouds
    const gradient1 = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, W * 0.35);
    gradient1.addColorStop(0, 'rgba(30, 40, 96, 0.12)');
    gradient1.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient1;
    ctx.fillRect(0, 0, W, H);

    const gradient2 = ctx.createRadialGradient(W * 0.75, H * 0.6, 0, W * 0.75, H * 0.6, W * 0.3);
    gradient2.addColorStop(0, 'rgba(60, 30, 90, 0.1)');
    gradient2.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient2;
    ctx.fillRect(0, 0, W, H);
  }

  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#030714';
    ctx.fillRect(0, 0, W, H);

    drawNebula();

    // Stars with parallax
    const dx = (mouse.x - 0.5) * 40;
    const dy = (mouse.y - 0.5) * 40;

    stars.forEach(s => {
      s.alpha += s.twinkle * s.twinkleDir;
      if (s.alpha >= 1) { s.alpha = 1; s.twinkleDir = -1; }
      if (s.alpha <= 0.1) { s.alpha = 0.1; s.twinkleDir = 1; }

      const px = s.pxBase - dx * s.parallax;
      const py = s.pyBase - dy * s.parallax;

      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 215, 255, ${s.alpha})`;
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  resize();
  draw();

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  });
}

/* ────────────────────────────────────────────────
   EASTER EGG — MOON CLICKS
   ────────────────────────────────────────────── */
function initEasterEgg() {
  const moon = $('moon');
  const egg  = $('easter-egg');
  const close = $('easter-close');
  let clicks = 0;
  let timer;

  function triggerEgg() {
    document.body.classList.add('easter-active');
    egg.classList.remove('hidden');
    // Spawn extra mini stars in modal
    spawnEasterStars();
  }

  moon?.addEventListener('click', () => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => { clicks = 0; }, 3000);

    // Visual feedback on each click
    moon.style.transform = 'scale(1.15)';
    setTimeout(() => { moon.style.transform = ''; }, 200);

    if (clicks >= 7) {
      clicks = 0;
      triggerEgg();
    }
  });

  moon?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') moon.click();
  });

  close?.addEventListener('click', () => {
    egg.classList.add('hidden');
    document.body.classList.remove('easter-active');
  });

  // Close on outside click
  egg?.addEventListener('click', e => {
    if (e.target === egg) close?.click();
  });
}

function spawnEasterStars() {
  const wrap = qs('.easter-egg-stars');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('div');
    s.style.cssText = `
      position:absolute;
      width:${rand(2,5)}px;height:${rand(2,5)}px;
      border-radius:50%;
      background:rgba(240,208,128,${rand(0.4,0.9)});
      top:${rand(0,100)}%;left:${rand(0,100)}%;
      box-shadow:0 0 6px rgba(240,208,128,0.7);
      animation:dotPulse ${rand(1,2.5)}s ease-in-out infinite;
      animation-delay:${rand(0,1)}s;
    `;
    wrap.appendChild(s);
  }
}

/* ────────────────────────────────────────────────
   SCROLL TO SECTION (ENTER BUTTON)
   ────────────────────────────────────────────── */
function initEnterButton() {
  $('enter-btn')?.addEventListener('click', () => {
    $('doing-a-lot')?.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ────────────────────────────────────────────────
   SCROLL REVEAL (IntersectionObserver)
   ────────────────────────────────────────────── */
function initScrollReveal() {
  const items = qsa('.scroll-reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        // Stagger delay based on sibling index
        const siblings = Array.from(entry.target.parentElement.querySelectorAll('.scroll-reveal'));
        const i = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${i * 0.08}s`;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => observer.observe(el));
}

/* ────────────────────────────────────────────────
   CONSTELLATION
   ────────────────────────────────────────────── */
const STAR_DATA = [
  { pct: [15, 20], label: '✦', message: 'You are doing enough.' },
  { pct: [75, 15], label: '✦', message: 'Rest is not something you have to earn.' },
  { pct: [40, 50], label: '✦', message: "It's okay to slow down." },
  { pct: [85, 60], label: '✦', message: "You don't have to carry everything at once." },
  { pct: [25, 75], label: '✦', message: "Bad days don't make you weak." },
  { pct: [62, 82], label: '✦', message: 'Someone is quietly rooting for you.' },
];

// Connections between star indices
const CONNECTIONS = [
  [0, 2], [2, 4], [2, 3], [1, 3], [3, 5], [4, 5], [0, 1]
];

function initConstellation() {
  const wrap    = qs('.constellation-wrap');
  const canvas  = $('constellation-canvas');
  const starsEl = $('constellation-stars');
  const msgBox  = $('star-message');
  const msgText = $('star-message-text');
  const msgClose = $('star-message-close');

  if (!wrap || !canvas || !starsEl) return;

  const ctx = canvas.getContext('2d');
  let activeIdx = -1;
  let starEls = [];
  let starPositions = [];

  function resize() {
    canvas.width  = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;
    renderLines();
  }

  function createStarEls() {
    starsEl.innerHTML = '';
    starEls = [];
    STAR_DATA.forEach((data, i) => {
      const el = document.createElement('div');
      el.className = 'c-star';
      el.style.left = data.pct[0] + '%';
      el.style.top  = data.pct[1] + '%';
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Star ' + (i + 1) + ' - click to read reminder');

      const dot = document.createElement('div');
      dot.className = 'c-star-dot';

      const label = document.createElement('span');
      label.className = 'c-star-label';
      label.textContent = 'click me';

      el.appendChild(dot);
      el.appendChild(label);
      starsEl.appendChild(el);
      starEls.push(el);

      el.addEventListener('click', () => showMessage(i, el));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') showMessage(i, el);
      });
    });
  }

  function getStarPos(i) {
    const data = STAR_DATA[i];
    const rect = wrap.getBoundingClientRect();
    return {
      x: (data.pct[0] / 100) * canvas.width,
      y: (data.pct[1] / 100) * canvas.height,
    };
  }

  function renderLines() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeIdx === -1) return;

    CONNECTIONS.forEach(([a, b]) => {
      const posA = getStarPos(a);
      const posB = getStarPos(b);

      const grad = ctx.createLinearGradient(posA.x, posA.y, posB.x, posB.y);
      grad.addColorStop(0, 'rgba(143, 168, 232, 0.5)');
      grad.addColorStop(1, 'rgba(176, 168, 224, 0.3)');

      ctx.beginPath();
      ctx.moveTo(posA.x, posA.y);
      ctx.lineTo(posB.x, posB.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
    });
  }

  function showMessage(idx, el) {
    activeIdx = idx;
    starEls.forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    msgText.textContent = STAR_DATA[idx].message;
    msgBox.classList.remove('hidden');
    // Trigger re-animation
    msgBox.style.animation = 'none';
    msgBox.offsetHeight; // reflow
    msgBox.style.animation = '';
    renderLines();
  }

  msgClose?.addEventListener('click', () => {
    msgBox.classList.add('hidden');
    activeIdx = -1;
    starEls.forEach(s => s.classList.remove('active'));
    renderLines();
  });

  createStarEls();
  resize();
  window.addEventListener('resize', resize);
}

/* ────────────────────────────────────────────────
   GALLERY LIGHTBOX
   ────────────────────────────────────────────── */
const PHOTO_DATA = [
  { src: "assets/photos/WhatsApp%20Image%202026-09-08%20at%2023.40.16%20(1).jpeg", alt: "Just you being you",                          caption: "Just you being you." },
  { src: "assets/photos/WhatsApp%20Image%202026-09-08%20at%2023.40.16%20(2).jpeg", alt: "One of those little moments",                  caption: "One of those little moments worth remembering." },
  { src: "assets/photos/WhatsApp%20Image%202026-09-08%20at%2023.40.16.jpeg",       alt: "Even ordinary days look a little brighter",    caption: "Even ordinary days look a little brighter." },
  { src: "assets/photos/WhatsApp%20Image%202026-09-08%20at%2023.40.17%20(1).jpeg", alt: "A reminder that you've come this far",          caption: "A reminder that you've come this far." },
  { src: "assets/photos/WhatsApp%20Image%202026-09-08%20at%2023.40.17.jpeg",       alt: "Keep this version of you",                     caption: "Keep this version of you." },
  { src: "assets/photos/WhatsApp%20Image%202026-09-08%20at%2023.40.19.jpeg",       alt: "Still shining, even on tired days",             caption: "Still shining, even on tired days." },
];

function initGallery() {
  const items   = qsa('.polaroid-item');
  const lb      = $('lightbox');
  const lbImg   = $('lightbox-img');
  const lbCap   = $('lightbox-caption');
  const lbClose = $('lightbox-close');
  const lbPrev  = $('lightbox-prev');
  const lbNext  = $('lightbox-next');
  const lbOvl   = $('lightbox-overlay');

  let current = 0;

  function open(idx) {
    current = idx;
    const data = PHOTO_DATA[current];
    lbImg.src = data.src;
    lbImg.alt = data.alt;
    lbCap.textContent = data.caption;
    lb.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function close() {
    lb.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function prev() {
    current = (current - 1 + PHOTO_DATA.length) % PHOTO_DATA.length;
    const data = PHOTO_DATA[current];
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src = data.src;
      lbImg.alt = data.alt;
      lbCap.textContent = data.caption;
      lbImg.style.opacity = '1';
    }, 200);
  }

  function next() {
    current = (current + 1) % PHOTO_DATA.length;
    const data = PHOTO_DATA[current];
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src = data.src;
      lbImg.alt = data.alt;
      lbCap.textContent = data.caption;
      lbImg.style.opacity = '1';
    }, 200);
  }

  lbImg.style.transition = 'opacity 0.2s';

  items.forEach((item) => {
    item.addEventListener('click', () => open(+item.dataset.index));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') open(+item.dataset.index);
    });
  });

  lbClose?.addEventListener('click', close);
  lbOvl?.addEventListener('click',  close);
  lbPrev?.addEventListener('click',  prev);
  lbNext?.addEventListener('click',  next);

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape')      close();
    if (e.key === 'ArrowLeft')   prev();
    if (e.key === 'ArrowRight')  next();
  });

  // Touch/swipe support
  let touchStartX = 0;
  lb?.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  lb?.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  });
}

/* ────────────────────────────────────────────────
   VIDEO — AUDIO MANAGEMENT
   ────────────────────────────────────────────── */
function initVideos() {
  const v1 = $('video-1');
  const v2 = $('video-2');

  function onPlay() {
    AudioManager.pauseForVideo();
    // Pause the other video
    const other = this === v1 ? v2 : v1;
    if (other && !other.paused) other.pause();
  }

  function onStop() {
    // Only resume if neither video is playing
    if (v1.paused && v2.paused) {
      AudioManager.resumeAfterVideo();
    }
  }

  [v1, v2].forEach(v => {
    if (!v) return;
    v.addEventListener('play',  onPlay);
    v.addEventListener('pause', onStop);
    v.addEventListener('ended', onStop);
  });
}

/* ────────────────────────────────────────────────
   MOOD SELECTOR
   ────────────────────────────────────────────── */
const MOOD_DATA = {
  tired: [
    "Then maybe you don't need to push a little harder.",
    "Maybe you just need to stop for a moment.",
    "Drink some water.",
    "Take a breath.",
    "Tomorrow can wait.",
  ],
  overwhelmed: [
    "You don't have to solve everything tonight.",
    "One thing at a time.",
    "If all you can do today is breathe and get some rest, that's enough.",
  ],
  sad: [
    "It's okay if today wasn't your day.",
    "You don't have to pretend that you're okay.",
    "Let yourself feel it.",
    "Tomorrow doesn't have to look like today.",
  ],
  quiet: [
    "Then stay here for a while.",
    "No expectations.",
    "No deadlines.",
    "Just you and the night sky.",
  ],
  okay: [
    "Good.",
    "Keep that little bit of happiness close.",
    "You deserve more days like this.",
  ],
};

const RANDOM_REMINDERS = [
  "Even the moon has phases. You're allowed to change.",
  "You've survived 100% of your hard days so far.",
  "Somewhere, the stars are patiently waiting for you to look up.",
  "Small steps are still steps forward.",
  "You matter more than you know.",
  "Being tired is not being weak.",
  "It's okay to not be okay.",
  "You are allowed to take up space.",
  "Your presence in this world is already enough.",
  "The night always passes. Morning always comes.",
  "You don't have to figure everything out tonight.",
  "Someone thinks about you and smiles.",
  "Rest is productive. Breathing is an achievement.",
  "Slowly is still forward.",
  "You are doing better than you think.",
];

function initMood() {
  const btns    = qsa('.planet-btn');
  const response = $('mood-response');
  const moodText = $('mood-text');
  const randBtn  = $('random-reminder-btn');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      const lines = MOOD_DATA[mood] || [];

      btns.forEach(b => b.style.opacity = '0.4');
      btn.style.opacity = '1';

      moodText.innerHTML = lines.map(l => `<p>${l}</p>`).join('');
      response.classList.remove('hidden');
      response.style.animation = 'none';
      response.offsetHeight;
      response.style.animation = 'fadeInUp 0.6s ease forwards';

      setTimeout(() => {
        response.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    });
  });

  randBtn?.addEventListener('click', () => {
    const msg = RANDOM_REMINDERS[randInt(0, RANDOM_REMINDERS.length - 1)];
    moodText.innerHTML = `<p>${msg}</p>`;
    moodText.style.animation = 'none';
    moodText.offsetHeight;
    moodText.style.animation = 'fadeInUp 0.4s ease forwards';
  });
}

/* ────────────────────────────────────────────────
   BREATHING EXERCISE
   ────────────────────────────────────────────── */
function initBreathing() {
  const container = qs('.breath-container');
  const label     = $('breath-label');
  const startBtn  = $('breath-start');
  const pauseBtn  = $('breath-pause');

  if (!container) return;

  // Timing in ms
  const IN_TIME   = 4000;
  const HOLD_TIME = 2000;
  const OUT_TIME  = 6000;
  const TOTAL     = IN_TIME + HOLD_TIME + OUT_TIME;

  let running = false;
  let startTime = null;
  let raf;
  let pausedAt = null;
  let offset = 0;

  function getPhase(elapsed) {
    const t = elapsed % TOTAL;
    if (t < IN_TIME)                      return { phase: 'in',   pct: t / IN_TIME };
    if (t < IN_TIME + HOLD_TIME)          return { phase: 'hold', pct: 1 };
    return { phase: 'out', pct: 1 - (t - IN_TIME - HOLD_TIME) / OUT_TIME };
  }

  function tick(ts) {
    if (!running) return;
    if (!startTime) startTime = ts - offset;
    const elapsed = ts - startTime;
    const { phase, pct } = getPhase(elapsed);

    container.className = 'breath-container';
    if (phase === 'in') {
      container.classList.add('breathing-in');
      label.textContent = 'breathe in';
      container.querySelector('.breath-orb').style.transition = `transform ${IN_TIME}ms ease-in-out, box-shadow ${IN_TIME}ms ease-in-out`;
    } else if (phase === 'hold') {
      container.classList.add('breathing-hold');
      label.textContent = 'hold';
      container.querySelector('.breath-orb').style.transition = `transform ${HOLD_TIME}ms ease, box-shadow ${HOLD_TIME}ms ease`;
    } else {
      label.textContent = 'breathe out';
      container.querySelector('.breath-orb').style.transition = `transform ${OUT_TIME}ms ease-in-out, box-shadow ${OUT_TIME}ms ease-in-out`;
    }

    raf = requestAnimationFrame(tick);
  }

  startBtn?.addEventListener('click', () => {
    running = true;
    startTime = null;
    offset = 0;
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    raf = requestAnimationFrame(tick);
  });

  pauseBtn?.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(raf);
    offset = performance.now() - (startTime || 0);
    startTime = null;
    pauseBtn.classList.add('hidden');
    startBtn.classList.remove('hidden');
    startBtn.textContent = 'Resume breathing';
    container.className = 'breath-container';
    label.textContent = 'breathe in';
  });
}

/* ────────────────────────────────────────────────
   STAR GAZING CANVAS
   ────────────────────────────────────────────── */
function initStargazing() {
  const canvas = $('stargazing-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const COUNT = isMobile ? 80 : 160;
  let W, H;
  let mouse = { x: -999, y: -999 };
  let stars = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    if (!stars.length) createStars();
  }

  function createStars() {
    stars = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.5, 2.5),
      baseAlpha: rand(0.2, 0.8),
      alpha: rand(0.2, 0.8),
      twinkle: rand(0.002, 0.008),
      twinkleDir: 1,
    }));
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#030714';
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      s.alpha += s.twinkle * s.twinkleDir;
      if (s.alpha >= s.baseAlpha + 0.3) s.twinkleDir = -1;
      if (s.alpha <= s.baseAlpha - 0.1) s.twinkleDir = 1;

      const d = dist(s, mouse);
      const glowRadius = 80;
      const glow = d < glowRadius ? (1 - d / glowRadius) * 0.8 : 0;
      const alpha = Math.min(1, s.alpha + glow);
      const radius = s.r + glow * 2;

      if (glow > 0) {
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius * 4);
        grad.addColorStop(0, `rgba(200, 215, 255, ${alpha})`);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 215, 255, ${alpha})`;
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });

  // Touch support
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const t = e.changedTouches[0];
    mouse.x = t.clientX - rect.left;
    mouse.y = t.clientY - rect.top;
  }, { passive: false });

  canvas.addEventListener('touchend', () => { mouse.x = -999; mouse.y = -999; });

  // Visibility: pause when not visible
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      if (!raf) raf = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(raf);
      raf = null;
    }
  });
  obs.observe(canvas);
}

/* ────────────────────────────────────────────────
   LETTER STARS CANVAS
   ────────────────────────────────────────────── */
function initLetterStars() {
  const canvas = $('letter-stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const stars = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    if (!stars.length) createStars();
  }

  function createStars() {
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(0.3, 1.5),
        alpha: rand(0.1, 0.7),
        twinkle: rand(0.002, 0.007),
        twinkleDir: 1,
      });
    }
  }

  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.alpha += s.twinkle * s.twinkleDir;
      if (s.alpha >= 0.7) s.twinkleDir = -1;
      if (s.alpha <= 0.1) s.twinkleDir = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 215, 255, ${s.alpha})`;
      ctx.fill();
    });
    raf = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      if (!raf) raf = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(raf);
      raf = null;
    }
  });
  obs.observe(canvas);
}

/* ────────────────────────────────────────────────
   FOOTER STARS (simple)
   ────────────────────────────────────────────── */
function initFooterStars() {
  const wrap = qs('.footer-stars');
  if (!wrap) return;
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('div');
    const size = rand(1, 3);
    s.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:rgba(200,215,255,${rand(0.2,0.7)});
      top:${rand(0,100)}%;left:${rand(0,100)}%;
      animation:dotPulse ${rand(2,4)}s ease-in-out infinite;
      animation-delay:${rand(0,2)}s;
    `;
    wrap.appendChild(s);
  }
}

/* ────────────────────────────────────────────────
   MAIN INIT
   ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const stopLoadingStars = initLoadingStars();

  // Hide loading after minimum delay
  const minDelay = 2000;
  const onReady = () => {
    setTimeout(() => {
      if (stopLoadingStars) stopLoadingStars();
      hideLoading();
      // Try autoplay after loading
      setTimeout(() => AudioManager.tryAutoplay(), 300);
    }, minDelay);
  };

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady);
    // Fallback: hide after 4s no matter what
    setTimeout(() => {
      if (!$('loading-screen')?.classList.contains('fade-out')) {
        hideLoading();
        setTimeout(() => AudioManager.tryAutoplay(), 300);
      }
    }, 4000);
  }

  // Initialize music controls immediately (before loading hides)
  initMusicControls();

  // Initialize other features after content ready
  initHeroCanvas();
  initEasterEgg();
  initEnterButton();
  initScrollReveal();
  initConstellation();
  initGallery();
  initVideos();
  initMood();
  initBreathing();
  initStargazing();
  initLetterStars();
  initFooterStars();
});
