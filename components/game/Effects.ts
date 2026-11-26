// Efectos visuales: partículas, screen shake y números de daño flotantes.
// Módulo independiente, sin dependencias de React. Se actualiza en update() y se dibuja en draw().

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  gravity: number; drag: number;
  active: boolean;
}

interface DamageNumber {
  x: number; y: number; vy: number;
  life: number; maxLife: number;
  text: string; color: string; size: number;
  active: boolean;
}

const MAX_PARTICLES = 500;
const MAX_NUMBERS = 60;

const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
  x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff', gravity: 0, drag: 1, active: false,
}));
const numbers: DamageNumber[] = Array.from({ length: MAX_NUMBERS }, () => ({
  x: 0, y: 0, vy: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 12, active: false,
}));

// Daño acumulado por enemigo para no saturar la pantalla con daño por frame (quemadura, veneno, rayos).
const pendingDamage = new Map<string, { amount: number; cooldown: number; x: number; y: number }>();

let shakeIntensity = 0;
let particleCursor = 0;
let numberCursor = 0;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const spawnParticle = (
  x: number, y: number, vx: number, vy: number,
  life: number, size: number, color: string, gravity = 0, drag = 0.96,
) => {
  // Reutiliza el pool de forma circular (sobrescribe la más antigua si está lleno).
  const p = particles[particleCursor];
  particleCursor = (particleCursor + 1) % MAX_PARTICLES;
  p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.life = life; p.maxLife = life; p.size = size; p.color = color;
  p.gravity = gravity; p.drag = drag; p.active = true;
};

export const Effects = {
  /** Chispas pequeñas al impactar. */
  hit(x: number, y: number, color = '#fbbf24', count = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(0.8, 2.6);
      spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(10, 20), rand(1.2, 2.4), color, 0.02, 0.93);
    }
  },

  /** Explosión + humo al morir un enemigo. `big` para jefes. */
  explosion(x: number, y: number, color = '#f97316', big = false) {
    const n = big ? 45 : 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(0.8, big ? 5.5 : 3.5);
      spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(18, big ? 50 : 34), rand(1.5, big ? 4.5 : 3), i % 3 === 0 ? '#fde047' : color, 0.03, 0.95);
    }
    const smoke = big ? 14 : 5;
    for (let i = 0; i < smoke; i++) {
      spawnParticle(x + rand(-6, 6), y + rand(-6, 6), rand(-0.4, 0.4), rand(-0.9, -0.2), rand(35, 65), rand(5, big ? 12 : 8), 'rgba(60,60,60,0.45)', -0.005, 0.98);
    }
  },

  /** Fogonazo al disparar una torre. */
  muzzle(x: number, y: number, angle: number, color = '#fde047') {
    for (let i = 0; i < 4; i++) {
      const a = angle + rand(-0.3, 0.3);
      const s = rand(1.5, 3.5);
      spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(5, 10), rand(1.5, 2.6), color, 0, 0.9);
    }
  },

  /** Temblor de pantalla. Se acumula pero con tope. */
  shake(amount: number) {
    shakeIntensity = Math.min(14, Math.max(shakeIntensity, amount));
  },

  /**
   * Registra daño recibido por un enemigo. Acumula y muestra un número cada ~10 frames por enemigo.
   */
  damage(id: string, x: number, y: number, amount: number) {
    if (amount < 1) return;
    const p = pendingDamage.get(id);
    if (p) {
      p.amount += amount; p.x = x; p.y = y;
    } else {
      pendingDamage.set(id, { amount, cooldown: 0, x, y });
    }
  },

  update() {
    for (const p of particles) {
      if (!p.active) continue;
      p.x += p.vx; p.y += p.vy;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.gravity;
      if (--p.life <= 0) p.active = false;
    }
    for (const n of numbers) {
      if (!n.active) continue;
      n.y += n.vy; n.vy *= 0.97;
      if (--n.life <= 0) n.active = false;
    }
    pendingDamage.forEach((d, id) => {
      if (d.cooldown > 0) { d.cooldown--; if (d.cooldown === 0 && d.amount < 1) pendingDamage.delete(id); }
      if (d.cooldown <= 0 && d.amount >= 1) {
        const n = numbers[numberCursor];
        numberCursor = (numberCursor + 1) % MAX_NUMBERS;
        const val = Math.round(d.amount);
        n.x = d.x + rand(-8, 8); n.y = d.y - 14; n.vy = -0.9;
        n.life = n.maxLife = 38;
        n.text = String(val);
        n.size = val >= 100 ? 15 : val >= 30 ? 13 : 11;
        n.color = val >= 100 ? '#f87171' : val >= 30 ? '#fbbf24' : '#e5e7eb';
        n.active = true;
        d.amount = 0; d.cooldown = 10;
      }
    });
    if (pendingDamage.size > 400) pendingDamage.clear(); // seguridad contra fugas
    shakeIntensity *= 0.88;
    if (shakeIntensity < 0.15) shakeIntensity = 0;
  },

  /** Llamar al inicio de draw(), antes de dibujar nada. Devuelve true si hay que hacer ctx.restore() al final. */
  beginShake(ctx: CanvasRenderingContext2D): boolean {
    ctx.save();
    if (shakeIntensity > 0) {
      ctx.translate(rand(-shakeIntensity, shakeIntensity), rand(-shakeIntensity, shakeIntensity));
    }
    return true;
  },

  endShake(ctx: CanvasRenderingContext2D) {
    ctx.restore();
  },

  /** Dibuja partículas (sin shadowBlur, barato). */
  drawParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawDamageNumbers(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const n of numbers) {
      if (!n.active) continue;
      const t = n.life / n.maxLife;
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.font = `900 ${n.size}px "Courier New", monospace`;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.restore();
  },

  /** Limpia todo (nueva partida / cambio de mapa). */
  clear() {
    for (const p of particles) p.active = false;
    for (const n of numbers) n.active = false;
    pendingDamage.clear();
    shakeIntensity = 0;
  },
};
