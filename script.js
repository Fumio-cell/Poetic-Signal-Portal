/* ═══════════════════════════════════════
   POETIC SIGNAL — INTERACTIONS
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  initScrollAnimations();
  initNavScroll();
  initSmoothScroll();
  initCardParallax();
});

/* ── HERO CANVAS — Organic Mist/Particle Field ── */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  let particles = [];
  let animationId;
  const PARTICLE_COUNT = 80;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.2;
      this.opacity = Math.random() * 0.4 + 0.1;
      this.hue = Math.random() > 0.5 ? 260 : 190; // purple or cyan
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.01 + 0.005;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.pulse += this.pulseSpeed;

      if (this.x < -50) this.x = width + 50;
      if (this.x > width + 50) this.x = -50;
      if (this.y < -50) this.y = height + 50;
      if (this.y > height + 50) this.y = -50;
    }

    draw(ctx) {
      const pulsedOpacity = this.opacity * (0.5 + Math.sin(this.pulse) * 0.5);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 70%, 70%, ${pulsedOpacity})`;
      ctx.fill();
    }
  }

  function drawConnections(ctx) {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          const opacity = (1 - dist / 150) * 0.06;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124, 92, 252, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  // Large organic mist blobs
  let mistPhase = 0;

  function drawMist(ctx) {
    mistPhase += 0.003;

    const blobs = [
      { x: width * 0.3, y: height * 0.4, r: 300, hue: 260, phase: mistPhase },
      { x: width * 0.7, y: height * 0.6, r: 250, hue: 190, phase: mistPhase + 1 },
      { x: width * 0.5, y: height * 0.3, r: 200, hue: 230, phase: mistPhase + 2 },
    ];

    blobs.forEach(blob => {
      const offsetX = Math.sin(blob.phase) * 40;
      const offsetY = Math.cos(blob.phase * 0.7) * 30;
      const gradient = ctx.createRadialGradient(
        blob.x + offsetX, blob.y + offsetY, 0,
        blob.x + offsetX, blob.y + offsetY, blob.r
      );
      gradient.addColorStop(0, `hsla(${blob.hue}, 60%, 50%, 0.04)`);
      gradient.addColorStop(0.5, `hsla(${blob.hue}, 60%, 40%, 0.02)`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    drawMist(ctx);

    particles.forEach(p => {
      p.update();
      p.draw(ctx);
    });

    drawConnections(ctx);

    animationId = requestAnimationFrame(animate);
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
    if (animationId) cancelAnimationFrame(animationId);
    animate();
  }

  window.addEventListener('resize', () => {
    resize();
  });

  init();
}

/* ── SCROLL ANIMATIONS ── */
function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay') || 0;
          setTimeout(() => {
            entry.target.classList.add('is-visible');
          }, parseInt(delay));
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px'
    }
  );

  elements.forEach(el => observer.observe(el));
}

/* ── NAV SCROLL EFFECT ── */
function initNavScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let lastScrollY = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    lastScrollY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(() => {
        if (lastScrollY > 100) {
          nav.classList.add('nav--scrolled');
        } else {
          nav.classList.remove('nav--scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ── SMOOTH SCROLL ── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offsetTop = target.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ── CARD PARALLAX / GLOW EFFECT ── */
function initCardParallax() {
  const cards = document.querySelectorAll('.app-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const glow = card.querySelector('.app-card__glow');
      if (glow) {
        glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(124, 92, 252, 0.12), transparent 60%)`;
        glow.style.opacity = '1';
      }
    });

    card.addEventListener('mouseleave', () => {
      const glow = card.querySelector('.app-card__glow');
      if (glow) {
        glow.style.opacity = '0';
      }
    });
  });
}
