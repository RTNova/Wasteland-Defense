import { describe, it, expect } from 'vitest';
import {
  resistanceMultiplier, getDamageClass, splitShieldDamage, shieldDamageMultiplier, TOWER_BRANCHES, applyBranchStats,
  RELICS, rollRelicChoices, getDailyChallenge, DAILY_MODIFIERS, bombardDamage, BRANCH_LEVEL,
} from '../config/features';
import { TowerType } from '../types/index';

describe('resistencias', () => {
  it('cada torre de ataque tiene clase de daño', () => {
    for (const t of Object.values(TowerType)) {
      if (t === 'RADAR') continue;
      expect(getDamageClass(t), t).toBeDefined();
    }
  });
  it('tanque resiste cinético y sufre explosivo', () => {
    expect(resistanceMultiplier('TANK', 'KINETIC')).toBeLessThan(1);
    expect(resistanceMultiplier('TANK', 'EXPLOSIVE')).toBeGreaterThan(1);
  });
  it('sin clase o sin resistencia vale 1', () => {
    expect(resistanceMultiplier('WALKER', 'KINETIC')).toBe(1);
    expect(resistanceMultiplier('TANK', undefined)).toBe(1);
  });
});

describe('escudo de jefe', () => {
  it('energía y explosivo entran completos, el resto al 25%', () => {
    expect(shieldDamageMultiplier('ENERGY')).toBe(1);
    expect(shieldDamageMultiplier('EXPLOSIVE')).toBe(1);
    expect(shieldDamageMultiplier('KINETIC')).toBe(0.25);
  });
  it('no pasa daño a la vida mientras el escudo aguanta', () => {
    const r = splitShieldDamage(100, 50, 'ENERGY');
    expect(r).toEqual({ shield: 50, toHealth: 0, broke: false });
  });
  it('al romperse, el sobrante pasa a la vida', () => {
    const r = splitShieldDamage(40, 100, 'ENERGY');
    expect(r.broke).toBe(true);
    expect(r.shield).toBe(0);
    expect(r.toHealth).toBeCloseTo(60);
  });
  it('con cinético se necesita 4 veces más daño para romperlo', () => {
    const r = splitShieldDamage(100, 100, 'KINETIC');
    expect(r.broke).toBe(false);
    expect(r.shield).toBe(75);
  });
  it('sin escudo todo el daño va a la vida', () => {
    expect(splitShieldDamage(0, 30, 'KINETIC')).toEqual({ shield: 0, toHealth: 30, broke: false });
  });
});

describe('especializaciones', () => {
  it('toda torre de ataque y el radar tienen dos ramas distintas', () => {
    for (const [type, [a, b]] of Object.entries(TOWER_BRANCHES)) {
      expect(a.id, type).not.toBe(b.id);
    }
    expect(Object.keys(TOWER_BRANCHES).length).toBe(Object.values(TowerType).length);
  });
  it('los ids son únicos', () => {
    const ids = Object.values(TOWER_BRANCHES).flat().map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('aplicar una rama cambia las estadísticas como dice', () => {
    const [a] = TOWER_BRANCHES.TESLA;
    const out = applyBranchStats(a, { damage: 100, range: 200, cooldown: 60 });
    expect(out.damage).toBe(130);
    expect(out.range).toBe(200);
  });
  it('la recarga nunca baja de 2', () => {
    const out = applyBranchStats({ id: 'x', name: 'x', desc: '', cooldownMult: 0.01 }, { damage: 1, range: 1, cooldown: 10 });
    expect(out.cooldown).toBe(2);
  });
  it('el nivel de bifurcación está dentro del rango de mejoras', () => {
    expect(BRANCH_LEVEL).toBeGreaterThan(1);
    expect(BRANCH_LEVEL).toBeLessThan(7);
  });
});

describe('reliquias', () => {
  it('ids únicos', () => {
    expect(new Set(RELICS.map(r => r.id)).size).toBe(RELICS.length);
  });
  it('ofrece 3 distintas y excluye la activa', () => {
    const picks = rollRelicChoices(Math.random, 'overclock');
    expect(picks.length).toBe(3);
    expect(new Set(picks.map(p => p.id)).size).toBe(3);
    expect(picks.some(p => p.id === 'overclock')).toBe(false);
  });
});

describe('desafío diario', () => {
  const maps = ['a', 'b', 'c', 'd', 'e'];
  it('es estable para un mismo día', () => {
    expect(getDailyChallenge(maps, 20000)).toEqual(getDailyChallenge(maps, 20000));
  });
  it('rota el mapa cada día', () => {
    expect(getDailyChallenge(maps, 20000).mapId).not.toBe(getDailyChallenge(maps, 20001).mapId);
  });
  it('siempre devuelve un mapa y un modificador válidos (incluso con días negativos)', () => {
    for (let d = -10; d < 400; d++) {
      const c = getDailyChallenge(maps, d);
      expect(maps).toContain(c.mapId);
      expect(DAILY_MODIFIERS).toContain(c.modifier);
    }
  });
});

describe('bombardeo', () => {
  it('escala con la oleada', () => {
    expect(bombardDamage(20)).toBeGreaterThan(bombardDamage(1));
  });
});
