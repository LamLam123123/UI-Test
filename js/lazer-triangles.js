/* ==========================================================================
   AUTHENTIC OSU! LAZER TRIANGLES BACKGROUND SYSTEM
   ========================================================================== */

(function () {
  const canvas = document.getElementById('lazer-triangles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Responsive resize
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Mouse Parallax
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / width - 0.5) * 30;
    targetMouseY = (e.clientY / height - 0.5) * 30;
  });

  class Triangle {
    constructor(initial = true) {
      this.reset(initial);
    }

    reset(initial = false) {
      this.x = Math.random() * (width + 100) - 50;
      this.y = initial ? Math.random() * (height + 100) - 50 : height + Math.random() * 80 + 30;
      this.size = Math.random() * 85 + 30; // size 30px to 115px
      this.depth = Math.random() * 0.8 + 0.2; // depth factor (0.2 to 1.0)
      this.speed = (Math.random() * 0.5 + 0.25) * this.depth;
      this.alpha = (Math.random() * 0.08 + 0.03) * this.depth;
      
      // Frosted glass white & luminous silver particles
      const randColor = Math.random();
      if (randColor < 0.65) {
        this.colorPrefix = 'rgba(255, 255, 255, '; // Pure luminous white
      } else if (randColor < 0.85) {
        this.colorPrefix = 'rgba(235, 240, 255, '; // Cool frosted ice
      } else {
        this.colorPrefix = 'rgba(210, 220, 240, '; // Soft silver
      }

      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.006;
    }

    update() {
      this.y -= this.speed;
      this.rotation += this.rotSpeed;

      if (this.y < -this.size * 2) {
        this.reset(false);
      }
    }

    draw(ctx, offsetX, offsetY) {
      ctx.save();
      // Apply parallax offset based on depth
      const px = this.x + offsetX * this.depth;
      const py = this.y + offsetY * this.depth;

      ctx.translate(px, py);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.colorPrefix + this.alpha + ')';

      ctx.beginPath();
      const r = this.size;
      // Equilateral triangle
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  // Generate triangle particles (Tối ưu hóa: 30-35 hạt để giữ 60fps mượt mà, không lag)
  const PARTICLE_COUNT = Math.min(Math.max(Math.floor((width * height) / 36000), 18), 32);
  const triangles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    triangles.push(new Triangle(true));
  }

  // Animation Loop
  let isTabVisible = true;
  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
  });

  function render() {
    if (!isTabVisible) {
      setTimeout(() => requestAnimationFrame(render), 200);
      return;
    }

    // Smooth lerp mouse parallax
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < triangles.length; i++) {
      triangles[i].update();
      triangles[i].draw(ctx, mouseX, mouseY);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
