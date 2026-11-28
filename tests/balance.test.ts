/**
 * Tests de balance y de coherencia de datos.
 *
 * Hay tres tipos:
 *  1. Fórmulas: fijan los valores actuales de config/balance.ts (antes vivían dentro de GameCanvas.tsx).
 *  2. Invariantes: cosas que nunca deben romperse (datos completos, curvas crecientes, sin ciclos).
 *  3. Objetivos de balance: umbrales que EXPRESAN una intención de diseño. Los que hoy no se cumplen
 *     están marcados con `it.fails`: el test pasa mientras el problema exista y FALLA cuando lo arregles,
 *     avisándote de que toca quitar el `.fails` (y anotarlo en BALANCE.md).
 *
 * Ejecutar: npm test    |   Informe con cifras: npm run balance
 */
import { describe, it, expect } from 'vitest';
import { TOWER_DEFINITIONS, ENEMY_STATS, MAPS, generateWaves, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/constants';
import { getEndlessScaling } from '../config/endlessScaling';
import { DIFFICULTY_CONFIGS } from '../config/difficulty';
import {
  applyUpgradeStats, FLAME_MAX_TARGETS, FLAME_STREAMS, FLAME_STREAM_DAMAGE_MULT, FLAME_SPREAD, flameSecondsToClear, flameRealDps, getUpgradeCost, getWaveHpMultiplier, getRewardMultiplier, getStartingMoney, TOWER_MAX_LEVEL,
  getTravelLifespan,
} from '../config/balance';
import { getBranches } from '../config/features';
import { EnemyType, TowerType } from '../types/index';
import {
  allTowerTypes, towerLevels, median, effectiveEnemy, waveTable, cumulativeMoney,
} from '../scripts/balance-analysis';

const fighters = allTowerTypes().filter(t => t !== TowerType.RADAR);

describe('fórmulas (config/balance.ts)', () => {
  it('dinero inicial: 400 + 50 por nivel de Reserves', () => {
    expect(getStartingMoney(0)).toBe(400);
    expect(getStartingMoney(4)).toBe(600);
  });

  it('coste de mejora: base = 300 + 50% del coste; 60% de la base + 20% por nivel actual', () => {
    expect(getUpgradeCost(100, 1)).toBe(280); // base 350
    expect(getUpgradeCost(100, 6)).toBe(630);
    expect(getUpgradeCost(1400, 3)).toBe(1200); // base 1000
  });

  it('mejorar un Scavenger de nivel 1 a 7 cuesta 2730 (antes 780)', () => {
    let total = 0;
    for (let l = 1; l < 7; l++) total += getUpgradeCost(100, l);
    expect(total).toBe(2730);
  });

  it('mejora normal: +5% y +30% de daño, +10% de alcance, mismo cooldown (Scavenger y Sentry x1.2, Ion Cannon x1.4)', () => {
    expect(applyUpgradeStats('SNIPER', { damage: 120, range: 330, cooldown: 140 })).toEqual({ damage: 163, range: 363, cooldown: 140 });
    expect(applyUpgradeStats('SURVIVOR', { damage: 40, range: 150, cooldown: 40 })).toEqual({ damage: 50, range: 165, cooldown: 40 });
    expect(applyUpgradeStats('LASER', { damage: 300, range: 250, cooldown: 210 })).toEqual({ damage: 441, range: 275, cooldown: 210 });
  });

  it('mejora de Incinerator: +5% y +25% de daño, cooldown x0.95 (mínimo 2), sin alcance', () => {
    const r = applyUpgradeStats('FLAMETHROWER', { damage: 9, range: 150, cooldown: 3 });
    expect(r.damage).toBe(11);
    expect(r.range).toBe(150);
    expect(r.cooldown).toBeCloseTo(2.85);
    expect(applyUpgradeStats('FLAMETHROWER', { damage: 9, range: 150, cooldown: 2.05 }).cooldown).toBe(2);
  });

  it('mejora de Pulverizer (sin cambios): +5% y +45% de daño, cooldown x0.9 (mínimo 2), sin alcance', () => {
    const r = applyUpgradeStats('SHOCKWAVE', { damage: 30, range: 110, cooldown: 3 });
    expect(r.damage).toBe(44);
    expect(r.range).toBe(110);
    expect(r.cooldown).toBeCloseTo(2.7);
    expect(applyUpgradeStats('SHOCKWAVE', { damage: 30, range: 110, cooldown: 2.1 }).cooldown).toBe(2);
  });

  it('multiplicador de vida por oleada: 1 en la oleada 1 y creciente', () => {
    expect(getWaveHpMultiplier(1)).toBe(1);
    expect(getWaveHpMultiplier(0)).toBe(1); // se trata como oleada 1
    for (let w = 2; w <= 60; w++) expect(getWaveHpMultiplier(w)).toBeGreaterThan(getWaveHpMultiplier(w - 1));
  });

  it('multiplicador de recompensa: Endless paga más que campaña desde la oleada 1', () => {
    for (const w of [1, 10, 30]) expect(getRewardMultiplier(w, true)).toBeGreaterThan(getRewardMultiplier(w, false));
  });
});

describe('alcance real de los proyectiles', () => {
  it('la vida del proyectil cubre el alcance de su torre (+5 frames de margen)', () => {
    expect(getTravelLifespan(150, 5, 30)).toBe(35); // Incinerator base
    expect(getTravelLifespan(581, 8, 60)).toBe(78); // Ranger L7: antes la bala moría a los 480 px
    expect(getTravelLifespan(140, 8, 60)).toBe(60); // alcance corto: se queda en el mínimo
    expect(getTravelLifespan(330, 8, 60)).toBe(60); // Ranger L1: 330/8+5 = 47 -> mínimo 60
  });

  it('el cono del Incinerator es cerrado y fijo, y el chorro sale denso con el daño repartido', () => {
    expect(FLAME_SPREAD).toBeLessThan(0.4); // más cerrado que el cono original
    expect(FLAME_SPREAD).toBeGreaterThan(0.1); // sin llegar a ser una línea recta
    expect(FLAME_STREAMS).toBeGreaterThanOrEqual(2); // varios chorros por disparo
    expect(FLAME_STREAMS * FLAME_STREAM_DAMAGE_MULT).toBeLessThanOrEqual(1.25); // el reparto no dispara el DPS
    expect(FLAME_STREAMS * FLAME_STREAM_DAMAGE_MULT).toBeGreaterThanOrEqual(1); // ni lo baja: el cono estrecho ya alcanza a menos enemigos
  });

  it('toda torre de fuego directo alcanza su alcance máximo real (L7 + rama + buff de Command Link)', () => {
    // Velocidad y vida mínima de cada proyectil tal y como las usa GameCanvas al crearlos.
    const proyectiles: Partial<Record<TowerType, { speed: number; minLife: number }>> = {
      [TowerType.SURVIVOR]: { speed: 8, minLife: 60 },
      [TowerType.SNIPER]: { speed: 8, minLife: 60 },
      [TowerType.TURRET]: { speed: 8, minLife: 60 },
      [TowerType.CHEMIST]: { speed: 6, minLife: 60 },
      [TowerType.MORTAR]: { speed: 4, minLife: 120 },
      [TowerType.FLAMETHROWER]: { speed: 5, minLife: 30 },
    };
    for (const [t, p] of Object.entries(proyectiles)) {
      const def = TOWER_DEFINITIONS[t as TowerType];
      let range = def.range!;
      if (t !== TowerType.FLAMETHROWER) {
        for (let l = 1; l < TOWER_MAX_LEVEL; l++) range = Math.floor(range * 1.1); // +10% por nivel
      }
      const maxBranchRange = Math.max(1, ...(getBranches(t)?.map(b => b.rangeMult ?? 1) ?? [1]));
      const maxRange = range * maxBranchRange * 1.15; // buff de Command Link
      const reach = getTravelLifespan(maxRange, p.speed, p.minLife) * p.speed;
      expect(reach, `${t}: alcance ${Math.round(maxRange)} > recorrido ${Math.round(reach)}`).toBeGreaterThanOrEqual(maxRange);
    }
  });
});

describe('invariantes de datos', () => {
  it('toda torre combatiente tiene coste, daño y cooldown positivos; el radar no hace daño', () => {
    for (const t of fighters) {
      const d = TOWER_DEFINITIONS[t];
      expect(d.cost, t).toBeGreaterThan(0);
      expect(d.damage, t).toBeGreaterThan(0);
      expect(d.cooldown, t).toBeGreaterThan(0);
      expect(d.range, t).toBeGreaterThan(0);
    }
    expect(TOWER_DEFINITIONS[TowerType.RADAR].damage).toBe(0);
  });

  it('cada tipo de torre y de enemigo tiene definición', () => {
    for (const t of allTowerTypes()) expect(TOWER_DEFINITIONS[t], t).toBeDefined();
    for (const e of Object.values(EnemyType)) expect(ENEMY_STATS[e as EnemyType], e).toBeDefined();
  });

  it('el DPS nominal nunca baja al subir de nivel y el coste de mejora sube', () => {
    for (const t of fighters) {
      const rows = towerLevels(t);
      expect(rows).toHaveLength(TOWER_MAX_LEVEL);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].dps, `${t} nivel ${i + 1}`).toBeGreaterThanOrEqual(rows[i - 1].dps);
        expect(rows[i].invested).toBeGreaterThan(rows[i - 1].invested);
      }
    }
  });

  it('los enemigos tienen vida, velocidad y recompensa positivas; las cadenas de spawn terminan', () => {
    for (const e of Object.values(EnemyType) as EnemyType[]) {
      const s = ENEMY_STATS[e];
      expect(s.hp).toBeGreaterThan(0);
      expect(s.speed).toBeGreaterThan(0);
      expect(s.reward).toBeGreaterThan(0);
      expect(s.damageToPlayer).toBeGreaterThan(0);
      // si hubiera un ciclo, effectiveEnemy desbordaría la pila
      expect(Number.isFinite(effectiveEnemy(e, 1).hp)).toBe(true);
    }
  });

  it('los jefes valen más vida/recompensa que lo que sueltan (Matrioska > Boss > Tank > Walker)', () => {
    const hp = (e: EnemyType) => effectiveEnemy(e, 10).hp;
    expect(hp(EnemyType.MATRYOSHKA)).toBeGreaterThan(hp(EnemyType.BOSS));
    expect(hp(EnemyType.BOSS)).toBeGreaterThan(hp(EnemyType.TANK));
    expect(hp(EnemyType.TANK)).toBeGreaterThan(hp(EnemyType.WALKER));
  });

  it('hay 7 mapas y todos los puntos del camino caen dentro del lienzo', () => {
    expect(MAPS).toHaveLength(7);
    for (const m of MAPS) {
      expect(m.path.length, m.id).toBeGreaterThanOrEqual(2);
      for (const p of m.path) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(CANVAS_WIDTH);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(CANVAS_HEIGHT);
      }
    }
  });

  it('Endless: la vida y la velocidad no bajan con las oleadas y la velocidad tiene tope 2.35x', () => {
    for (let w = 2; w <= 80; w++) {
      expect(getEndlessScaling(w, true).hpMultiplier).toBeGreaterThanOrEqual(getEndlessScaling(w - 1, true).hpMultiplier);
      expect(getEndlessScaling(w, true).speedMultiplier).toBeGreaterThanOrEqual(getEndlessScaling(w - 1, true).speedMultiplier);
    }
    expect(getEndlessScaling(500, true).speedMultiplier).toBeLessThanOrEqual(2.35);
    expect(getEndlessScaling(30, false).hpMultiplier).toBe(1);
  });

  it('dificultades: Easy < Medium < Hard en vida y densidad', () => {
    const { EASY, MEDIUM, HARD } = DIFFICULTY_CONFIGS;
    expect(EASY.healthMultiplier).toBeLessThan(MEDIUM.healthMultiplier);
    expect(MEDIUM.healthMultiplier).toBeLessThan(HARD.healthMultiplier);
    expect(EASY.densityMultiplier).toBeLessThan(MEDIUM.densityMultiplier);
    expect(MEDIUM.densityMultiplier).toBeLessThan(HARD.densityMultiplier);
  });
});

