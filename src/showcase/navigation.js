let disposeNavigation;

export function initializeNavigation() {
  disposeNavigation?.();
  const events = new AbortController();
  const listen = (target, type, handler, options = {}) => target?.addEventListener(type, handler, { ...options, signal: events.signal });
  const validPages = ['home', 'studio', 'animations', 'routines', 'evaluation'];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.getElementById('iris');
  const button = document.getElementById('toggle-iris-motion');
  const intro = document.querySelector('.hero-intro');
  const bottom = document.querySelector('.hero-bottom');
  let g = null;
  try { g = canvas?.getContext('2d') ?? null; } catch { /* Navigation works without canvas support. */ }

  let paused = false;
  let heroVisible = false;
  let pageHidden = false;
  let disposed = false;
  let frame = 0;
  let anchorFrame = 0;
  let previousTime = null;
  let lastPaint = -Infinity;
  let hasPainted = false;
  let animationTime = 0;
  let pointer = { x: 0, y: 0 };
  let eye = { x: 0, y: 0 };
  let hover = 0;
  let targetHover = 0;
  let seed = 7319;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  const fibers = Array.from({ length: 2200 }, () => ({ a: rand() * Math.PI * 2, start: 82 + rand() * 35, end: 170 + rand() * 95, bend: (rand() - .5) * .17, alpha: .06 + rand() * .36, hue: 190 + rand() * 38, width: .2 + rand() * .8 }));

  function updateMotionButton() {
    if (!button) return;
    button.disabled = !g || motion.matches;
    button.textContent = !g ? 'Iris unavailable' : motion.matches ? 'Motion reduced' : paused ? 'Resume iris motion' : 'Pause iris motion';
    button.setAttribute('aria-label', !g ? 'Iris animation unavailable' : motion.matches ? 'Iris motion disabled by your reduced-motion preference' : button.textContent);
    button.setAttribute('aria-controls', 'iris');
  }

  // These are the original iris strokes and colors. Static states retain a
  // painted frame instead of repeatedly drawing the 2,200 fibers.
  function paint() {
    if (!g) return;
    hasPainted = true;
    g.clearRect(0, 0, 900, 900);
    g.save();
    g.translate(450, 450);
    const breath = motion.matches ? 1 : 1 + Math.sin(animationTime * .00055) * .006;
    g.scale(breath, breath);
    const halo = g.createRadialGradient(0, 0, 110, 0, 0, 355);
    halo.addColorStop(0, 'rgba(25,82,121,0)');
    halo.addColorStop(.45, `rgba(48,125,193,${.08 + hover * .12})`);
    halo.addColorStop(.72, `rgba(35,81,134,${.02 + hover * .035})`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.fillRect(-400, -400, 800, 800);
    const base = g.createRadialGradient(0, 0, 75, 0, 0, 235);
    base.addColorStop(0, '#020405');
    base.addColorStop(.12, '#102b3c');
    base.addColorStop(.48, '#174b68');
    base.addColorStop(.7, '#123349');
    base.addColorStop(1, '#02070a');
    g.fillStyle = base;
    g.beginPath();
    g.arc(0, 0, 235, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'screen';
    for (const f of fibers) {
      const a = f.a;
      g.strokeStyle = `hsla(${f.hue},${55 + hover * 15}%,${42 + hover * 13}%,${f.alpha})`;
      g.lineWidth = f.width;
      g.beginPath();
      g.moveTo(Math.cos(a) * f.start + eye.x * .7, Math.sin(a) * f.start + eye.y * .7);
      const mid = (f.start + f.end) * .5;
      g.quadraticCurveTo(Math.cos(a + f.bend) * mid, Math.sin(a + f.bend) * mid, Math.cos(a) * f.end, Math.sin(a) * f.end);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    const pupil = g.createRadialGradient(eye.x, eye.y, 64, eye.x, eye.y, 101);
    pupil.addColorStop(0, '#010203');
    pupil.addColorStop(.8, 'rgba(0,1,2,.99)');
    pupil.addColorStop(1, 'rgba(0,1,2,0)');
    g.fillStyle = pupil;
    g.beginPath();
    g.arc(eye.x, eye.y, 102, 0, Math.PI * 2);
    g.fill();
    const rim = g.createRadialGradient(0, 0, 160, 0, 0, 270);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(.5, 'rgba(0,0,0,.13)');
    rim.addColorStop(.9, 'rgba(0,0,0,.8)');
    rim.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rim;
    g.beginPath();
    g.arc(0, 0, 270, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function shouldAnimate() {
    return !!g && !disposed && !paused && !motion.matches && !document.hidden && !pageHidden && heroVisible;
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = null;
  }
  function tick(time) {
    frame = 0;
    if (!shouldAnimate()) { previousTime = null; return; }
    if (previousTime !== null) animationTime += Math.min(time - previousTime, 100);
    previousTime = time;
    if (time - lastPaint >= 33) {
      lastPaint = time;
      eye.x += (pointer.x * 38 - eye.x) * .1;
      eye.y += (pointer.y * 30 - eye.y) * .1;
      hover += (targetHover - hover) * .05;
      paint();
    }
    frame = requestAnimationFrame(tick);
  }
  function syncAnimation() {
    if (!shouldAnimate()) stop();
    else if (!frame) { lastPaint = -Infinity; frame = requestAnimationFrame(tick); }
  }
  function updateHeroVisibility() {
    const opacity = Math.max(0, .95 - scrollY / 600);
    document.body.style.setProperty('--hero-eye-opacity', opacity);
    // The canvas is fixed; observe the actual hero region and its fade instead
    // of treating the fixed canvas as permanently on screen.
    heroVisible = document.body.dataset.page === 'home' && opacity > 0
      && (!intro || intro.getBoundingClientRect().top < innerHeight)
      && (!bottom || bottom.getBoundingClientRect().bottom > 0);
    syncAnimation();
  }
  function resizeIris() {
    if (g) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const size = Math.round(900 * dpr);
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        paint();
      }
      if (!hasPainted) paint();
    }
    updateHeroVisibility();
  }
  function navigate() {
    if (anchorFrame) cancelAnimationFrame(anchorFrame);
    const name = location.hash.slice(1);
    const page = validPages.includes(name) ? name : 'home';
    document.body.dataset.page = page;
    document.querySelectorAll('.page').forEach(e => e.classList.toggle('active', e.id === 'page-' + page));
    document.querySelectorAll('.nav a').forEach(e => {
      if (e.dataset.page === page) e.setAttribute('aria-current', 'page');
      else e.removeAttribute('aria-current');
    });
    window.dispatchEvent(new CustomEvent('look:page', { detail: { page } }));
    if (['technology', 'main'].includes(name)) {
      anchorFrame = requestAnimationFrame(() => {
        anchorFrame = 0;
        document.getElementById(name)?.scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth' });
        updateHeroVisibility();
      });
    } else window.scrollTo(0, 0);
    updateHeroVisibility();
  }
  function preferenceChanged() {
    if (motion.matches) {
      stop();
      eye = { x: 0, y: 0 };
      hover = 0;
      paint();
    }
    updateMotionButton();
    syncAnimation();
  }

  listen(window, 'hashchange', navigate);
  listen(window, 'scroll', updateHeroVisibility, { passive: true });
  listen(window, 'resize', resizeIris, { passive: true });
  listen(document, 'visibilitychange', syncAnimation);
  listen(window, 'pagehide', () => { pageHidden = true; stop(); });
  listen(window, 'pageshow', () => { pageHidden = false; updateHeroVisibility(); });
  listen(motion, 'change', preferenceChanged);
  listen(button, 'click', () => {
    if (motion.matches || !g) return;
    paused = !paused;
    updateMotionButton();
    syncAnimation();
  });
  listen(window, 'pointermove', event => {
    if (!shouldAnimate()) return;
    pointer.x = (event.clientX / innerWidth - .5) * 2;
    pointer.y = (event.clientY / innerHeight - .5) * 2;
    const box = canvas.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    targetHover = Math.max(0, 1 - Math.hypot(dx, dy) / (box.width * .28));
  }, { passive: true });
  listen(window, 'pointerout', event => {
    if (!event.relatedTarget) { pointer = { x: 0, y: 0 }; targetHover = 0; }
  }, { passive: true });

  resizeIris();
  updateMotionButton();
  navigate();
  const cleanup = () => {
    disposed = true;
    stop();
    if (anchorFrame) cancelAnimationFrame(anchorFrame);
    events.abort();
    if (disposeNavigation === cleanup) disposeNavigation = undefined;
  };
  disposeNavigation = cleanup;
  return cleanup;
}

if (import.meta.hot) import.meta.hot.dispose(() => disposeNavigation?.());
