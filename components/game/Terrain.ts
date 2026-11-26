// Capas de terreno prerrenderizadas (se dibujan una vez por mapa y luego con un solo drawImage por frame).
// Usa un generador con semilla por mapa para que cada mapa tenga siempre el mismo aspecto.

interface Pt { x: number; y: number }

const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const distToSegment = (p: Pt, a: Pt, b: Pt): number => {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
};

const distToPath = (p: Pt, path: Pt[]): number => {
  let m = Infinity;
  for (let i = 1; i < path.length; i++) m = Math.min(m, distToSegment(p, path[i - 1], path[i]));
  return m;
};

/** Punto aleatorio a una distancia dada del camino (rechazo por muestreo). */
const randomPointNearPath = (rnd: () => number, path: Pt[], w: number, h: number, min: number, max: number): Pt | null => {
  for (let i = 0; i < 30; i++) {
    const p = { x: rnd() * w, y: rnd() * h };
    const d = distToPath(p, path);
    if (d >= min && d <= max) return p;
  }
  return null;
};

interface Palette { stain: string; grime: string; puddle: string; puddleShine: string; crack: string; pebble: string }

const PALETTES: Record<string, Palette> = {
  ruins: { stain: 'rgba(20,20,20,', grime: 'rgba(60,60,60,', puddle: 'rgba(40,60,80,', puddleShine: 'rgba(160,190,220,', crack: 'rgba(0,0,0,', pebble: '#555' },
  wasteland: { stain: 'rgba(30,50,10,', grime: 'rgba(70,90,20,', puddle: 'rgba(80,160,40,', puddleShine: 'rgba(200,255,120,', crack: 'rgba(20,10,0,', pebble: '#6b5a45' },
  default: { stain: 'rgba(10,10,10,', grime: 'rgba(50,50,55,', puddle: 'rgba(40,55,70,', puddleShine: 'rgba(150,180,210,', crack: 'rgba(0,0,0,', pebble: '#4a4a4f' },
};

export interface TerrainLayers { under: HTMLCanvasElement; over: HTMLCanvasElement }

/**
 * under: manchas, suciedad, charcos y sombra suave del camino (se dibuja antes del camino).
 * over: grietas, manchas de aceite y guijarros en los bordes (se dibuja sobre el camino, bajo las unidades).
 */
export const buildTerrainLayers = (w: number, h: number, path: Pt[], mapId: string): TerrainLayers | null => {
  if (typeof document === 'undefined' || path.length < 2) return null;
  const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const under = mk(), over = mk();
  const u = under.getContext('2d'), o = over.getContext('2d');
  if (!u || !o) return null;
  const rnd = mulberry32(hashSeed(mapId));
  const pal = PALETTES[mapId] || PALETTES.default;

  // --- UNDER: manchas grandes de suciedad
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 70;
    const g = u.createRadialGradient(x, y, 0, x, y, r);
    const col = rnd() > 0.5 ? pal.stain : pal.grime;
    g.addColorStop(0, `${col}${(0.12 + rnd() * 0.12).toFixed(2)})`);
    g.addColorStop(1, `${col}0)`);
    u.fillStyle = g;
    u.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Sombra suave a ambos lados del camino
  u.save();
  u.lineCap = 'round'; u.lineJoin = 'round';
  u.strokeStyle = 'rgba(0,0,0,0.18)';
  u.lineWidth = 72;
  u.filter = 'blur(10px)';
  u.beginPath();
  u.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) u.lineTo(path[i].x, path[i].y);
  u.stroke();
  u.restore();

  // Charcos con brillo
  for (let i = 0; i < 9; i++) {
    const p = randomPointNearPath(rnd, path, w, h, 60, 220);
    if (!p) continue;
    const rx = 12 + rnd() * 22, ry = rx * (0.5 + rnd() * 0.3), rot = rnd() * Math.PI;
    u.save();
    u.translate(p.x, p.y); u.rotate(rot);
    u.fillStyle = `${pal.puddle}0.35)`;
    u.beginPath(); u.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); u.fill();
    u.fillStyle = `${pal.puddleShine}0.22)`;
    u.beginPath(); u.ellipse(-rx * 0.25, -ry * 0.3, rx * 0.45, ry * 0.3, 0, 0, Math.PI * 2); u.fill();
    u.strokeStyle = 'rgba(0,0,0,0.35)'; u.lineWidth = 1.2;
    u.beginPath(); u.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); u.stroke();
    u.restore();
  }

  // --- OVER: grietas ramificadas sobre el camino
  o.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const seg = 1 + Math.floor(rnd() * (path.length - 1));
    const a = path[seg - 1], b = path[seg], t = rnd();
    let x = a.x + (b.x - a.x) * t + (rnd() - 0.5) * 20;
    let y = a.y + (b.y - a.y) * t + (rnd() - 0.5) * 20;
    let ang = rnd() * Math.PI * 2;
    o.strokeStyle = `${pal.crack}${(0.35 + rnd() * 0.3).toFixed(2)})`;
    o.lineWidth = 1 + rnd();
    o.beginPath(); o.moveTo(x, y);
    const steps = 3 + Math.floor(rnd() * 4);
    for (let s = 0; s < steps; s++) {
      ang += (rnd() - 0.5) * 1.2;
      x += Math.cos(ang) * (5 + rnd() * 8);
      y += Math.sin(ang) * (5 + rnd() * 8);
      o.lineTo(x, y);
    }
    o.stroke();
  }

  // Manchas de aceite sobre el camino
  for (let i = 0; i < 10; i++) {
    const seg = 1 + Math.floor(rnd() * (path.length - 1));
    const a = path[seg - 1], b = path[seg], t = rnd();
    const x = a.x + (b.x - a.x) * t + (rnd() - 0.5) * 12;
    const y = a.y + (b.y - a.y) * t + (rnd() - 0.5) * 12;
    const r = 6 + rnd() * 10;
    const g = o.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = g;
    o.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Guijarros en los bordes del camino
  for (let i = 0; i < 120; i++) {
    const p = randomPointNearPath(rnd, path, w, h, 19, 28);
    if (!p) continue;
    o.fillStyle = pal.pebble;
    o.globalAlpha = 0.35 + rnd() * 0.4;
    o.beginPath(); o.arc(p.x, p.y, 0.8 + rnd() * 1.8, 0, Math.PI * 2); o.fill();
  }
  o.globalAlpha = 1;

  return { under, over };
};