describe('oleadas', () => {
  const withRandom = <T,>(v: number, fn: () => T): T => {
    const o = Math.random;
    Math.random = () => v;
    try { return fn(); } finally { Math.random = o; }
  };

  it('genera tantas oleadas como se piden, numeradas desde 1', () => {
    const w = withRandom(0, () => generateWaves(30));
    expect(w).toHaveLength(30);
    w.forEach((x, i) => expect(x.number).toBe(i + 1));
  });

  it('las oleadas 10, 15 y 20 traen Boss, Boss y Matrioska respectivamente', () => {
    const w = withRandom(0, () => generateWaves(20));
    expect(w[9].enemies.some(g => g.type === EnemyType.BOSS)).toBe(true);
    expect(w[14].enemies.some(g => g.type === EnemyType.BOSS)).toBe(true);
    expect(w[19].enemies.some(g => g.type === EnemyType.MATRYOSHKA)).toBe(true);
  });

  it('la recompensa de oleada nunca baja', () => {
    const w = withRandom(0, () => generateWaves(60));
    for (let i = 1; i < w.length; i++) expect(w[i].reward).toBeGreaterThanOrEqual(w[i - 1].reward);
  });

  it('Hard tiene más vida total por oleada que Easy en todas las oleadas', () => {
    const easy = waveTable(30, 0, 'EASY'), hard = waveTable(30, 0, 'HARD');
    for (let i = 0; i < 30; i++) expect(hard[i].totalHp).toBeGreaterThan(easy[i].totalHp);
  });

  it('la cota superior (con Ninja/Ice Mage) nunca es menor que la inferior', () => {
    const lo = waveTable(30, 0), hi = waveTable(30, 0.99);
    for (let i = 0; i < 30; i++) expect(hi[i].totalHp).toBeGreaterThanOrEqual(lo[i].totalHp);
  });

  it('economía: la vida por dólar de ingreso crece con las oleadas (la dificultad supera a la economía)', () => {
    const t = waveTable(30, 0);
    expect(t[29].hpPerIncome).toBeGreaterThan(t[9].hpPerIncome);
    expect(t[9].hpPerIncome).toBeGreaterThan(t[0].hpPerIncome);
  });

  it('dinero acumulado al empezar cada oleada es creciente', () => {
    const m = cumulativeMoney(waveTable(30, 0));
    for (let i = 1; i < m.length; i++) expect(m[i]).toBeGreaterThan(m[i - 1]);
  });
});

