/**
 * Cosmic Background Starfield Canvas Animation
 */

export function initCosmicCanvas() {
  const canvas = document.getElementById('cosmic-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const STAR_COUNT = Math.floor((width * height) / 8000);
  const stars = [];
  const colors = ['#ffffff', '#c084fc', '#38bdf8', '#fde047', '#f43f5e'];

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      baseAlpha: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.03 + 0.005,
      angle: Math.random() * Math.PI * 2,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.15
    });
  }

  // Shooting Stars
  const shootingStars = [];
  function addShootingStar() {
    if (shootingStars.length < 2 && Math.random() < 0.02) {
      shootingStars.push({
        x: Math.random() * width * 0.8,
        y: Math.random() * height * 0.4,
        length: Math.random() * 120 + 80,
        speed: Math.random() * 12 + 10,
        opacity: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2
      });
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Draw Stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.angle += s.twinkleSpeed;
      const alpha = s.baseAlpha + Math.sin(s.angle) * 0.25;

      s.x += s.speedX;
      s.y += s.speedY;
      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;

      ctx.save();
      ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
      ctx.fillStyle = s.color;
      ctx.shadowBlur = s.size > 1.2 ? 6 : 0;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Subtle Constellation Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.06)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < stars.length; i += 4) {
      for (let j = i + 1; j < Math.min(i + 5, stars.length); j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Render Shooting Stars
    addShootingStar();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.opacity -= 0.02;

      if (ss.opacity <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ss.opacity;
      const grad = ctx.createLinearGradient(
        ss.x,
        ss.y,
        ss.x - Math.cos(ss.angle) * ss.length,
        ss.y - Math.sin(ss.angle) * ss.length
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#c084fc');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(
        ss.x - Math.cos(ss.angle) * ss.length,
        ss.y - Math.sin(ss.angle) * ss.length
      );
      ctx.stroke();
      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  render();
}
