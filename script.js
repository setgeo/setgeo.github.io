// ============ NAV: scroll state + mobile menu ============
const nav = document.getElementById('nav');
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
const navScrim = document.getElementById('navScrim');

function onScroll(){
  if (window.scrollY > 40) nav.classList.add('is-scrolled');
  else nav.classList.remove('is-scrolled');
}
onScroll();
window.addEventListener('scroll', onScroll, {passive:true});

function closeMenu(){
  navLinks.classList.remove('is-open');
  navScrim.classList.remove('is-open');
  burger.classList.remove('is-open');
}
function toggleMenu(){
  navLinks.classList.toggle('is-open');
  navScrim.classList.toggle('is-open');
  burger.classList.toggle('is-open');
}
burger.addEventListener('click', toggleMenu);
navScrim.addEventListener('click', closeMenu);
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', closeMenu);
});

// ============ HUD coordinate readout — stylized, illustrative ============
const readouts = [
  { lat: "19°06.35' N", lon: "96°06.81' W", elev: "4.2 m" },
  { lat: "18°37.92' N", lon: "95°49.63' W", elev: "11.8 m" },
  { lat: "18°49.05' N", lon: "96°06.10' W", elev: "22.6 m" },
  { lat: "19°11.24' N", lon: "96°08.05' W", elev: "3.1 m" },
];
let hudIndex = 0;
const hudLat = document.getElementById('hudLat');
const hudLon = document.getElementById('hudLon');
const hudElev = document.getElementById('hudElev');

function cycleHud(){
  if (!hudLat) return;
  hudIndex = (hudIndex + 1) % readouts.length;
  const r = readouts[hudIndex];
  hudLat.textContent = r.lat;
  hudLon.textContent = r.lon;
  hudElev.textContent = r.elev;
}
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(cycleHud, 3200);
}

// ============ Reveal on scroll ============
const revealEls = document.querySelectorAll('.helpcard, .service__head, .servicelist, .gallery, .extracard, .about__intro, .pillar, .whycard, .contact__wrap');
revealEls.forEach(el => el.classList.add('reveal'));

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => io.observe(el));

// ============ Signature graphic: procedural point-cloud / terrain ============
// Original generative visualization (not derived from any external image),
// styled after LiDAR point-classification colors, echoing the triangulated
// geodesic mark in the SETGEO logo.
function initPointCloud(canvasId, opts) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w, h, dpr;
  let points = [];
  let t = 0;

  const cols = opts.cols || 46;
  const rows = opts.rows || 30;

  function heightAt(x, y, time){
    return (
      Math.sin(x * 0.18 + time * 0.4) * 0.5 +
      Math.cos(y * 0.22 - time * 0.3) * 0.5 +
      Math.sin((x + y) * 0.11 + time * 0.2) * 0.6
    );
  }

  function colorForHeight(v){
    // v roughly in [-1.6, 1.6] -> classification-style gradient
    const stops = [
      [0.30, 0.55, 0.85], // low - steel blue
      [0.25, 0.70, 0.55], // green
      [0.85, 0.75, 0.25], // yellow
      [0.90, 0.50, 0.10], // signal orange
    ];
    let n = (v + 1.6) / 3.2;
    n = Math.min(1, Math.max(0, n));
    const seg = n * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    const f = seg - i;
    const a = stops[i], b = stops[i+1];
    const r = a[0] + (b[0]-a[0])*f;
    const g = a[1] + (b[1]-a[1])*f;
    const bl = a[2] + (b[2]-a[2])*f;
    return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(bl*255)})`;
  }

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    buildPoints();
  }

  function buildPoints(){
    points = [];
    const marginX = w * 0.06;
    const marginY = h * 0.12;
    const spanX = w - marginX*2;
    const spanY = h - marginY*2;
    for (let j = 0; j <= rows; j++){
      for (let i = 0; i <= cols; i++){
        const px = marginX + (i/cols) * spanX;
        const py = marginY + (j/rows) * spanY;
        points.push({ gx: i, gy: j, px, py });
      }
    }
  }

  function draw(){
    ctx.clearRect(0,0,w,h);
    for (const p of points){
      const v = heightAt(p.gx, p.gy, t);
      const size = 1.1 + (v+1.6)/3.2 * 1.6;
      ctx.fillStyle = colorForHeight(v);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(p.px, p.py + v * (opts.amplitude || 6), size, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(){
    t += 0.006;
    draw();
    if (!reduceMotion) requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize, {passive:true});
  resize();
  draw();
  if (!reduceMotion) requestAnimationFrame(loop);
}

initPointCloud('pointCloud', { cols: 52, rows: 26, amplitude: 7 });
initPointCloud('pointCloud2', { cols: 40, rows: 18, amplitude: 5 });

// ============ Lightbox: click a photo to view it larger ============
function initLightbox() {
  const items = Array.from(document.querySelectorAll('.gallery__item'));
  if (!items.length) return;

  const data = items.map(it => {
    const img = it.querySelector('img');
    const cap = it.querySelector('figcaption');
    return { src: img.src, alt: img.alt || '', caption: cap ? cap.textContent : '' };
  });

  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbCaption = document.getElementById('lightboxCaption');
  const btnClose = document.getElementById('lightboxClose');
  const btnPrev = document.getElementById('lightboxPrev');
  const btnNext = document.getElementById('lightboxNext');
  let current = 0;

  function show() {
    const d = data[current];
    lbImg.src = d.src;
    lbImg.alt = d.alt;
    lbCaption.textContent = d.caption;
  }
  function open(i) {
    current = i;
    show();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    btnClose.focus();
  }
  function close() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function prev() { current = (current - 1 + data.length) % data.length; show(); }
  function next() { current = (current + 1) % data.length; show(); }

  items.forEach((it, i) => {
    it.style.cursor = 'zoom-in';
    it.setAttribute('tabindex', '0');
    it.setAttribute('role', 'button');
    it.setAttribute('aria-label', 'Ampliar fotografía');
    it.addEventListener('click', () => open(i));
    it.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
}
initLightbox();