/**
 * Objetivos de balance. Ver BALANCE.md para el contexto de cada uno.
 * `it.fails`: el problema existe hoy; el test pasará a rojo cuando se arregle (entonces quitar `.fails`).
 */
describe('objetivos de balance', () => {
  const m7 = median(fighters.map(t => towerLevels(t)[6].dpsPer1000));
  const m1 = median(fighters.map(t => towerLevels(t)[0].dpsPer1000));
  const rel7 = (t: TowerType) => towerLevels(t)[6].dpsPer1000 / m7;
  const rel1 = (t: TowerType) => towerLevels(t)[0].dpsPer1000 / m1;

  it('OBJ-1: ninguna torre supera 3x la mediana de DPS por dólar en nivel 7 (cumplido tras el PR de dificultad)', () => {
    for (const t of fighters) expect(rel7(t), t).toBeLessThanOrEqual(3);
  });

  it.fails('OBJ-2: ninguna torre supera 3x la mediana de DPS por dólar en nivel 1 (hoy Scavenger y Sentry rondan 7x)', () => {
    for (const t of fighters) expect(rel1(t), t).toBeLessThanOrEqual(3);
  });

  it.fails('OBJ-3: el DPS de nivel 7 de ninguna torre supera 8x el de nivel 1 (hoy Pulverizer ~22x, Incinerator ~14x)', () => {
    for (const t of fighters) {
      const r = towerLevels(t);
      expect(r[6].dps / r[0].dps, t).toBeLessThanOrEqual(8);
    }
  });

  it('OBJ-4: ninguna torre baja de 0.3x la mediana de DPS por dólar en nivel 7 (cumplido tras el PR de dificultad)', () => {
    for (const t of fighters) expect(rel7(t), t).toBeGreaterThanOrEqual(0.3);
  });

  it('OBJ-5: ningún enemigo normal tiene más de 100 de vida por punto de recompensa en la oleada 10 salvo el Healer (hoy 424)', () => {
    for (const e of Object.values(EnemyType) as EnemyType[]) {
      if (e === EnemyType.HEALER) continue;
      const eff = effectiveEnemy(e, 10);
      expect(eff.hp / eff.reward, e).toBeLessThanOrEqual(100);
    }
  });

  it.fails('OBJ-6: el Healer rinde al menos 1/100 de su vida en recompensa (hoy 1/424: matarlo no compensa)', () => {
    const eff = effectiveEnemy(EnemyType.HEALER, 10);
    expect(eff.hp / eff.reward).toBeLessThanOrEqual(100);
  });
});

