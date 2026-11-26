/** Imprime el informe de balance en Markdown. Uso: npm run balance */
import { TOWER_DEFINITIONS, ENEMY_STATS, MAPS } from '../config/constants';
import { EnemyType, TowerType } from '../types/index';
import {
  allTowerTypes, towerLevels, median, DPS_CAVEATS, effectiveEnemy, enemyHp, enemyReward,
  traverseSeconds, singlePassDamage, waveTable, cumulativeMoney, pathLength,
} from './balance-analysis';

const f = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '∞');
const out: string[] = [];
const p = (s = '') => out.push(s);

p('## Torres (nominal, un objetivo)');
p('| Torre | Coste | DPS L1 | DPS L7 | Invertido L7 | DPS/1000$ L1 | DPS/1000$ L7 | Alcance L1 | Alcance L7 |');
p('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
const towers = allTowerTypes().filter(t => t !== TowerType.RADAR);
for (const t of allTowerTypes()) {
  const l = towerLevels(t);
  p(`| ${TOWER_DEFINITIONS[t].name} (${t}) | ${TOWER_DEFINITIONS[t].cost} | ${f(l[0].dps, 1)} | ${f(l[6].dps, 1)} | ${l[6].invested} | ${f(l[0].dpsPer1000, 1)} | ${f(l[6].dpsPer1000, 1)} | ${l[0].range} | ${l[6].range} |`);
}
const m1 = median(towers.map(t => towerLevels(t)[0].dpsPer1000));
const m7 = median(towers.map(t => towerLevels(t)[6].dpsPer1000));
p('');
p(`Mediana DPS/1000$ (sin Radar): L1 = ${f(m1, 1)}, L7 = ${f(m7, 1)}.`);
p('');
p('Relativo a la mediana (1.00 = media):');
p('| Torre | L1 | L7 |');
p('|---|---:|---:|');
for (const t of towers) {
  const l = towerLevels(t);
  p(`| ${TOWER_DEFINITIONS[t].name} | ${f(l[0].dpsPer1000 / m1, 2)} | ${f(l[6].dpsPer1000 / m7, 2)} |`);
}
p('');
p('Salvedades del DPS nominal:');
for (const [t, note] of Object.entries(DPS_CAVEATS)) p(`- ${TOWER_DEFINITIONS[t as TowerType].name}: ${note}`);

p('');
p('## Enemigos (Medium, sin Endless)');
const waves = [1, 5, 10, 15, 20, 30];
p(`| Enemigo | Vel. | Daño a vidas | ${waves.map(w => `HP o${w}`).join(' | ')} | Recompensa o10 | HP/recompensa o10 | Unidades (con spawns) | Vida total con spawns o10 |`);
p(`|---|---:|---:|${waves.map(() => '---:').join('|')}|---:|---:|---:|---:|`);
for (const t of Object.values(EnemyType) as EnemyType[]) {
  const e = effectiveEnemy(t, 10);
  p(`| ${t} | ${ENEMY_STATS[t].speed} | ${ENEMY_STATS[t].damageToPlayer} | ${waves.map(w => enemyHp(t, w)).join(' | ')} | ${enemyReward(t, 10)} | ${f(enemyHp(t, 10) / enemyReward(t, 10), 1)} | ${e.units} | ${e.hp} |`);
}

p('');
p('## Tiempo para recorrer cada mapa (segundos)');
p(`| Mapa | Longitud px | ${[EnemyType.WALKER, EnemyType.RUNNER, EnemyType.NINJA, EnemyType.BOSS].join(' | ')} |`);
p('|---|---:|---:|---:|---:|---:|');
MAPS.forEach((m, i) => p(`| ${m.name} (${m.difficulty}) | ${f(pathLength(m.path))} | ${[EnemyType.WALKER, EnemyType.RUNNER, EnemyType.NINJA, EnemyType.BOSS].map(t => f(traverseSeconds(t, i), 1)).join(' | ')} |`));

p('');
p('## Torres necesarias para matar a UN enemigo en un solo paso (cota superior, un objetivo)');
p('Torres = vida / daño en un paso (cuerda de 2*alcance a la velocidad del enemigo). Menos de 1 = una sola torre basta.');
p('| Enemigo y oleada | ' + towers.map(t => TOWER_DEFINITIONS[t].name).join(' | ') + ' |');
p('|---|' + towers.map(() => '---:').join('|') + '|');
for (const [t, w] of [[EnemyType.TANK, 10], [EnemyType.BOSS, 10], [EnemyType.BOSS, 20], [EnemyType.MATRYOSHKA, 20], [EnemyType.HEALER, 20]] as [EnemyType, number][]) {
  p(`| ${t} o${w} (HP ${enemyHp(t, w)}) | ` + towers.map(tw => {
    const l1 = towerLevels(tw)[0], l7 = towerLevels(tw)[6];
    const r = (x: typeof l1) => (Number.isFinite(singlePassDamage(t, x)) ? f(enemyHp(t, w) / singlePassDamage(t, x), 1) : 'global');
    return `${r(l1)} / ${r(l7)}`;
  }).join(' | ') + ' |');
}
p('(formato: L1 / L7)');

p('');
p('## Oleadas y economía (Medium)');
p('Cota inferior = sin Ninja/Ice Mage aleatorios, superior = con ellos siempre.');
const lo = waveTable(30, 0), hi = waveTable(30, 0.99);
const money = cumulativeMoney(lo);
p('| Oleada | Unidades | Vida total (inf) | Vida total (sup) | Ingreso (kills+oleada) | Vida/$ | Dinero acumulado al empezar |');
p('|---:|---:|---:|---:|---:|---:|---:|');
for (const w of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 25, 30]) {
  const a = lo[w - 1], b = hi[w - 1];
  p(`| ${w} | ${a.units} | ${a.totalHp} | ${b.totalHp} | ${a.income} | ${f(a.hpPerIncome, 1)} | ${money[w - 1]} |`);
}
console.log(out.join('\n'));
