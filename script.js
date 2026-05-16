// ============================================
// INTERACTIVE CUBE
// ============================================

(function () {
  const cube = document.querySelector('.wireframe-cube');
  if (!cube) return;

  let rotX = 15, rotY = 0;
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let velX = 0, velY = 0;
  const AUTO_SPEED = 0.27; // matches the original 22s CSS animation at 60fps

  cube.style.animation = 'none';

  function tick() {
    if (!isDragging) {
      velX *= 0.92;
      velY *= 0.92;
      rotX += velX;
      rotY += velY + AUTO_SPEED;
    }
    cube.style.transform = `translateY(-50%) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    requestAnimationFrame(tick);
  }

  function dragStart(x, y) {
    isDragging = true;
    lastX = x; lastY = y;
    velX = 0; velY = 0;
    cube.classList.add('dragging');
  }

  function dragMove(x, y) {
    if (!isDragging) return;
    velY = (x - lastX) * 0.5;
    velX = -(y - lastY) * 0.5;
    rotY += velY;
    rotX += velX;
    lastX = x; lastY = y;
  }

  function dragEnd() {
    isDragging = false;
    cube.classList.remove('dragging');
  }

  cube.addEventListener('mousedown',  (e) => { dragStart(e.clientX, e.clientY); e.preventDefault(); });
  window.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
  window.addEventListener('mouseup',   dragEnd);

  cube.addEventListener('touchstart', (e) => { dragStart(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', (e) => { if (isDragging) { dragMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
  window.addEventListener('touchend',  dragEnd);

  tick();
})();

// ============================================
// PARTICLE CANVAS — hero background
// ============================================

const particleCanvas = document.getElementById('particle-canvas');
const pCtx = particleCanvas.getContext('2d');
let particles = [];

function resizeParticleCanvas() {
  particleCanvas.width  = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];
  const count = Math.floor((particleCanvas.width * particleCanvas.height) / 14000);
  for (let i = 0; i < count; i++) {
    particles.push({
      x:       Math.random() * particleCanvas.width,
      y:       Math.random() * particleCanvas.height,
      size:    Math.random() * 1.4 + 0.3,
      speedX:  (Math.random() - 0.5) * 0.28,
      speedY:  (Math.random() - 0.5) * 0.28,
      opacity: Math.random() * 0.45 + 0.08,
    });
  }
}

function animateParticles() {
  pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0) p.x = particleCanvas.width;
    if (p.x > particleCanvas.width)  p.x = 0;
    if (p.y < 0) p.y = particleCanvas.height;
    if (p.y > particleCanvas.height) p.y = 0;

    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    pCtx.fillStyle = `rgba(0,0,0,${p.opacity})`;
    pCtx.fill();
  }

  requestAnimationFrame(animateParticles);
}

resizeParticleCanvas();
createParticles();
animateParticles();
window.addEventListener('resize', () => { resizeParticleCanvas(); createParticles(); });

// ============================================
// PIXEL BLOCK TRANSITION — scroll driven
// Concept from olivierlarose/pixel-transition-effect
// ============================================

const navbar = document.getElementById('navbar');
const gridEl = document.getElementById('pixel-grid');
const tZone  = document.getElementById('transition-zone');

const COLS = 20;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let blocks    = [];
let maxRawIn  = 0;
let maxRawOut = 0;

function buildGrid() {
  gridEl.innerHTML = '';
  blocks    = [];
  maxRawIn  = 0;
  maxRawOut = 0;

  const blockPx = window.innerWidth / COLS;
  const rows    = Math.ceil(window.innerHeight / blockPx);

  for (let col = 0; col < COLS; col++) {
    const colEl = document.createElement('div');
    colEl.className = 'px-col';

    const shuffled = shuffle(Array.from({ length: rows }, (_, i) => i));

    for (let row = 0; row < rows; row++) {
      const block = document.createElement('div');
      block.className = 'px-block';

      const ri     = shuffled[row];
      const rawIn  = col + ri;               // left → right stagger
      const rawOut = (COLS - col) + ri;      // right → left stagger

      block._rawIn  = rawIn;
      block._rawOut = rawOut;

      if (rawIn  > maxRawIn)  maxRawIn  = rawIn;
      if (rawOut > maxRawOut) maxRawOut = rawOut;

      colEl.appendChild(block);
      blocks.push(block);
    }

    gridEl.appendChild(colEl);
  }
}

function updateBlocks(scrollP) {
  if (scrollP <= 0) {
    // Above transition zone — all blocks off, grid in front
    blocks.forEach(b => b.classList.remove('on'));
    gridEl.classList.remove('settled');
    navbar.classList.remove('pixel-mode');
    return;
  }

  if (scrollP < 0.5) {
    // IN phase (0 → 0.5): blocks fill left-to-right
    const t = (scrollP / 0.5) * maxRawIn;
    blocks.forEach(b => b.classList.toggle('on', b._rawIn <= t));
    gridEl.classList.remove('settled');
    navbar.classList.remove('pixel-mode');

  } else {
    // Fully covered and beyond: all blocks stay on, grid drops behind content
    blocks.forEach(b => b.classList.add('on'));
    gridEl.classList.add('settled');
    navbar.classList.add('pixel-mode');
  }
}

buildGrid();
window.addEventListener('resize', () => { buildGrid(); updateBlocks(getScrollP()); });

function getScrollP() {
  return Math.max(0, Math.min(1, (window.scrollY - tZone.offsetTop) / tZone.offsetHeight));
}

// Throttle block updates to once per animation frame
let rafPending = false;

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60 && getScrollP() === 0);

  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      updateBlocks(getScrollP());
      rafPending = false;
    });
  }
}, { passive: true });

// ============================================
// SCROLL REVEAL
// ============================================

const revealTargets = document.querySelectorAll(
  '.model-card, .game-card, .gallery-item, .contact-btn, .section-header, .pixel-section-header'
);
revealTargets.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 70);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

revealTargets.forEach(el => revealObserver.observe(el));

// ============================================
// PEEK CAROUSEL — centered slide with side peeking
// ============================================

document.querySelectorAll('.peek-carousel-wrapper').forEach(wrapper => {
  const track   = wrapper.querySelector('.peek-track');
  const outer   = wrapper.querySelector('.peek-track-outer');
  const slides  = wrapper.querySelectorAll('.peek-slide');
  const dots    = wrapper.querySelectorAll('.carousel-dot');
  const prevBtn = wrapper.querySelector('.peek-prev');
  const nextBtn = wrapper.querySelector('.peek-next');
  let current   = 0;

  function slideWidth()  { return Math.round(outer.offsetWidth * 0.8); }
  function gapWidth()    { return parseFloat(getComputedStyle(track).columnGap) || 24; }

  function setWidths() {
    const w = slideWidth();
    slides.forEach(s => s.style.width = w + 'px');
  }

  function getTranslate(index) {
    const sw   = slideWidth();
    const gap  = gapWidth();
    const peek = (outer.offsetWidth - sw) / 2;
    return peek - index * (sw + gap);
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, slides.length - 1));
    setWidths();
    track.style.transform = `translateX(${getTranslate(current)}px)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  const ro = new ResizeObserver(() => goTo(current));
  ro.observe(outer);
});

// ============================================
// CAROUSEL
// ============================================

document.querySelectorAll('.carousel').forEach(carousel => {
  const track  = carousel.querySelector('.carousel-track');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots   = carousel.querySelectorAll('.carousel-dot');
  const prev   = carousel.querySelector('.carousel-prev');
  const next   = carousel.querySelector('.carousel-next');
  let current  = 0;

  // wrap slides in an inner flex container
  const inner = document.createElement('div');
  inner.className = 'carousel-inner';
  while (track.firstChild) inner.appendChild(track.firstChild);
  track.appendChild(inner);

  function goTo(index) {
    const video = slides[current].querySelector('video');
    if (video) video.pause();
    current = (index + slides.length) % slides.length;
    inner.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  prev.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
});

// ============================================
// EMAIL COPY TO CLIPBOARD
// ============================================

function copyEmail() {
  const email = 'shu_mak@asagi.waseda.jp'; // ← replace with your email
  const btn   = document.getElementById('email-btn');
  navigator.clipboard.writeText(email).then(() => {
    const original = btn.textContent;
    btn.textContent = '[ COPIED! ]';
    setTimeout(() => btn.textContent = original, 2000);
  });
}

// ============================================
// GAME EMBED — click-to-play
// ============================================

function launchBraveFrog() {
  const poster = document.getElementById('bravefrog-poster');
  const frame  = document.getElementById('bravefrog-frame');
  frame.src = frame.dataset.src;
  poster.style.display = 'none';
  frame.style.display  = 'block';
}

// ============================================
// 3D CARD TILT
// ============================================

document.querySelectorAll('.model-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});
