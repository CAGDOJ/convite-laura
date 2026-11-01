(() => {
  'use strict';
  const root = document.getElementById('laura-story-invite');
  if (!root) return;

  let current = null;
  root.celebrateThanks = () => {
    if (current) current();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'laura-glitter';
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d');
    if (!context) return;
    document.body.appendChild(canvas);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.scale(pixelRatio, pixelRatio);
    const colors = ['#f7d66f', '#fff4c2', '#e5b858', '#f4adbd', '#ffe6cf', '#a92c30', '#adcbd9'];
    const count = Math.min(190, Math.max(115, Math.round(width * .38)));
    const particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 110 + Math.random() * Math.min(width * 1.1, 490);
      return {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        gravity: 230 + Math.random() * 130,
        delay: Math.random() * .32,
        size: 1.5 + Math.random() * 3.8,
        spin: Math.random() * Math.PI * 2,
        rotation: (Math.random() - .5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        star: Math.random() < .35
      };
    });
    const start = performance.now();
    let frame;
    const stop = () => {
      cancelAnimationFrame(frame);
      canvas.remove();
      if (current === stop) current = null;
    };
    current = stop;
    function draw(now) {
      const elapsed = (now - start) / 1000;
      if (elapsed > 4.5 || root.dataset.storyScene !== 'thanks') { stop(); return; }
      context.clearRect(0, 0, width, height);
      for (const p of particles) {
        const t = elapsed - p.delay;
        if (t < 0) continue;
        const spread = (1 - Math.exp(-.65 * t)) / .65;
        const x = width * .5 + p.vx * spread;
        const y = height * .45 + p.vy * spread + p.gravity * t * t * .5;
        const fade = Math.min(1, t * 7, Math.max(0, (4.5 - elapsed) / 1.1));
        context.save();
        context.translate(x, y);
        context.rotate(p.spin + p.rotation * t);
        context.globalAlpha = fade * (.55 + .45 * Math.abs(Math.sin(t * 8 + p.spin)));
        context.fillStyle = p.color;
        if (p.star) {
          context.fillRect(-p.size * .22, -p.size, p.size * .44, p.size * 2);
          context.fillRect(-p.size, -p.size * .22, p.size * 2, p.size * .44);
        } else {
          context.beginPath();
          context.arc(0, 0, p.size * .55, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
  };
})();
