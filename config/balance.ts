/**
 * Fórmulas de balance como funciones puras.
 *
 * Antes estaban repetidas dentro de GameCanvas.tsx. Ahora GameCanvas las importa de aquí
 * y los tests (tests/balance.test.ts) y el informe (scripts/balance-report.ts) usan
 * exactamente las mismas, así que lo que se analiza es lo que se juega.
 */

export const TOWER_MAX_LEVEL = 7;
export const STARTING_LIVES = 100;
export const BASE_STARTING_MONEY = 400;
export const FRAMES_PER_SECOND = 60;

/** Dinero inicial: 450 + 50 por nivel de "Reserves". */
export const getStartingMoney = (cashLevel: number): number => BASE_STARTING_MONEY + cashLevel * 50;

/**
 * Base de coste de mejora: 300 + 50% del coste de compra. Antes era el coste de compra, así que mejorar un
 * Scavenger (100) salía por casi nada y mejorar un Ion Cannon (1300) por una fortuna. Así la torre barata
 * deja de ser la opción obvia y la cara no se hunde.
 */
export const getUpgradeBase = (baseCost: number): number => 300 + baseCost * 0.5;

/** Multiplicador de daño por nivel (sin el +5% general) para las torres normales, por tipo. */
export const UPGRADE_DAMAGE_MULT: Record<string, number> = {
  SURVIVOR: 1.2, // Scavenger: nerf (antes 1.3)
  TURRET: 1.2, // Sentry: nerf (antes 1.3)
  LASER: 1.4, // Ion Cannon: buff (antes 1.3)
  TESLA: 1.35,
  CHEMIST: 1.4,
};

/** Coste de subir una torre desde `currentLevel` al siguiente: 60% del coste base + 20% por nivel actual. */
export const getUpgradeCost = (baseCost: number, currentLevel: number): number => {
  const eff = getUpgradeBase(baseCost);
  return Math.floor(eff * 0.6 + eff * 0.2 * currentLevel);
};

/** Multiplicador de vida por oleada (curva de campaña, antes de dificultad y modo Endless). */
export const getWaveHpMultiplier = (waveNum: number): number =>
  1 + Math.pow(Math.max(1, waveNum) - 1, 1.6) / 9;

/** Multiplicador de recompensa por kill según oleada. */
export const getRewardMultiplier = (waveNum: number, isEndless: boolean): number =>
  1 + Math.pow(Math.max(1, waveNum), 0.4) * 0.1 * (isEndless ? 1 + Math.max(1, waveNum) * 0.025 : 1);

/**
 * Incinerator (nerf). Antes: cada llama atravesaba hasta 99 enemigos (pierce 99) y el daño subía x1.52 por nivel,
 * así que con 10 Matrioskas juntas el daño se multiplicaba por 10 y todo moría en ~1 s.
 */
export const FLAME_MAX_TARGETS = 3; // enemigos que puede golpear una misma llama (antes 99)
export const FLAME_UPGRADE_DAMAGE_MULT = 1.25; // por nivel, además del +5% general (antes 1.45)
export const FLAME_UPGRADE_COOLDOWN_MULT = 0.95; // por nivel (antes 0.9)
export const FLAME_BURST_SHOTS = 10; // disparos por ráfaga
export const FLAME_BURST_PAUSE_FRAMES = 30; // pausa tras cada ráfaga
export const FLAME_STREAMS = 2; // llamas por disparo: chorro más denso
export const FLAME_STREAM_DAMAGE_MULT = 0.6; // daño de cada llama (2 x 0,6 = 1,2x por disparo)
export const FLAME_SPREAD = 0.35; // cono fijo en radianes: cerrado y preciso, sin ir en línea recta

/** DPS real del Incinerator contra un objetivo, contando los chorros y la pausa entre ráfagas. */
export const flameRealDps = (damage: number, cooldownFrames: number): number => {
  const cycleFrames = FLAME_BURST_SHOTS * cooldownFrames + FLAME_BURST_PAUSE_FRAMES;
  return (damage * FLAME_STREAM_DAMAGE_MULT * FLAME_STREAMS * FLAME_BURST_SHOTS * FRAMES_PER_SECOND) / cycleFrames;
};

/** Segundos que tarda un Incinerator en limpiar `count` enemigos juntos de `hp` de vida cada uno. */
export const flameSecondsToClear = (damage: number, cooldownFrames: number, count: number, hp: number): number => {
  const perTarget = flameRealDps(damage, cooldownFrames);
  return (count * hp) / (perTarget * Math.min(count, FLAME_MAX_TARGETS));
};

export interface UpgradableStats {
  damage: number;
  range: number;
  cooldown: number;
}

/**
 * Frames que debe vivir un proyectil para cubrir el alcance real de su torre (+5 de margen).
 * Antes la vida era fija (60 balas, 30 llamas) y a niveles altos el alcance superaba lo que el
 * proyectil podía recorrer: la torre apuntaba a enemigos que nunca llegaba a alcanzar
 * (p. ej. Ranger con 581 de alcance y balas de 480 px, o el Incinerator con la rama
 * "Alcance largo" y llamas clavadas en 150 px).
 */
export const getTravelLifespan = (rangePx: number, speedPxPerFrame: number, minLifespan: number): number =>
  Math.max(minLifespan, Math.ceil(rangePx / speedPxPerFrame) + 5);


/**
 * Estadísticas tras subir un nivel. Flamethrower y Shockwave ganan más daño y cadencia, sin alcance.
 * El resto gana 30% de daño y 10% de alcance. Todas ganan además 5% de daño.
 */
export const applyUpgradeStats = (type: string, s: UpgradableStats): UpgradableStats => {
  let damage = Math.floor(s.damage * 1.05);
  let range = s.range;
  let cooldown = s.cooldown;
  if (type === 'FLAMETHROWER') {
    damage = Math.floor(damage * FLAME_UPGRADE_DAMAGE_MULT);
    cooldown = Math.max(2, cooldown * FLAME_UPGRADE_COOLDOWN_MULT);
  } else if (type === 'SHOCKWAVE') {
    damage = Math.floor(damage * 1.45);
    cooldown = Math.max(2, cooldown * 0.9);
  } else {
    damage = Math.floor(damage * (UPGRADE_DAMAGE_MULT[type] ?? 1.3));
    range = Math.floor(range * 1.1);
  }
  return { damage, range, cooldown };
};
