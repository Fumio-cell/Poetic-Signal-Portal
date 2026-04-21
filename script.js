/* ═══════════════════════════════════════
   POETIC SIGNAL — INTERACTIONS
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  initLogoCanvas();
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
  const PARTICLE_COUNT = 400; // Adjusted for 3D depth performance

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.reset();
      this.z = Math.random() * 2000 + 10; // Allow spanning full Z axis initially
    }

    reset() {
      this.x = (Math.random() - 0.5) * width * 3;
      this.y = (Math.random() - 0.5) * height * 3;
      this.z = 2000; // Spawn far back
      this.baseSize = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 6.0;
      this.speedY = (Math.random() - 0.5) * 6.0;
      this.speedZ = Math.random() * 4.0 + 1.5; // Move towards camera
      this.opacity = Math.random() * 0.4 + 0.1;
      this.hue = Math.random() > 0.5 ? 260 : 190;
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.01 + 0.005;
    }

    update() {
      // Violent explosive bursts
      if (Math.random() < 0.015) {
        this.speedX += (Math.random() - 0.5) * 30;
        this.speedY += (Math.random() - 0.5) * 30;
        this.speedZ += Math.random() * 10;
      }
      
      this.x += this.speedX;
      this.y += this.speedY;
      this.z -= this.speedZ;
      this.pulse += this.pulseSpeed;

      // Friction to regain control
      this.speedX *= 0.94;
      this.speedY *= 0.94;
      if (this.speedZ > 6) this.speedZ *= 0.94;

      // Maintain chaotic baseline speed
      if (Math.abs(this.speedX) < 1.0) this.speedX += (Math.random() - 0.5) * 2.0;
      if (Math.abs(this.speedY) < 1.0) this.speedY += (Math.random() - 0.5) * 2.0;

      // Wrap around when passing the camera
      if (this.z < 10) {
        this.reset();
      }

      // 3D Perspective Projection
      const scale = 1000 / this.z;
      this.px = (width / 2) + this.x * scale;
      this.py = (height / 2) + this.y * scale;
      this.psize = this.baseSize * scale;
    }

    draw(ctx) {
      if (this.px < -200 || this.px > width + 200 || this.py < -200 || this.py > height + 200) return;

      const pulsedOpacity = this.opacity * (0.5 + Math.sin(this.pulse) * 0.5);

      if (this.z < 600) {
        // Massive immersive foreground bokeh effect
        const blurRatio = (600 - this.z) / 600; // 0 to 1
        const drawOpacity = pulsedOpacity * (1 - blurRatio * 0.92); // fade heavily to act like diffuse light
        
        // Exponentially increase size as it nears the lens
        const bokehSize = this.psize * (1 + blurRatio * 12); 
        
        ctx.beginPath();
        const grad = ctx.createRadialGradient(this.px, this.py, 0, this.px, this.py, bokehSize);
        grad.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${drawOpacity})`);
        grad.addColorStop(1, `hsla(${this.hue}, 80%, 70%, 0)`);
        ctx.fillStyle = grad;
        ctx.arc(this.px, this.py, bokehSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sharp distant particle
        ctx.beginPath();
        ctx.arc(this.px, this.py, this.psize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 70%, 70%, ${pulsedOpacity})`;
        ctx.fill();
      }
    }
  }

  function drawConnections(ctx) {
    // Only connect sharp particles in the background
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].z < 600) continue;
      
      for (let j = i + 1; j < particles.length; j++) {
        if (particles[j].z < 600) continue;

        const dx = particles[i].px - particles[j].px;
        const dy = particles[i].py - particles[j].py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dz = Math.abs(particles[i].z - particles[j].z);

        if (dist < 150 && dz < 400) {
          const opacity = (1 - dist / 150) * 0.08 * (1 - dz / 400);
          ctx.beginPath();
          ctx.moveTo(particles[i].px, particles[i].py);
          ctx.lineTo(particles[j].px, particles[j].py);
          ctx.strokeStyle = `rgba(124, 92, 252, ${opacity})`;
          ctx.lineWidth = 0.5 * (1000 / particles[i].z);
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
    });

    // Z-sort so closest particles draw on top
    particles.sort((a, b) => b.z - a.z);

    particles.forEach(p => {
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

/* ── DYNAMIC LOGO CANVAS ── */
function initLogoCanvas() {
  const canvas = document.getElementById('dynamic-logo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const size = 300; 
  canvas.width = size;
  canvas.height = size;

  let time = 0;

  function animate() {
    time += 0.015;
    ctx.clearRect(0, 0, size, size);
    
    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = 65;
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw overlapping signal waves
    const numWaves = 4;
    for (let j = 0; j < numWaves; j++) {
      ctx.beginPath();
      const offsetPhase = j * (Math.PI / 2);
      
      // Dynamic shift from cyan to deep blue
      const alpha = 1 - (j * 0.15);
      ctx.strokeStyle = `rgba(${136 - j * 20}, ${204 - j * 10}, 255, ${alpha})`;
      
      const numPoints = 120;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        
        // Multi-frequency modulation
        const baseFreq = 8;
        const subFreq = 3;
        
        // Complex wave interference pattern
        const mod1 = Math.sin(angle * baseFreq + time * 2) * 8;
        const mod2 = Math.cos(angle * subFreq - time * 1.5 + offsetPhase) * 12;
        const breath = Math.sin(time) * 5;
        
        // Add energy depending on layer (j)
        const energyNoise = (Math.sin(angle * 12 + time * 5) * (numWaves - j) * 2);
        
        const r = baseRadius + mod1 + mod2 + breath + energyNoise;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    
    requestAnimationFrame(animate);
  }
  
  animate();
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