describe('Incinerator (nerf): una llama ya no atraviesa a todos', () => {
  const flame = towerLevels(TowerType.FLAMETHROWER);
  const stats = (lvl: number) => {
    let s = { damage: TOWER_DEFINITIONS[TowerType.FLAMETHROWER].damage!, range: 150, cooldown: TOWER_DEFINITIONS[TowerType.FLAMETHROWER].cooldown! };
    for (let i = 1; i < lvl; i++) s = applyUpgradeStats('FLAMETHROWER', s);
    return s;
  };
  const matryoshkaHp = ENEMY_STATS[EnemyType.MATRYOSHKA].hp;

  it('cada llama golpea como máximo a 3 enemigos', () => {
    expect(FLAME_MAX_TARGETS).toBe(3);
  });

  it('nivel 7: 10 Matrioskas juntas tardan más de 15 s en limpiarse (antes ~1 s con perforación 99)', () => {
    const s = stats(7);
    expect(flameSecondsToClear(s.damage, s.cooldown, 10, matryoshkaHp)).toBeGreaterThan(15);
  });

  it('el Incinerator ya no multiplica su daño por el número de enemigos más allá de 3', () => {
    const s = stats(7);
    const t3 = flameSecondsToClear(s.damage, s.cooldown, 3, 1000);
    const t12 = flameSecondsToClear(s.damage, s.cooldown, 12, 1000);
    expect(t12 / t3).toBeCloseTo(4, 5); // 4x enemigos => 4x tiempo, no 1x
  });

  it('DPS nominal de nivel 7 no supera 8x el de nivel 1 (OBJ-3 para esta torre)', () => {
    expect(flame[6].dps / flame[0].dps).toBeLessThanOrEqual(8);
  });

  it('DPS por dólar de nivel 7 no supera 3x la mediana (OBJ-1 para esta torre)', () => {
    const m7 = median(fighters.map(t => towerLevels(t)[6].dpsPer1000));
    expect(flame[6].dpsPer1000 / m7).toBeLessThanOrEqual(3);
  });

  it('el DPS real contra un objetivo es menor que el nominal por la pausa entre ráfagas', () => {
    const s = stats(1);
    expect(flameRealDps(s.damage, s.cooldown)).toBeLessThan(60 * s.damage / s.cooldown);
  });
});
