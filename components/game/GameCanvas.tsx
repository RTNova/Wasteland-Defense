
import React, { useEffect, useRef, useState } from 'react';
import { Enemy, Tower, Projectile, GameMap, EnemyType, TowerType, Point, GlobalUpgrades, DragState, GroundEffect, CurrencyPopup } from '../../types/index';
import { CANVAS_HEIGHT, CANVAS_WIDTH, ENEMY_STATS, TOWER_DEFINITIONS, generateWaves } from '../../config/constants';
import { Heart, Zap, Crosshair, Play, Pause, LogOut, FastForward, Repeat, ArrowUp, Terminal, Skull, Minimize2, Maximize2, Sword, Infinity as InfinityIcon, BarChart3, CheckCircle2 } from 'lucide-react';
import { drawTower, drawEnemy, drawProjectile, drawGroundEffect } from './RenderUtils';
import { PostWaveSummaryModal, WaveSummaryData } from '../ui/PostWaveSummaryModal';
import { soundManager, SoundSettings } from '../../config/soundManager';
import { SoundSettingsPanel } from '../ui/SoundSettingsPanel';

// --- SUB-COMPONENT: TOWER PREVIEW ---
const TowerPreview: React.FC<{ type: TowerType }> = ({ type }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const def = TOWER_DEFINITIONS[type];
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Create dummy tower for rendering
        const dummy: Tower = {
            id: 'preview',
            type: type,
            x: cx, 
            y: cy,
            range: 0, damage: 0, cooldown: 0, cooldownTimer: 0, cost: 0,
            level: 1,
            color: def.color || '#fff',
            name: '', description: '', rotation: -Math.PI / 2, // Pointing Up
            frame: 0,
            totalDamage: 0
        };

        // Scale up slightly for visibility
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.4, 1.4);
        ctx.translate(-cx, -cy);
        drawTower({ ctx, frame: 0 }, dummy);
        ctx.restore();

    }, [type]);

    return <canvas ref={canvasRef} width={64} height={64} className="pointer-events-none" />;
};

// --- ICONS HELPER ---
const BowIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
        <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10" />
        <path d="M2 12h20" />
        <path d="M2 12v0" />
    </svg>
);

const RangeArcIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
        <path d="M4 18 L4 16 Q 12 4 20 16 L 20 18" />
        <path d="M2 15 l 2 3 l 2 -3" />
        <path d="M18 15 l 2 3 l 2 -3" />
    </svg>
);

interface GameCanvasProps {
  map: GameMap;
  upgrades: GlobalUpgrades;
  currentTechPoints?: number;
  onExit: () => void;
  onWin: (reward: number) => void;
  onAddGlobalPoints?: (amount: number) => void;
  isDevMode?: boolean;
  initialIsEndless?: boolean;
}

interface TerrainProp {
  x: number;
  y: number;
  size: number;
  type: 'ROCK' | 'CRATER' | 'SLIME' | 'GRASS' | 'PLATE' | 'RUBBLE' | 'CRACK';
  rotation: number;
  color: string;
  opacity: number;
  onPath: boolean;
}

interface FogParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  map, 
  upgrades, 
  currentTechPoints = 0,
  onExit, 
  onWin, 
  onAddGlobalPoints, 
  isDevMode = false, 
  initialIsEndless = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game Logic Refs (Mutable for performance)
  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const groundEffectsRef = useRef<GroundEffect[]>([]); 
  const currencyPopupsRef = useRef<CurrencyPopup[]>([]);
  const livesRef = useRef<number>(100); 
  const frameRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const waveActiveRef = useRef<boolean>(false);
  const currentWaveIndexRef = useRef<number>(0);
  const spawnQueueRef = useRef<{ type: EnemyType; framesUntilNext: number }[]>([]);
  const hasWonRef = useRef<boolean>(false); // To prevent multiple win triggers

  // Visual Refs
  const terrainRef = useRef<TerrainProp[]>([]);
  const fogRef = useRef<FogParticle[]>([]);
  const bgPatternRef = useRef<CanvasPattern | null>(null);

  // Derived Stats based on upgrades
  const getTowerStats = (type: TowerType) => {
    const def = TOWER_DEFINITIONS[type];
    const dmgMult = 1 + (upgrades.damageLevel * 0.1);
    const rangeMult = 1 + (upgrades.rangeLevel * 0.1);
    const costMult = Math.max(0.5, 1 - (upgrades.discountLevel * 0.05));
    
    // Flamethrower/Shockwave rework: No range upgrades, just damage/fire rate
    if (type === TowerType.FLAMETHROWER || type === TowerType.SHOCKWAVE) {
        return {
            ...def,
            damage: Math.round((def.damage || 1) * dmgMult),
            range: def.range || 100, // Fixed range
            cost: Math.floor((def.cost || 100) * costMult)
        };
    }

    return {
      ...def,
      damage: Math.round((def.damage || 1) * dmgMult),
      range: (def.range || 100) * rangeMult,
      cost: Math.floor((def.cost || 100) * costMult)
    };
  };

  // React State for UI
  const [money, setMoney] = useState(450 + (upgrades.cashLevel * 50));
  const [lives, setLives] = useState(100);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [isEndless, setIsEndless] = useState(initialIsEndless);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredTowerType, setHoveredTowerType] = useState<TowerType | null>(null);
  const [notification, setNotification] = useState<{text: string, opacity: number} | null>(null);
  
  // Dev Tools State
  const [isDevOpen, setIsDevOpen] = useState(true);

  // New Controls State
  const [gameSpeed, setGameSpeed] = useState<1 | 2>(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(false);

  // Selection & Dragging State
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [inGameSoundSettings, setInGameSoundSettings] = useState<SoundSettings>(() => soundManager.getSettings());
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    towerType: null,
    validPlacement: false,
    x: 0, y: 0,
    gameX: 0, gameY: 0
  });

  // Tower Limit Calculation
  const getTowerLimit = (currentWave: number) => {
      const base = 8;
      const bonus = Math.floor(currentWave / 10) * 2;
      return base + bonus;
  };

  const currentTowerLimit = getTowerLimit(wave);

  // --- STATS TRACKING & POST-WAVE SUMMARY REFS & STATE ---
  const waveStatsRef = useRef({
    enemiesDefeated: 0,
    enemyTypeBreakdown: {} as Record<string, number>,
    moneyEarned: 0,
    damageDealt: 0,
    damageTaken: 0,
  });

  const totalStatsRef = useRef({
    enemiesDefeated: 0,
    enemyTypeBreakdown: {} as Record<string, number>,
  });

  const waveStartingLivesRef = useRef<number>(100);
  const totalTechPointsEarnedMatchRef = useRef<number>(0);
  const towerDamageSnapshotRef = useRef<Map<string, number>>(new Map());

  const [waveSummary, setWaveSummary] = useState<WaveSummaryData | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const waves = useRef(generateWaves(map.waves));

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  // --- HELPER FUNCTIONS ---
  const getDistance = (p1: Point, p2: Point) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getDistanceToLine = (point: Point, lineStart: Point, lineEnd: Point) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) // in case of 0 length line
        param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    }
    else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    }
    else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getDistanceToPath = (p: Point, path: Point[]) => {
    let minDist = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i+1];
      
      const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
      if (l2 === 0) {
          const dist = Math.sqrt(Math.pow(p.x - p1.x, 2) + Math.pow(p.y - p1.y, 2));
          if(dist < minDist) minDist = dist;
          continue;
      }
      
      let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      
      const projX = p1.x + t * (p2.x - p1.x);
      const projY = p1.y + t * (p2.y - p1.y);
      
      const dist = Math.sqrt(Math.pow(p.x - projX, 2) + Math.pow(p.y - projY, 2));
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  };

  // --- VISUAL GENERATION ---
  useEffect(() => {
    // 1. Generate Background Texture
    const patCanvas = document.createElement('canvas');
    patCanvas.width = 128;
    patCanvas.height = 128;
    const pCtx = patCanvas.getContext('2d');
    if (pCtx) {
      pCtx.fillStyle = map.background;
      pCtx.fillRect(0,0,128,128);
      // Add noise
      for(let i=0; i<200; i++) {
        pCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
        pCtx.fillRect(Math.random()*128, Math.random()*128, 2, 2);
        pCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        pCtx.fillRect(Math.random()*128, Math.random()*128, 1, 1);
      }
      const bgPattern = pCtx.createPattern(patCanvas, 'repeat');
      bgPatternRef.current = bgPattern;
    }

    // 2. Generate Terrain Props
    const newTerrain: TerrainProp[] = [];
    const propCount = 80;
    
    for(let i=0; i<propCount; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const y = Math.random() * CANVAS_HEIGHT;
      const distToPath = getDistanceToPath({x, y}, map.path);
      const onPath = distToPath < 45; // Path width approx
      
      let type: TerrainProp['type'] = 'ROCK';
      let color = '#444';
      let size = 10 + Math.random() * 20;
      let opacity = 0.4 + Math.random() * 0.6;
      const rotation = Math.random() * Math.PI * 2;

      if (map.id === 'ruins') {
        if (onPath) {
           type = Math.random() > 0.5 ? 'CRACK' : 'RUBBLE';
           color = '#222';
           opacity = 0.6;
           size = 10 + Math.random() * 15;
        } else {
           type = Math.random() > 0.7 ? 'CRATER' : 'RUBBLE';
           color = '#1a1a1a';
           size = 20 + Math.random() * 40;
        }
      } else if (map.id === 'wasteland') {
        if (Math.random() < 0.2) {
           type = 'SLIME';
           color = '#4ade80';
           opacity = 0.3;
           size = 15 + Math.random() * 30;
        } else {
           type = 'ROCK';
           color = '#292524';
           size = 5 + Math.random() * 15;
        }
      } else if (map.id === 'bunker') {
         if (Math.random() < 0.5) {
           type = 'PLATE';
           color = '#333';
           size = 20 + Math.random() * 20;
           opacity = 0.5;
         } else {
           type = 'CRACK'; // Cables
           color = '#000';
           opacity = 0.4;
           size = 40;
         }
      } else if (map.id === 'sector7') {
          type = Math.random() > 0.8 ? 'PLATE' : 'RUBBLE';
          color = '#334155';
          size = 10 + Math.random() * 10;
      } else if (map.id === 'canyon') {
          type = 'ROCK';
          color = '#5c2e0e';
          size = 20 + Math.random() * 30;
      }

      if (onPath && (type === 'ROCK' || type === 'PLATE')) continue;
      newTerrain.push({ x, y, size, type, rotation, color, opacity, onPath });
    }
    terrainRef.current = newTerrain;

    // 3. Generate Fog
    const fog: FogParticle[] = [];
    for(let i=0; i<15; i++) {
      fog.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 100 + Math.random() * 300,
        speed: 0.1 + Math.random() * 0.3,
        alpha: 0.02 + Math.random() * 0.04
      });
    }
    fogRef.current = fog;

  }, [map]);

  // --- LOGIC FUNCTIONS ---
  const spawnEnemy = (type: EnemyType) => {
    const stats = ENEMY_STATS[type];
    const start = map.path[0];
    const waveNum = Math.max(1, wave);
    const hpMultiplier = 1 + (Math.pow(waveNum - 1, 1.6) / 12);
    const rewardMultiplier = 1 + (Math.pow(waveNum, 0.4) * 0.1);
    const scaledHP = Math.round(stats.hp * hpMultiplier);
    const scaledReward = Math.round(stats.reward * rewardMultiplier);

    enemiesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: start.x,
      y: start.y,
      health: scaledHP,
      maxHealth: scaledHP,
      speed: stats.speed,
      pathIndex: 0,
      distanceTraveled: 0,
      reward: scaledReward,
      damageToPlayer: stats.damageToPlayer,
      color: stats.color,
      radius: stats.radius,
      onDeathSpawn: stats.onDeathSpawn,
      isHealer: stats.isHealer,
      healTimer: stats.isHealer ? 90 : undefined,
      attackRange: stats.attackRange,
      attackCooldown: stats.attackCooldown ? stats.attackCooldown + (Math.random() * 60) : undefined, // Random initial offset
      slowFactor: 1,
      burnTimer: 0,
      burnDamage: 0,
      healingReduction: 0,
      poisonDoT: 0,
      vulnerable: 0,
      armorBroken: false
    });
  };

  const spawnMinions = (parent: Enemy, spawnType: EnemyType, count: number) => {
      const stats = ENEMY_STATS[spawnType];
      const waveNum = Math.max(1, wave);
      const hpMultiplier = 1 + (Math.pow(waveNum - 1, 1.6) / 12);
      const rewardMultiplier = 1 + (Math.pow(waveNum, 0.4) * 0.1);
      const scaledHP = Math.round(stats.hp * hpMultiplier);
      const scaledReward = Math.round(stats.reward * rewardMultiplier);

      for(let i=0; i<count; i++) {
          const offset = (Math.random() - 0.5) * 20;
          enemiesRef.current.push({
              id: Math.random().toString(36).substr(2, 9),
              type: spawnType,
              x: parent.x + offset,
              y: parent.y + offset,
              health: scaledHP,
              maxHealth: scaledHP,
              speed: stats.speed,
              pathIndex: parent.pathIndex,
              distanceTraveled: parent.distanceTraveled,
              reward: scaledReward,
              damageToPlayer: stats.damageToPlayer,
              color: stats.color,
              radius: stats.radius,
              onDeathSpawn: stats.onDeathSpawn,
              isHealer: stats.isHealer,
              healTimer: stats.isHealer ? 90 : undefined,
              slowFactor: 1,
              burnTimer: 0,
              burnDamage: 0,
              healingReduction: 0,
              poisonDoT: 0,
              vulnerable: 0
          });
      }
  };

  const startNextWave = () => {
    // Allows starting if victory but in Endless mode
    if (waveActiveRef.current || gameOver || (victory && !isEndless)) return;
    
    let waveData;

    // Procedural Generation for Endless Mode OR if we ran out of pre-defined waves
    if (currentWaveIndexRef.current >= waves.current.length) {
       const nextWaveNum = currentWaveIndexRef.current + 1;
       const difficultyScaler = nextWaveNum;
       const proceduralEnemies = [];
       
       // Always some fodder
       proceduralEnemies.push({ type: EnemyType.RUNNER, count: Math.floor(15 + difficultyScaler * 1.5), spacing: 10 });
       proceduralEnemies.push({ type: EnemyType.TANK, count: Math.floor(5 + difficultyScaler * 0.8), spacing: 30 });
       
       // Periodic Bosses
       if (nextWaveNum % 3 === 0) {
           proceduralEnemies.push({ type: EnemyType.BOSS, count: Math.floor(1 + difficultyScaler / 5), spacing: 100 });
       }
       
       // Periodic Elites & Healers
       if (nextWaveNum % 5 === 0) {
           proceduralEnemies.push({ type: EnemyType.MATRYOSHKA, count: Math.floor(1 + difficultyScaler / 8), spacing: 150 });
           proceduralEnemies.push({ type: EnemyType.HEALER, count: Math.floor(2 + difficultyScaler / 6), spacing: 120 });
       }
       
       if (nextWaveNum % 4 === 0) {
           proceduralEnemies.push({ type: EnemyType.ICE_MAGE, count: Math.floor(2 + difficultyScaler / 8), spacing: 150 });
       }
       
       if (Math.random() > 0.4) {
           proceduralEnemies.push({ type: EnemyType.NINJA, count: Math.floor(1 + difficultyScaler / 6), spacing: 100 });
       }

       waveData = {
           number: nextWaveNum,
           enemies: proceduralEnemies,
           reward: 600 + (nextWaveNum * 30)
       };
    } else {
        waveData = waves.current[currentWaveIndexRef.current];
    }

    const queue: { type: EnemyType; framesUntilNext: number }[] = [];
    waveData.enemies.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        queue.push({ type: group.type, framesUntilNext: group.spacing });
      }
    });

    spawnQueueRef.current = queue;
    waveActiveRef.current = true;
    setWave(waveData.number);
    setVictory(false); // Ensure victory is cleared if we are starting a new wave
    
    // Play wave start alarm sound
    soundManager.playWaveStart();

    // Close summary modal if open
    setIsSummaryOpen(false);

    // Reset wave stats & snapshot tower damage
    waveStartingLivesRef.current = livesRef.current;
    waveStatsRef.current = {
      enemiesDefeated: 0,
      enemyTypeBreakdown: {},
      moneyEarned: 0,
      damageDealt: 0,
      damageTaken: 0,
    };
    towerDamageSnapshotRef.current = new Map(towersRef.current.map(t => [t.id, t.totalDamage]));
  };

  const forceNextWave = () => {
      if (gameOver) return;
      waveActiveRef.current = false;
      spawnQueueRef.current = [];
      currentWaveIndexRef.current++;
      startNextWave();
  }

  const onEnemyKilled = (enemy: Enemy) => {
      if ((enemy as any).isDefeated) return;
      (enemy as any).isDefeated = true;

      soundManager.playEnemyKilled();

      // Spawn currency popup floating upward in green
      if (enemy.reward > 0) {
        currencyPopupsRef.current.push({
          id: Math.random().toString(),
          x: enemy.x,
          y: enemy.y - 10,
          amount: enemy.reward,
          lifespan: 54, // ~0.9s at 60fps
          maxLifespan: 54,
          vy: -1.1,     // Smooth float upward
          vx: (Math.random() - 0.5) * 0.5 // subtle drift
        });
      }

      waveStatsRef.current.enemiesDefeated++;
      totalStatsRef.current.enemiesDefeated++;

      const typeKey = enemy.type;
      waveStatsRef.current.enemyTypeBreakdown[typeKey] = 
          (waveStatsRef.current.enemyTypeBreakdown[typeKey] || 0) + 1;
      totalStatsRef.current.enemyTypeBreakdown[typeKey] = 
          (totalStatsRef.current.enemyTypeBreakdown[typeKey] || 0) + 1;

      waveStatsRef.current.moneyEarned += enemy.reward;

      handleEnemyDeath(enemy);
  };

  const killAllEnemies = () => {
      enemiesRef.current.forEach(e => {
        if (e.health > 0) {
          e.health = 0;
          setMoney(m => m + e.reward);
          onEnemyKilled(e);
        }
      });
  }

  const handleEnemyDeath = (enemy: Enemy) => {
      if (enemy.onDeathSpawn) {
          spawnMinions(enemy, enemy.onDeathSpawn.type, enemy.onDeathSpawn.count);
      }
      if (enemy.isHealer) {
           // Burst Heal on death
           enemiesRef.current.forEach(ally => {
               if (ally.id !== enemy.id && ally.health > 0 && getDistance(enemy, ally) < 200) {
                   ally.health = Math.min(ally.maxHealth, ally.health + (ally.maxHealth * 0.15));
               }
           });
           groundEffectsRef.current.push({
               id: Math.random().toString(), x: enemy.x, y: enemy.y, radius: 200, lifespan: 15, type: 'DELAYED_HEAL', damagePerFrame: 0, healAmount: 0, slowFactor: 1
           });
      }
      // Check for hunter ammo
      towersRef.current.forEach(t => {
          if (t.type === TowerType.MONK && t.level >= 7) {
               // Global grant logic for simplicity or proximity
               if(getDistance(t, enemy) < t.range) {
                   t.ammo = Math.min(5, (t.ammo || 0) + 1);
               }
          }
      });
  }

  const applyDamage = (enemy: Enemy, amount: number) => {
      let finalDamage = amount;
      if (enemy.vulnerable && enemy.vulnerable > 0) {
          finalDamage *= 1.15;
      }
      if (enemy.armorBroken) {
          finalDamage *= 1.30;
      }
      enemy.health -= finalDamage;
      waveStatsRef.current.damageDealt += finalDamage;
      return finalDamage;
  }

  const update = () => {
    if (isPaused || gameOver || (victory && !isEndless)) return;

    frameRef.current++;
    
    // Notification fade
    if (notification) {
        setNotification(prev => prev ? { ...prev, opacity: prev.opacity - 0.01 } : null);
        if (notification.opacity <= 0) setNotification(null);
    }
    
    fogRef.current.forEach(p => {
      p.x += p.speed;
      if (p.x > CANVAS_WIDTH + p.size) p.x = -p.size;
    });

    groundEffectsRef.current.forEach(g => {
        g.lifespan--;
        if (g.type === 'DELAYED_HEAL' && g.lifespan <= 0) {
             enemiesRef.current.forEach(ally => {
                 if (ally.health > 0 && getDistance(ally, {x: g.x, y: g.y}) < g.radius) {
                     let heal = g.healAmount || 0;
                     if (ally.healingReduction) {
                         heal *= (1 - ally.healingReduction);
                     }
                     ally.health = Math.min(ally.maxHealth, ally.health + heal);
                 }
             });
        }
    });
    groundEffectsRef.current = groundEffectsRef.current.filter(g => g.lifespan > 0);

    // Update Currency Popups (Float upward with slight deceleration, lifespan tick)
    currencyPopupsRef.current.forEach(popup => {
        popup.x += popup.vx;
        popup.y += popup.vy;
        popup.vy *= 0.98; // gentle float deceleration
        popup.lifespan--;
    });
    currencyPopupsRef.current = currencyPopupsRef.current.filter(p => p.lifespan > 0);

    if (waveActiveRef.current) {
        if (spawnQueueRef.current.length > 0) {
          const nextSpawn = spawnQueueRef.current[0];
          nextSpawn.framesUntilNext--;
          if (nextSpawn.framesUntilNext <= 0) {
            spawnEnemy(nextSpawn.type);
            spawnQueueRef.current.shift();
          }
        } else if (enemiesRef.current.length === 0) {
          // Wave Completed Logic
          let currentWaveReward = 0;
          
          if (currentWaveIndexRef.current < waves.current.length) {
             currentWaveReward = waves.current[currentWaveIndexRef.current].reward;
          } else {
             // Dynamic reward for endless
             currentWaveReward = 600 + (currentWaveIndexRef.current * 20);
          }
          
          setMoney(m => m + currentWaveReward);
          waveStatsRef.current.moneyEarned += currentWaveReward;
          waveActiveRef.current = false;

          const waveNumJustFinished = wave;
          const isBoss = waveNumJustFinished % 5 === 0;
          const isFinal = currentWaveIndexRef.current >= waves.current.length - 1 && !isEndless;
          
          // Calculate Tech Points for this wave
          const baseTP = Math.max(5, Math.floor(waveNumJustFinished * 1.5));
          const livesLostThisWave = Math.max(0, waveStartingLivesRef.current - livesRef.current);
          const flawlessBonus = livesLostThisWave === 0 ? 5 : 0;
          const bossBonus = isBoss ? 15 : 0;
          let mapClearBonus = 0;
          if (isFinal) {
            const difficultyMult = map.difficulty === 'HARD' ? 3 : map.difficulty === 'MEDIUM' ? 2 : 1;
            mapClearBonus = 200 * difficultyMult;
          }
          
          const totalWaveTP = baseTP + flawlessBonus + bossBonus + mapClearBonus;
          totalTechPointsEarnedMatchRef.current += totalWaveTP;

          // Credit Tech Points directly to player profile
          if (onAddGlobalPoints) {
            onAddGlobalPoints(totalWaveTP);
          }

          // In-game notification banner
          if (isEndless && currentWaveIndexRef.current > 0 && currentWaveIndexRef.current % 10 === 0) {
            setNotification({ text: `BONUS: +${totalWaveTP} TECH POINTS`, opacity: 2.0 });
          } else {
            setNotification({ text: `WAVE ${waveNumJustFinished} CLEARED (+${totalWaveTP} TP)`, opacity: 2.0 });
          }

          // Calculate MVP Tower for this wave
          let mvpTower: WaveSummaryData['mvpTower'] = undefined;
          let maxDmg = 0;
          towersRef.current.forEach(t => {
            const startDmg = towerDamageSnapshotRef.current.get(t.id) || 0;
            const waveDmg = Math.max(0, t.totalDamage - startDmg);
            if (waveDmg > maxDmg) {
              maxDmg = waveDmg;
              mvpTower = {
                name: t.name,
                type: t.type,
                level: t.level,
                damageThisWave: waveDmg,
              };
            }
          });

          const summaryData: WaveSummaryData = {
            waveNumber: waveNumJustFinished,
            totalWaves: map.waves,
            isEndless,
            isBossWave: isBoss,
            isFinalWave: isFinal,
            mapName: map.name,
            mapDifficulty: map.difficulty,

            enemiesDefeatedWave: waveStatsRef.current.enemiesDefeated,
            enemiesDefeatedTotal: totalStatsRef.current.enemiesDefeated,
            enemyTypeBreakdown: { ...waveStatsRef.current.enemyTypeBreakdown },

            techPointsEarnedWave: totalWaveTP,
            techPointsBreakdown: {
              base: baseTP,
              flawlessBonus,
              bossBonus,
              mapClearBonus: mapClearBonus > 0 ? mapClearBonus : undefined,
            },
            totalTechPointsEarnedMatch: totalTechPointsEarnedMatchRef.current,
            totalBankedTechPoints: (currentTechPoints || 0) + totalTechPointsEarnedMatchRef.current,

            currentLives: livesRef.current,
            maxLives: 100,
            livesLostThisWave,

            moneyEarnedWave: waveStatsRef.current.moneyEarned,
            currentMoney: money + currentWaveReward,
            waveDamageDealt: waveStatsRef.current.damageDealt,

            mvpTower,
          };

          setWaveSummary(summaryData);
          setIsSummaryOpen(true);
          currentWaveIndexRef.current++;

          // Play victory fanfare chime
          soundManager.playVictory();

          if (isFinal) {
            setVictory(true);
            hasWonRef.current = true;
            return;
          }
        }
    }

    enemiesRef.current.forEach(enemy => {
      if (enemy.health <= 0) return;
      
      // -- Enemy Abilities (Ice Mage) --
      if (enemy.type === EnemyType.ICE_MAGE && enemy.attackCooldown !== undefined) {
          enemy.attackCooldown--;
          if (enemy.attackCooldown <= 0) {
              // Find a tower
              const targets = towersRef.current.filter(t => getDistance(enemy, t) <= (enemy.attackRange || 150));
              if (targets.length > 0) {
                   // Attack random target in range
                   const target = targets[Math.floor(Math.random() * targets.length)];
                   
                   // Apply debuff immediately (or via projectile, but instant is clearer for this mechanic)
                   target.frozenTimer = 180; // 3 seconds
                   enemy.attackCooldown = 180; // Reset
                   
                   // Visual Projectile for effect
                   projectilesRef.current.push({
                       id: Math.random().toString(),
                       x: enemy.x, y: enemy.y,
                       endX: target.x, endY: target.y,
                       velocity: {x:0, y:0}, speed: 5, damage: 0,
                       color: '#3b82f6', radius: 4, type: 'ICE_BOLT',
                       pierce: 0, lifespan: 20, targetId: null
                   });
              }
          }
      }

      if (enemy.frozen && enemy.frozen > 0) {
          enemy.frozen--;
          return; 
      }

      if (enemy.vulnerable && enemy.vulnerable > 0) {
          enemy.vulnerable--;
      }

      let slowed = false;
      groundEffectsRef.current.forEach(ge => {
          if (ge.type === 'ACID_POOL' || ge.type === 'FIRE_POOL') {
             if (getDistance(enemy, ge) < (ge.radius + enemy.radius)) {
                 if (ge.type === 'ACID_POOL') slowed = true;
                 applyDamage(enemy, ge.damagePerFrame);
                 if (enemy.health <= 0) {
                     setMoney(m => m + enemy.reward);
                     onEnemyKilled(enemy);
                 }
             }
          }
      });
      enemy.slowFactor = slowed ? 0.5 : 1; 

      if (enemy.burnTimer && enemy.burnTimer > 0) {
          enemy.burnTimer--;
          if (enemy.burnTimer % 30 === 0) {
              const dmg = enemy.burnDamage || 0;
              applyDamage(enemy, dmg);
              if (enemy.health <= 0) {
                 setMoney(m => m + enemy.reward);
                 onEnemyKilled(enemy);
              }
          }
          if (enemy.burnTimer <= 0) {
              enemy.healingReduction = 0;
          }
      }

      if (enemy.poisonDoT && enemy.poisonDoT > 0) {
          if (frameRef.current % 60 === 0) {
              const damage = enemy.maxHealth * enemy.poisonDoT;
              applyDamage(enemy, damage);
              if (enemy.health <= 0) {
                 setMoney(m => m + enemy.reward);
                 onEnemyKilled(enemy);
              }
          }
      }

      if (enemy.isHealer) {
          if (enemy.healTimer === undefined) enemy.healTimer = 90;
          enemy.healTimer--;
          
          if (enemy.healTimer <= 0) {
              enemy.healTimer = 90; 
              enemiesRef.current.forEach(ally => {
                  if (ally.id !== enemy.id && ally.health > 0 && ally.health < ally.maxHealth) {
                      const dist = getDistance(enemy, ally);
                      if (dist <= 200) {
                          let healAmount = ally.maxHealth * 0.05;
                          if (ally.healingReduction) healAmount *= (1 - ally.healingReduction);
                          ally.health = Math.min(ally.maxHealth, ally.health + healAmount);
                      }
                  }
              });
              const baseSelfHeal = enemy.maxHealth * 0.05;
              const missingHp = enemy.maxHealth - enemy.health;
              let totalSelfHeal = baseSelfHeal + (missingHp * 0.01);
              if (enemy.healingReduction) totalSelfHeal *= (1 - enemy.healingReduction);
              if (enemy.health < enemy.maxHealth) {
                  enemy.health = Math.min(enemy.maxHealth, enemy.health + totalSelfHeal);
              }
          }
      }

      const targetNode = map.path[enemy.pathIndex + 1];
      if (!targetNode) return; 

      const dx = targetNode.x - enemy.x;
      const dy = targetNode.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const effectiveSpeed = enemy.speed * (enemy.slowFactor || 1);

      if (dist < effectiveSpeed) {
        enemy.x = targetNode.x;
        enemy.y = targetNode.y;
        enemy.pathIndex++;
        enemy.distanceTraveled += dist;
        
        if (enemy.pathIndex >= map.path.length - 1) {
           enemy.health = 0; 
           (enemy as any).isDefeated = true;
           
           // NINJA EFFECT: Paralyze towers if reaches end
           if (enemy.type === EnemyType.NINJA) {
               towersRef.current.forEach(t => t.stunnedTimer = 120); // 2 seconds global stun
               setNotification({ text: "SYSTEM CRITICAL: TOWERS PARALYZED", opacity: 2.0 });
           }

           const damage = enemy.damageToPlayer || 1;
           livesRef.current -= damage;
           waveStatsRef.current.damageTaken += damage;
           setLives(Math.max(0, livesRef.current));
           
           if (livesRef.current <= 0 && !gameOver) {
               setGameOver(true);
           }
        }
      } else {
        enemy.x += (dx / dist) * effectiveSpeed;
        enemy.y += (dy / dist) * effectiveSpeed;
        enemy.distanceTraveled += effectiveSpeed;
      }
    });

    const activeEnemies = enemiesRef.current.filter(e => e.health > 0);
    enemiesRef.current = activeEnemies;

    // Radar Logic
    towersRef.current.forEach(t => {
        t.isBuffed = false; 
    });

    towersRef.current.filter(t => t.type === TowerType.RADAR).forEach(radar => {
        towersRef.current.forEach(target => {
            if (target !== radar && getDistance(radar, target) <= radar.range) {
                target.isBuffed = true;
            }
        })
    });

    towersRef.current.forEach(tower => {
      if (tower.type === TowerType.RADAR) return;
      
      // Handle Debuffs
      if (tower.stunnedTimer && tower.stunnedTimer > 0) {
          tower.stunnedTimer--;
          return; // Cannot attack
      }

      // Apply Radar Multipliers dynamically
      let damageMult = 1.0;
      let speedMult = 1.0;
      let rangeMult = 1.0;

      if (tower.isBuffed) {
          rangeMult += 0.15;
          const buffingRadars = towersRef.current.filter(r => r.type === TowerType.RADAR && getDistance(r, tower) <= r.range);
          const hasMaxRadar = buffingRadars.some(r => r.level >= 7);
          
          if (hasMaxRadar) {
              damageMult += 0.15;
              speedMult += 0.15;
          }
      }

      // Apply Ice Mage Slow
      if (tower.frozenTimer && tower.frozenTimer > 0) {
          tower.frozenTimer--;
          speedMult *= 0.8; // 20% Slower
      }

      const effectiveRange = tower.range * rangeMult;
      
      if (tower.type === TowerType.TURRET && tower.level >= 7) {
          if (!tower.rampUpMultiplier) tower.rampUpMultiplier = 1.0;
      }
      if (tower.cooldownTimer > 0) {
        tower.cooldownTimer--;
      }

      if (tower.type === TowerType.MONK && tower.level >= 7) {
          const activeArrows = projectilesRef.current.filter(p => p.ownerId === tower.id && p.type === 'ARROW').length;
          if (activeArrows >= 5) return; 
          if ((tower.ammo || 0) > 0) {
               if (tower.cooldownTimer > 20) tower.cooldownTimer = 0;
               if (tower.cooldownTimer > 0) return;
          } else {
               if (tower.activeProjectileId) {
                   const exists = projectilesRef.current.some(p => p.id === tower.activeProjectileId);
                   if (exists) return; 
                   tower.activeProjectileId = null;
               }
               if (tower.cooldownTimer > 0) return;
          }
      } else if (tower.type === TowerType.MONK) {
          if (tower.activeProjectileId && tower.cooldownTimer > 0) {
             const exists = projectilesRef.current.some(p => p.id === tower.activeProjectileId);
             if (exists) return; 
             tower.activeProjectileId = null;
         }
         if (tower.cooldownTimer > 0) return;
      } else {
         if (tower.cooldownTimer > 0) return;
      }

      const enemiesInRange = enemiesRef.current.filter(e => {
        return getDistance(e, tower) <= effectiveRange;
      });

      if (enemiesInRange.length > 0) {
        // Target Sorting
        enemiesInRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
        const target = enemiesInRange[0];
        const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        tower.rotation = angle;

        if (tower.type === TowerType.TURRET && tower.level >= 7) {
             tower.rampUpMultiplier = Math.min(1.5, (tower.rampUpMultiplier || 1.0) + 0.02);
        }
        
        let effectiveDamage = Math.round(tower.damage * damageMult * (tower.rampUpMultiplier || 1));
        let effectiveCooldown = tower.cooldown / speedMult;
        if (tower.type === TowerType.TURRET && tower.level >= 7) {
            effectiveCooldown = Math.max(5, effectiveCooldown / (tower.rampUpMultiplier||1));
        }

        if (tower.type === TowerType.TESLA) {
           tower.cooldownTimer = effectiveCooldown;
           const chain: Enemy[] = [target];
           let current = target;
           const bounceRange = 180; 
           const maxBounces = tower.level >= 7 ? 7 : 3;
           
           for(let i=0; i<maxBounces; i++) {
               const pool = enemiesRef.current.filter(e => 
                   e.health > 0 && 
                   !chain.includes(e) && 
                   getDistance(current, e) <= bounceRange
               );
               if (pool.length === 0) break;
               pool.sort((a, b) => getDistance(current, a) - getDistance(current, b));
               chain.push(pool[0]);
               current = pool[0];
           }

           chain.forEach(e => {
               applyDamage(e, effectiveDamage);
               tower.totalDamage += effectiveDamage; // Add Damage Stat

               if (tower.level >= 7) {
                   e.frozen = 45;
               }
               if (e.health <= 0) {
                   setMoney(m => m + e.reward);
                   onEnemyKilled(e);
               }
           });

           projectilesRef.current.push({
             id: Math.random().toString(), ownerId: tower.id,
             x: tower.x, y: tower.y, targetId: target.id, chainIds: chain.map(e => e.id),
             velocity: {x:0, y:0}, speed: 0, damage: 0, color: tower.color, radius: 0, type: 'LIGHTNING', pierce: 0, lifespan: 45 
           });
        } 
        else if (tower.type === TowerType.FLAMETHROWER) {
            if (tower.burstCount === undefined) tower.burstCount = 0;
            tower.cooldownTimer = effectiveCooldown;
            const spread = 0.4; 
            const randomizedAngle = angle + (Math.random() * spread - spread/2);

            // Healing Reduction Scaling
            const healRed = Math.min(0.9, 0.3 + ((tower.level - 1) * 0.1));

            projectilesRef.current.push({
                 id: Math.random().toString(), ownerId: tower.id, // Track owner for damage
                 x: tower.x, y: tower.y, targetId: null,
                 velocity: { x: Math.cos(randomizedAngle) * 5, y: Math.sin(randomizedAngle) * 5 }, 
                 speed: 5, damage: effectiveDamage,
                 color: tower.level >= 7 ? '#3b82f6' : '#ff5500',
                 radius: 5, type: 'FLAME', pierce: 99, lifespan: 30, hitIds: [], 
                 isBlueFire: tower.level >= 7,
                 healingReduction: healRed 
            });
            tower.burstCount++;
            if (tower.burstCount >= 10) {
                tower.cooldownTimer = 30 / speedMult; 
                tower.burstCount = 0;
            }
        }
        else if (tower.type === TowerType.SHOCKWAVE) {
             tower.cooldownTimer = effectiveCooldown;
             
             // AOE Effect
             enemiesInRange.forEach(e => {
                 applyDamage(e, effectiveDamage);
                 tower.totalDamage += effectiveDamage;
                 e.frozen = 30; // 0.5s Stun
                 if (tower.level >= 7) e.armorBroken = true;
                 
                 if (e.health <= 0) {
                     setMoney(m => m + e.reward);
                     handleEnemyDeath(e);
                 }
             });

             // Visual Ripple
             groundEffectsRef.current.push({
                 id: Math.random().toString(), type: 'SHOCKWAVE', x: tower.x, y: tower.y,
                 radius: effectiveRange, lifespan: 15, damagePerFrame: 0, slowFactor: 0
             });
        }
        else if (tower.type === TowerType.MORTAR) {
             tower.cooldownTimer = effectiveCooldown;
             
             // PREDICTION LOGIC
             const dist = getDistance(tower, target);
             const speed = 4;
             const travelTime = dist / speed; // Frames to arrive
             
             let predX = target.x;
             let predY = target.y;
             
             // Simple linear prediction along path direction
             const targetNode = map.path[target.pathIndex + 1];
             if (targetNode) {
                 const dx = targetNode.x - target.x;
                 const dy = targetNode.y - target.y;
                 const d = Math.sqrt(dx*dx + dy*dy);
                 if (d > 0) {
                     // How far they will move
                     const moveDist = target.speed * (target.slowFactor || 1) * travelTime;
                     // We clamp prediction vaguely to path vector
                     predX += (dx/d) * moveDist;
                     predY += (dy/d) * moveDist;
                 }
             }

             projectilesRef.current.push({
                 id: Math.random().toString(), ownerId: tower.id,
                 x: tower.x, y: tower.y, targetId: null, 
                 endX: predX, endY: predY, // Targeted Location
                 velocity: { x: 0, y: 0 }, 
                 speed: speed, damage: effectiveDamage,
                 color: '#71717a', radius: 6, type: 'MORTAR_SHELL', 
                 pierce: 0, lifespan: 120, splashRadius: 100,
                 isExplosive: tower.level >= 7 // Napalm flag
            });
        }
        else if (tower.type === TowerType.CHEMIST) {
             tower.cooldownTimer = effectiveCooldown;
             projectilesRef.current.push({
                 id: Math.random().toString(), ownerId: tower.id,
                 x: tower.x, y: tower.y, targetId: null, 
                 endX: target.x + (Math.random() * 20 - 10), endY: target.y + (Math.random() * 20 - 10),
                 velocity: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 }, 
                 speed: 6, damage: effectiveDamage,
                 color: tower.level >= 7 ? '#14532d' : '#bef264', radius: 6, type: 'GLUE_BOMB', pierce: 1, lifespan: 60
            });
        }
        else if (tower.type === TowerType.LASER) {
             tower.cooldownTimer = effectiveCooldown;
             if (tower.level >= 7) tower.laserMode = tower.laserMode === 'RED' ? 'BLUE' : 'RED';
             const endX = tower.x + Math.cos(angle) * 1000;
             const endY = tower.y + Math.sin(angle) * 1000;
             const beamColor = tower.level >= 7 ? (tower.laserMode === 'RED' ? '#ef4444' : '#3b82f6') : '#00ffff';
             
             projectilesRef.current.push({
                 id: Math.random().toString(), x: tower.x, y: tower.y, endX, endY, targetId: null,
                 velocity: {x:0, y:0}, speed: 0, damage: effectiveDamage, color: beamColor, radius: tower.level >= 7 ? 8 : 4,
                 type: 'BEAM', pierce: 999, lifespan: 30, laserColor: tower.laserMode
             });

             enemiesRef.current.forEach(enemy => {
                 const dist = getDistanceToLine({x: enemy.x, y: enemy.y}, {x: tower.x, y: tower.y}, {x: endX, y: endY});
                 if (dist < (enemy.radius + (tower.level >= 7 ? 8 : 5))) { 
                     applyDamage(enemy, effectiveDamage);
                     tower.totalDamage += effectiveDamage; // Add Damage Stat
                     
                     if (tower.level >= 7) {
                         if (tower.laserMode === 'RED') {
                             enemy.burnTimer = 90; enemy.burnDamage = 10;
                         } else {
                             groundEffectsRef.current.push({
                                 id: Math.random().toString(), x: enemy.x, y: enemy.y, radius: 1, lifespan: 90, type: 'ACID_POOL', damagePerFrame: 0, slowFactor: 0.5
                             });
                         }
                     }
                     if (enemy.health <= 0) {
                        setMoney(m => m + enemy.reward);
                        handleEnemyDeath(enemy);
                     }
                 }
             });
        }
        else if (tower.type === TowerType.MONK) {
             const useAmmo = tower.level >= 7 && (tower.ammo || 0) > 0;
             let pid = undefined;
             if (useAmmo) {
                 tower.ammo = (tower.ammo || 0) - 1;
                 tower.cooldownTimer = 20 / speedMult; 
             } else {
                 tower.cooldownTimer = effectiveCooldown;
                 pid = Math.random().toString();
                 tower.activeProjectileId = pid; 
                 tower.cooldownTimer = 9999; 
             }

             projectilesRef.current.push({
                 id: pid || Math.random().toString(), ownerId: tower.id, x: tower.x, y: tower.y, targetId: target.id,
                 velocity: { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 },
                 speed: 3, acceleration: 0.15, damage: effectiveDamage,
                 color: tower.level >= 7 ? '#e11d48' : '#ff99aa', radius: 4, type: 'ARROW',
                 pierce: tower.level >= 7 ? 3 : 1, lifespan: 300
             });
        } 
        else {
            tower.cooldownTimer = effectiveCooldown;
            const speed = 8;
            projectilesRef.current.push({
              id: Math.random().toString(), ownerId: tower.id, x: tower.x, y: tower.y,
              targetId: (tower.type === TowerType.SNIPER || tower.isBuffed) ? target.id : null,
              velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
              speed: speed, damage: effectiveDamage,
              color: tower.type === TowerType.TURRET && tower.level >= 7 && (tower.rampUpMultiplier||1) > 1.2 ? '#ef4444' : '#ffff00',
              radius: 3, type: 'BULLET', pierce: tower.type === TowerType.SNIPER && tower.level >= 7 ? 3 : 1, lifespan: 60,
              isExplosive: tower.type === TowerType.SURVIVOR && tower.level >= 7,
              isHoming: tower.isBuffed 
            });
        }
      } else {
          if (tower.type === TowerType.TURRET && tower.level >= 7) tower.rampUpMultiplier = 1.0;
      }
    });

    projectilesRef.current.forEach(p => {
      p.lifespan--;
      
      // Ice Bolt for Mage
      if (p.type === 'ICE_BOLT') {
          if (p.endX !== undefined && p.endY !== undefined) {
              const dx = p.endX - p.x;
              const dy = p.endY - p.y;
              const dist = Math.sqrt(dx*dx+dy*dy);
              if (dist < p.speed) {
                  p.lifespan = 0; // Reached target visually
              } else {
                  p.x += (dx/dist) * p.speed;
                  p.y += (dy/dist) * p.speed;
              }
          }
          return;
      }
      
      if (p.type === 'BEAM' || p.type === 'LIGHTNING') return;

      if (p.type === 'MORTAR_SHELL' && p.endX && p.endY) {
          // Arc movement simulation
          const dx = p.endX - p.x;
          const dy = p.endY - p.y;
          const dist = Math.sqrt(dx*dx+dy*dy);
          
          if (dist < p.speed) {
              // DETONATE
              p.lifespan = 0;
              groundEffectsRef.current.push({
                  id: Math.random().toString(), type: 'FIRE_POOL', x: p.endX, y: p.endY,
                  radius: p.splashRadius || 80, lifespan: 15, damagePerFrame: 0, slowFactor: 0 
              });
              
              if (p.isExplosive) {
                  // Napalm
                  groundEffectsRef.current.push({
                      id: Math.random().toString(), type: 'FIRE_POOL', x: p.endX, y: p.endY,
                      radius: (p.splashRadius || 80) * 0.8, lifespan: 240, damagePerFrame: 1, slowFactor: 0.8
                  });
              }

              // Splash Damage
              enemiesRef.current.forEach(e => {
                   if (getDistance(e, {x: p.endX!, y: p.endY!}) <= (p.splashRadius || 80)) {
                       applyDamage(e, p.damage);
                       if (p.ownerId) {
                           const owner = towersRef.current.find(t => t.id === p.ownerId);
                           if (owner) owner.totalDamage += p.damage;
                       }
                       if (e.health <= 0) {
                           setMoney(m => m + e.reward);
                           handleEnemyDeath(e);
                       }
                   }
              });
              return;
          } else {
               p.x += (dx/dist) * p.speed;
               p.y += (dy/dist) * p.speed;
          }
          return;
      }

      if (p.type === 'GLUE_BOMB') {
          if (p.endX !== undefined && p.endY !== undefined) {
             const distToEnd = Math.hypot(p.x - p.endX, p.y - p.endY);
             if (distToEnd < 10) {
                 const isLvl10 = p.color === '#14532d';
                 groundEffectsRef.current.push({
                     id: Math.random().toString(), x: p.endX, y: p.endY, radius: isLvl10 ? 60 : 40, lifespan: 180, 
                     type: 'ACID_POOL', damagePerFrame: 0.1, slowFactor: 0.5, isDarkPoison: isLvl10
                 });
                 p.lifespan = 0;
                 return;
             }
             const angle = Math.atan2(p.endY - p.y, p.endX - p.x);
             p.x += Math.cos(angle) * p.speed;
             p.y += Math.sin(angle) * p.speed;
             return; 
          }
      }

      if (p.type === 'ARROW' || p.isHoming) {
          let target = enemiesRef.current.find(e => e.id === p.targetId);
          if (!target && p.isHoming) {
              let minDist = Infinity;
              let closest: Enemy | null = null;
              for(const e of enemiesRef.current) {
                  const d = getDistance(p, e);
                  if (d < minDist) {
                      minDist = d;
                      closest = e;
                  }
              }
              if (closest && minDist < 300) {
                  p.targetId = closest.id;
                  target = closest;
              }
          }

          if (target) {
              const angle = Math.atan2(target.y - p.y, target.x - p.x);
              p.velocity.x = Math.cos(angle) * p.speed;
              p.velocity.y = Math.sin(angle) * p.speed;
          }
          if (p.acceleration) {
              p.speed += p.acceleration;
              // Re-normalize
              const curA = Math.atan2(p.velocity.y, p.velocity.x);
              p.velocity.x = Math.cos(curA) * p.speed;
              p.velocity.y = Math.sin(curA) * p.speed;
          }
      }

      p.x += p.velocity.x;
      p.y += p.velocity.y;

      for (let i = 0; i < enemiesRef.current.length; i++) {
        if (p.pierce <= 0) break;
        const enemy = enemiesRef.current[i];
        if (getDistance(p, enemy) < (enemy.radius + p.radius)) {
            if (p.type === 'FLAME') {
                if (p.hitIds && p.hitIds.includes(enemy.id)) continue; 
                p.hitIds?.push(enemy.id);
                
                enemy.burnTimer = 180; 
                enemy.burnDamage = 5; 
                if (p.healingReduction) enemy.healingReduction = p.healingReduction;
                else enemy.healingReduction = p.isBlueFire ? 0.7 : 0.3; 
            }
            if (p.type === 'BULLET' && p.pierce > 1) {
                enemy.vulnerable = 180; 
            }
            let actualDamage = p.damage;
            if (p.type === 'ARROW' && p.acceleration && p.speed > 3) {
                actualDamage += (p.speed * 10); 
            }

            applyDamage(enemy, actualDamage);
            p.pierce--;

            // TRACK DAMAGE
            if (p.ownerId) {
                const owner = towersRef.current.find(t => t.id === p.ownerId);
                if (owner) owner.totalDamage += actualDamage;
            }

            if (p.isExplosive) {
                 groundEffectsRef.current.push({
                     id: Math.random().toString(), x: enemy.x, y: enemy.y, radius: 30, lifespan: 300, type: 'FIRE_POOL', damagePerFrame: 0.5, slowFactor: 1
                 });
                 p.isExplosive = false;
            }
            
            if (p.ownerId && p.type === 'ARROW') {
                const ownerTower = towersRef.current.find(t => t.id === p.ownerId);
                if (ownerTower && p.id === ownerTower.activeProjectileId) {
                     if (p.pierce <= 0) {
                         ownerTower.activeProjectileId = null;
                         ownerTower.cooldownTimer = 5; 
                     }
                }
            }

            if (enemy.health <= 0 && enemy.health + actualDamage > 0) {
                setMoney(m => m + enemy.reward);
                onEnemyKilled(enemy);
                if (p.type === 'ARROW' && p.ownerId) {
                    const ownerTower = towersRef.current.find(t => t.id === p.ownerId);
                    if (ownerTower && ownerTower.level >= 7) {
                        ownerTower.ammo = Math.min(5, (ownerTower.ammo || 0) + 1);
                    }
                }
            }
            
            if ((p.type === 'BULLET' || p.type === 'ARROW') && p.pierce <= 0) {
               p.lifespan = 0; 
            }
        }
      }
    });
    
    projectilesRef.current.forEach(p => {
        if (p.lifespan <= 0 && p.ownerId && p.type === 'ARROW') {
             const ownerTower = towersRef.current.find(t => t.id === p.ownerId);
             if (ownerTower && ownerTower.activeProjectileId === p.id) {
                 ownerTower.activeProjectileId = null;
                 ownerTower.cooldownTimer = 30;
             }
        }
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.lifespan > 0);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // 1. Base Background with Texture
    if (bgPatternRef.current) {
       ctx.fillStyle = bgPatternRef.current;
    } else {
       ctx.fillStyle = map.background;
    }
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Tactical Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for(let x=0; x<CANVAS_WIDTH; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
    for(let y=0; y<CANVAS_HEIGHT; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

    // 3. Floor Props (Under Path)
    terrainRef.current.forEach(prop => {
        if (prop.type === 'SLIME' || prop.type === 'CRACK' || prop.type === 'PLATE') {
            ctx.save();
            ctx.translate(prop.x, prop.y);
            ctx.rotate(prop.rotation);
            ctx.globalAlpha = prop.opacity;
            ctx.fillStyle = prop.color;
            
            if (prop.type === 'SLIME') {
                ctx.shadowColor = prop.color;
                ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.ellipse(0, 0, prop.size, prop.size * 0.6, 0, 0, Math.PI*2); ctx.fill();
            } else if (prop.type === 'PLATE') {
                ctx.fillRect(-prop.size/2, -prop.size/2, prop.size, prop.size);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(-prop.size/2 + 2, -prop.size/2 + 2, 2, 2); // Rivet
            } else { // Crack
                ctx.strokeStyle = prop.color;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-prop.size, 0); ctx.lineTo(prop.size, 0); ctx.stroke();
            }
            ctx.restore();
        }
    });

    // 4. Path Rendering
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Road Bed / Border
    ctx.beginPath();
    ctx.lineWidth = 48;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; // Shadow
    if (map.path.length > 0) {
        ctx.moveTo(map.path[0].x + 4, map.path[0].y + 4);
        for (let i = 1; i < map.path.length; i++) ctx.lineTo(map.path[i].x + 4, map.path[i].y + 4);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 42;
    ctx.strokeStyle = map.id === 'ruins' ? '#1a1a1a' : map.id === 'wasteland' ? '#4a3e30' : '#111'; // Road border color
    if (map.path.length > 0) {
        ctx.moveTo(map.path[0].x, map.path[0].y);
        for (let i = 1; i < map.path.length; i++) ctx.lineTo(map.path[i].x, map.path[i].y);
    }
    ctx.stroke();

    // Road Surface
    ctx.beginPath();
    ctx.lineWidth = 34;
    ctx.strokeStyle = map.id === 'ruins' ? '#333' : map.id === 'wasteland' ? '#5d4037' : '#222';
    if (map.path.length > 0) {
        ctx.moveTo(map.path[0].x, map.path[0].y);
        for (let i = 1; i < map.path.length; i++) ctx.lineTo(map.path[i].x, map.path[i].y);
    }
    ctx.stroke();

    // Path Details
    ctx.beginPath();
    if (map.id === 'ruins') {
        ctx.setLineDash([20, 30]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#555';
    } else if (map.id === 'wasteland') {
        ctx.setLineDash([]);
        ctx.lineWidth = 24;
        ctx.strokeStyle = '#4e342e'; // Tyre tracks middle
    } else {
        ctx.setLineDash([5, 5]); // Hazard lines
        ctx.lineWidth = 30;
        ctx.strokeStyle = 'rgba(255,255,0,0.05)';
    }
    if (map.path.length > 0) {
        ctx.moveTo(map.path[0].x, map.path[0].y);
        for (let i = 1; i < map.path.length; i++) ctx.lineTo(map.path[i].x, map.path[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Top Props (Objects that sit on top of ground but below units)
    terrainRef.current.forEach(prop => {
        if (prop.type !== 'SLIME' && prop.type !== 'CRACK' && prop.type !== 'PLATE') {
             // Simple distance check to ensure we don't draw obstacles ON the path unless intended
             const dist = getDistanceToPath({x: prop.x, y: prop.y}, map.path);
             if (dist > 30 || prop.onPath) {
                 ctx.save();
                 ctx.translate(prop.x, prop.y);
                 ctx.rotate(prop.rotation);
                 ctx.globalAlpha = prop.opacity;
                 
                 if (prop.type === 'ROCK' || prop.type === 'RUBBLE') {
                     ctx.fillStyle = prop.color;
                     ctx.beginPath(); 
                     ctx.moveTo(-prop.size/2, -prop.size/2);
                     ctx.lineTo(prop.size/2, -prop.size/3);
                     ctx.lineTo(prop.size/3, prop.size/2);
                     ctx.lineTo(-prop.size/2, prop.size/3);
                     ctx.fill();
                     ctx.fillStyle = 'rgba(0,0,0,0.3)'; // Shade side
                     ctx.beginPath();
                     ctx.moveTo(-prop.size/2, -prop.size/2);
                     ctx.lineTo(0, 0);
                     ctx.lineTo(-prop.size/2, prop.size/3);
                     ctx.fill();
                 } else if (prop.type === 'CRATER') {
                     ctx.fillStyle = '#111';
                     ctx.beginPath(); ctx.arc(0,0, prop.size, 0, Math.PI*2); ctx.fill();
                     ctx.strokeStyle = '#222'; ctx.lineWidth=2; ctx.stroke();
                 }
                 ctx.restore();
             }
        }
    });

    // Ground Effects
    groundEffectsRef.current.forEach(g => drawGroundEffect({ctx, frame: frameRef.current}, g));

    // 6. Game Entities
    towersRef.current.forEach(t => drawTower({ctx, frame: frameRef.current}, t));
    enemiesRef.current.forEach(e => drawEnemy({ctx, frame: frameRef.current}, e));
    projectilesRef.current.forEach(p => drawProjectile({ctx, frame: frameRef.current}, p, enemiesRef.current));

    // 6.5 Floating Currency Popups (Fade-in, float up, fade-out in vibrant green)
    if (currencyPopupsRef.current.length > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        currencyPopupsRef.current.forEach(popup => {
            const age = popup.maxLifespan - popup.lifespan; // frames elapsed
            
            // Fade In during first 8 frames, stay full, Fade Out during last 18 frames
            let alpha = 1.0;
            const fadeInFrames = 8;
            const fadeOutFrames = 18;

            if (age < fadeInFrames) {
                alpha = age / fadeInFrames;
            } else if (popup.lifespan < fadeOutFrames) {
                alpha = popup.lifespan / fadeOutFrames;
            }

            // Gentle scale effect on spawn (starts slightly scaled up then settles)
            const scale = age < 8 ? 1.0 + (1 - age / 8) * 0.35 : 1.0;

            ctx.save();
            ctx.translate(popup.x, popup.y);
            ctx.scale(scale, scale);
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

            // Green glow backdrop
            ctx.font = '900 15px "Courier New", monospace';
            ctx.shadowColor = 'rgba(34, 197, 94, 0.9)'; // emerald-500 neon glow
            ctx.shadowBlur = 8;

            // Dark outline for high readability on any map background
            ctx.strokeStyle = 'rgba(0, 20, 5, 0.95)';
            ctx.lineWidth = 3.5;
            ctx.lineJoin = 'round';
            ctx.strokeText(`+$${popup.amount}`, 0, 0);

            // Bright vivid neon green text fill
            ctx.fillStyle = '#4ade80'; // Emerald/Lime bright green
            ctx.fillText(`+$${popup.amount}`, 0, 0);

            ctx.restore();
        });
        ctx.restore();
    }

    // 7. Drifting Fog Layer
    fogRef.current.forEach(f => {
        ctx.fillStyle = map.id === 'wasteland' ? `rgba(100, 255, 100, ${f.alpha})` : `rgba(200, 200, 200, ${f.alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 8. Drag Ghost & UI
    if (dragState.isDragging && dragState.towerType && dragState.gameX > 0) {
      const def = getTowerStats(dragState.towerType);
      
      // Global Range Visualization
      if (def.range > 1200) {
         ctx.fillStyle = dragState.validPlacement ? 'rgba(200, 255, 200, 0.05)' : 'rgba(255, 100, 100, 0.05)';
         ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
         
         ctx.beginPath();
         ctx.arc(dragState.gameX, dragState.gameY, 30, 0, Math.PI*2);
         ctx.strokeStyle = dragState.validPlacement ? '#fff' : '#f00';
         ctx.lineWidth = 2;
         ctx.stroke();
      } else {
          ctx.beginPath();
          ctx.arc(dragState.gameX, dragState.gameY, def.range || 100, 0, Math.PI * 2);
          ctx.fillStyle = dragState.validPlacement ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 0, 0, 0.2)';
          ctx.fill();
          ctx.strokeStyle = dragState.validPlacement ? '#fff' : '#f00';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
      }
      
      ctx.globalAlpha = 0.7;
      drawTower({ctx, frame: frameRef.current}, {
          ...def,
          id: 'ghost',
          x: dragState.gameX,
          y: dragState.gameY,
          rotation: 0,
          level: 1,
          type: dragState.towerType,
          range: def.range || 100,
          damage: 0, cooldown: 0, cooldownTimer: 0, cost: 0, color: def.color || '#fff', name: '', description: '', totalDamage: 0
      }, true);
      ctx.globalAlpha = 1.0;
    }

    if (selectedTowerId) {
      const t = towersRef.current.find(tow => tow.id === selectedTowerId);
      if (t) {
        if (t.range > 1200) {
            // Global selection visualization
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);
        } else {
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
      }
    }
  };

  // Game Loop Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Loop multiple times for speed up
      for(let i=0; i<gameSpeed; i++) {
          update();
      }
      draw(ctx);
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameOver, victory, map, dragState, selectedTowerId, upgrades, gameSpeed, isEndless, notification]); 

  // --- INTERACTION HANDLERS (DRAG & DROP) ---

  const getGameCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1 };
    const rect = canvas.getBoundingClientRect();
    
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return { x: -1, y: -1 };
    }

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const checkPlacementValidity = (x: number, y: number) => {
    // 1. Check Tower Limit
    if (towersRef.current.length >= currentTowerLimit) return false;

    // 2. Check Boundaries
    if (x < 20 || x > CANVAS_WIDTH - 20 || y < 20 || y > CANVAS_HEIGHT - 20) return false;
    
    // 3. Check Collision with Towers
    const collisionWithTower = towersRef.current.some(t => getDistance(t, {x, y}) < 40);
    if (collisionWithTower) return false;
    
    // 4. Check Path Collision
    const distToPath = getDistanceToPath({x, y}, map.path);
    if (distToPath < 35) return false;

    return true;
  };

  const handlePointerDown = (e: React.PointerEvent, type: TowerType) => {
    e.preventDefault();
    if (towersRef.current.length >= currentTowerLimit) return; // Prevent drag if limit reached
    
    const stats = getTowerStats(type);
    if (money < stats.cost) return;

    const { x, y } = getGameCoords(e.clientX, e.clientY);
    setDragState({
      isDragging: true,
      towerType: type,
      validPlacement: false,
      x: e.clientX,
      y: e.clientY,
      gameX: x,
      gameY: y
    });
    setSelectedTowerId(null);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!dragState.isDragging) return;
      
      const touchOffset = e.pointerType === 'touch' ? -80 : 0;
      const targetY = e.clientY + touchOffset;

      const gameCoords = getGameCoords(e.clientX, targetY);
      const isOverCanvas = gameCoords.x !== -1;
      const isValid = isOverCanvas && checkPlacementValidity(gameCoords.x, gameCoords.y);

      setDragState(prev => ({
        ...prev,
        x: e.clientX,
        y: targetY,
        gameX: isOverCanvas ? gameCoords.x : -1000,
        gameY: isOverCanvas ? gameCoords.y : -1000,
        validPlacement: isValid
      }));
    };

    const handleGlobalPointerUp = () => {
      if (!dragState.isDragging) return;

      if (dragState.validPlacement && dragState.towerType) {
        // Limit Check already done in validity but good to be safe
        if (towersRef.current.length < currentTowerLimit) {
            const def = getTowerStats(dragState.towerType);
            if (money >= (def.cost || 0)) {
                setMoney(m => m - (def.cost || 0));
                towersRef.current.push({
                  id: Math.random().toString(),
                  type: dragState.towerType,
                  x: dragState.gameX, 
                  y: dragState.gameY,
                  range: def.range || 100,
                  damage: def.damage || 10,
                  cooldown: def.cooldown || 60,
                  cooldownTimer: 0,
                  cost: def.cost || 100,
                  level: 1,
                  color: def.color || '#fff',
                  name: def.name || 'Tower',
                  description: def.description || '',
                  rotation: 0,
                  totalDamage: 0
                });
                soundManager.playBuild();
            }
        }
      }
      
      setDragState({
        isDragging: false,
        towerType: null,
        validPlacement: false,
        x: 0, y: 0,
        gameX: 0, gameY: 0
      });
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [dragState, money]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (dragState.isDragging) return;
    const { x, y } = getGameCoords(e.clientX, e.clientY);
    const clickedTower = towersRef.current.find(t => getDistance(t, {x, y}) < 25);
    setSelectedTowerId(clickedTower ? clickedTower.id : null);
  };

  const sellSelectedTower = () => {
    if (!selectedTowerId) return;
    const index = towersRef.current.findIndex(t => t.id === selectedTowerId);
    if (index > -1) {
      const t = towersRef.current[index];
      setMoney(m => m + Math.floor(t.cost * 0.7));
      towersRef.current.splice(index, 1);
      setSelectedTowerId(null);
    }
  };

  const upgradeSelectedTower = () => {
      if (!selectedTowerId) return;
      const t = towersRef.current.find(t => t.id === selectedTowerId);
      if (!t) return;
      
      // NEW COST FORMULA: 60% Base + (20% Base * Level)
      // This scales linearly but keeps upgrades reasonably priced for their tier
      const upgradeCost = Math.floor((t.cost * 0.6) + (t.cost * 0.2 * t.level));
      
      if (money >= upgradeCost && t.level < 7) {
          setMoney(m => m - upgradeCost);
          t.level++;
          
          // Universal Damage Buff
          // Each level adds 5% cumulative damage on top of specific multipliers
          t.damage = Math.floor(t.damage * 1.05);

          // Specific Scaling
          if (t.type === TowerType.FLAMETHROWER || t.type === TowerType.SHOCKWAVE) {
             t.damage = Math.floor(t.damage * 1.45); // High damage scaling for flame/shock
             t.cooldown = Math.max(2, t.cooldown * 0.9); // Fire rate increases (cooldown decreases)
             // Range does NOT increase
          } else {
             t.damage = Math.floor(t.damage * 1.30); // 30% base damage increase per level for others
             t.range = Math.floor(t.range * 1.1); // 10% range increase
          }
      }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-neutral-900 text-neutral-200 touch-none select-none fixed inset-0">
      
      {/* GAME AREA */}
      <div className="relative flex-1 flex items-center justify-center bg-black p-2 lg:p-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          className="w-full h-auto max-w-[800px] aspect-[4/3] bg-neutral-800 shadow-2xl border-2 border-neutral-700 rounded-sm"
        />

        {/* Global Notification */}
        {notification && (
            <div 
                className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-indigo-900/90 text-white px-6 py-3 rounded-full border border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] font-bold text-lg animate-bounce pointer-events-none z-50"
                style={{ opacity: Math.min(1, notification.opacity) }}
            >
                {notification.text}
            </div>
        )}

        {/* DEV TOOLS PANEL */}
        {isDevMode && (
            <div className={`absolute top-4 right-4 bg-black/90 backdrop-blur border border-purple-500/50 rounded p-2 text-xs z-40 shadow-2xl transition-all ${isDevOpen ? 'w-48' : 'w-auto'}`}>
                <div className="flex items-center justify-between gap-2 mb-2 border-b border-purple-800 pb-1">
                    <div className="flex items-center gap-2">
                         <Terminal className="w-3 h-3 text-purple-400" />
                         {isDevOpen && <span className="font-bold text-purple-400">DEV CONSOLE</span>}
                    </div>
                    <button onClick={() => setIsDevOpen(!isDevOpen)} className="text-purple-400 hover:text-white">
                        {isDevOpen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                </div>
                {isDevOpen && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setMoney(m => m + 1000)} className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded text-green-400 border border-neutral-700">+$1k</button>
                            <button onClick={() => {
                                setLives(l => {
                                    const newLives = l + 100;
                                    livesRef.current = newLives;
                                    return newLives;
                                });
                            }} className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded text-red-400 border border-neutral-700">+100 HP</button>
                        </div>
                        <button onClick={forceNextWave} className="w-full bg-neutral-800 hover:bg-neutral-700 p-2 rounded text-blue-400 border border-neutral-700 flex items-center justify-center gap-1">
                            <FastForward className="w-3 h-3" /> Next Wave
                        </button>
                        <button onClick={killAllEnemies} className="w-full bg-neutral-800 hover:bg-neutral-700 p-2 rounded text-red-500 border border-neutral-700 flex items-center justify-center gap-1">
                            <Skull className="w-3 h-3" /> Kill All
                        </button>
                        <div className="border-t border-purple-900 pt-2 mt-2">
                            <p className="text-[10px] text-neutral-500 mb-1 uppercase">Spawn Entity</p>
                            <div className="grid grid-cols-3 gap-1">
                                {Object.values(EnemyType).map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => spawnEnemy(type)}
                                        className="bg-neutral-800 hover:bg-purple-900/50 text-white p-1 rounded text-[9px] truncate border border-neutral-700"
                                        title={type}
                                    >
                                        {type.substring(0, 4)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
        
        {/* Floating UI Stats */}
        <div className="absolute top-4 left-4 flex gap-4 pointer-events-none">
            <div className="bg-neutral-900/90 border border-yellow-600/50 px-3 py-1 rounded flex items-center gap-2 text-yellow-500 font-bold text-sm lg:text-base shadow-lg backdrop-blur-sm">
                <Zap className="w-4 h-4" />
                <span>${money}</span>
            </div>
            <div className="bg-neutral-900/90 border border-red-600/50 px-3 py-1 rounded flex items-center gap-2 text-red-500 font-bold text-sm lg:text-base shadow-lg backdrop-blur-sm">
                <Heart className="w-4 h-4 fill-current" />
                <span>{lives}</span>
            </div>
            <div className="bg-neutral-900/90 border border-blue-600/50 px-3 py-1 rounded flex items-center gap-2 text-blue-400 font-bold text-sm lg:text-base shadow-lg backdrop-blur-sm">
                {isEndless ? <InfinityIcon className="w-4 h-4" /> : <Crosshair className="w-4 h-4" />}
                <span>Wave {wave} {isEndless ? '(∞)' : `/ ${map.waves}`}</span>
            </div>
            <div className={`bg-neutral-900/90 border px-3 py-1 rounded flex items-center gap-2 font-bold text-sm lg:text-base shadow-lg backdrop-blur-sm ${towersRef.current.length >= currentTowerLimit ? 'border-red-600/50 text-red-500' : 'border-neutral-600/50 text-neutral-400'}`}>
                <span>Towers: {towersRef.current.length} / {currentTowerLimit}</span>
            </div>
        </div>

        {dragState.isDragging && dragState.towerType && (
          <div 
            className="fixed pointer-events-none z-50"
            style={{ 
                left: dragState.x, 
                top: dragState.y,
                transform: 'translate(-50%, -50%)'
            }}
          >
              <div 
                className={`w-16 h-16 rounded-full border-2 ${dragState.validPlacement ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20'} flex items-center justify-center backdrop-blur-sm`}
              >
              </div>
          </div>
        )}

        {/* PREPARATION BANNER (BETWEEN WAVES) */}
        {waveSummary && !isSummaryOpen && !waveActiveRef.current && !gameOver && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/90 border border-neutral-700/80 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <span className="text-xs text-neutral-300 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Wave {waveSummary.waveNumber} Cleared
            </span>
            <span className="h-3 w-px bg-neutral-700" />
            <button
              onClick={() => setIsSummaryOpen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
              title="Review combat log and performance statistics"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Debrief
            </button>
            <span className="h-3 w-px bg-neutral-700" />
            <button
              onClick={startNextWave}
              className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 rounded-full flex items-center gap-1 transition shadow-md"
            >
              <Play className="w-3 h-3 fill-current" /> Deploy Wave {waveSummary.waveNumber + 1}
            </button>
          </div>
        )}

        {/* POST-WAVE SUMMARY MODAL */}
        {waveSummary && (
          <PostWaveSummaryModal
            summary={waveSummary}
            isOpen={isSummaryOpen}
            onNextWave={startNextWave}
            onPrepareDefenses={() => setIsSummaryOpen(false)}
            autoPlay={autoPlay}
            onToggleAutoPlay={() => setAutoPlay(prev => !prev)}
            onContinueEndless={() => {
              setVictory(false);
              setIsEndless(true);
              setIsSummaryOpen(false);
              startNextWave();
            }}
            onReturnToBase={() => {
              const difficultyMult = map.difficulty === 'HARD' ? 3 : map.difficulty === 'MEDIUM' ? 2 : 1;
              onWin(200 * difficultyMult);
            }}
          />
        )}

        {/* DEFEAT MODAL */}
        {gameOver && (
           <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 animate-in fade-in backdrop-blur-sm">
               <div className="bg-neutral-900 border-2 border-red-600 shadow-red-900/50 shadow-2xl p-8 rounded-lg max-w-md w-full text-center">
                   <h2 className="text-4xl lg:text-6xl font-title mb-2 text-red-600">
                      DEFEAT
                   </h2>
                   <div className="w-full h-px bg-neutral-700 my-6"></div>
                   <div className="grid grid-cols-2 gap-4 mb-6 text-neutral-300">
                       <div className="bg-neutral-800 p-3 rounded">
                           <p className="text-xs text-neutral-500 uppercase tracking-wider">Waves Survived</p>
                           <p className="text-2xl font-bold">{Math.max(0, wave - 1)} <span className="text-neutral-500 text-sm">/ {map.waves}</span></p>
                       </div>
                       <div className="bg-neutral-800 p-3 rounded">
                           <p className="text-xs text-neutral-500 uppercase tracking-wider">Mutants Purged</p>
                           <p className="text-2xl font-bold text-red-400">{totalStatsRef.current.enemiesDefeated}</p>
                       </div>
                   </div>
                   <p className="text-sm mb-8 text-neutral-400 italic">
                       The defense line collapsed at Wave {wave}. Evacuation failed.
                   </p>
                   
                   <div className="space-y-3">
                        <button 
                            onClick={onExit}
                            className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-4 rounded uppercase tracking-widest transition flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" /> Return to Base
                        </button>
                   </div>
               </div>
           </div>
        )}
      </div>

      {/* SIDEBAR UI */}
      <div className="w-full lg:w-80 h-[40vh] lg:h-full bg-neutral-800 border-t lg:border-t-0 lg:border-l border-neutral-700 flex flex-col z-10 shadow-2xl relative">
        
        {/* TOWER INFO TOOLTIP (FLOATING) */}
        {hoveredTowerType && (
            <div className="absolute bottom-full right-0 lg:right-full lg:bottom-auto lg:top-0 bg-neutral-900 border border-neutral-600 p-4 rounded-lg shadow-2xl w-64 z-50 pointer-events-none m-2 animate-in fade-in slide-in-from-right-4">
                <h3 className="font-title text-lg text-white mb-1">{TOWER_DEFINITIONS[hoveredTowerType].name}</h3>
                <p className="text-xs text-neutral-400 mb-3 leading-tight italic border-l-2 border-blue-500 pl-2">
                    {TOWER_DEFINITIONS[hoveredTowerType].description}
                </p>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                     {/* DAMAGE */}
                     <div className="bg-neutral-800 p-2 rounded flex flex-col items-center gap-1">
                         <Sword className="w-5 h-5 text-red-500" />
                         <span className="text-xs font-bold text-white">{getTowerStats(hoveredTowerType).damage}</span>
                     </div>
                     {/* SPEED (BOW ICON) */}
                     <div className="bg-neutral-800 p-2 rounded flex flex-col items-center gap-1">
                         <BowIcon />
                         <span className="text-xs font-bold text-white">{(((getTowerStats(hoveredTowerType).cooldown ?? 60) / 60).toFixed(1))}s</span>
                     </div>
                     {/* RANGE (INVERTED U ICON) */}
                     <div className="bg-neutral-800 p-2 rounded flex flex-col items-center gap-1">
                         <RangeArcIcon />
                         <span className="text-xs font-bold text-white">{Math.round(getTowerStats(hoveredTowerType).range || 100)}</span>
                     </div>
                </div>
            </div>
        )}

        <div className="hidden lg:flex items-center justify-between p-4 border-b border-neutral-700 bg-neutral-900">
            <h1 className="text-xl font-title text-neutral-400 tracking-wider">COMMAND CENTER</h1>
            <SoundSettingsPanel 
                settings={inGameSoundSettings} 
                onUpdateSettings={(newS) => {
                    const saved = soundManager.saveSettings(newS);
                    setInGameSoundSettings(saved);
                }} 
                variant="compact"
            />
        </div>

        <div className="p-2 lg:p-4 grid grid-cols-2 gap-2 border-b border-neutral-800 bg-neutral-800">
             <div className="col-span-2 grid grid-cols-3 gap-2 mb-2">
                <button 
                    onClick={startNextWave} 
                    disabled={waveActiveRef.current || gameOver || (victory && !isEndless)}
                    className={`flex items-center justify-center gap-2 p-3 font-bold rounded transition text-sm lg:text-base ${
                        waveActiveRef.current 
                        ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' 
                        : 'bg-green-700 hover:bg-green-600 text-white'
                    }`}
                    title="Start Next Wave"
                >
                    <Play className="w-5 h-5 fill-current" />
                </button>
                <button 
                    onClick={() => setIsPaused(!isPaused)}
                    className={`flex items-center justify-center gap-2 p-3 font-bold rounded text-sm lg:text-base ${
                        isPaused ? 'bg-yellow-600 text-white animate-pulse' : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                    }`}
                    title={isPaused ? "Resume" : "Pause"}
                >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                <button 
                    onClick={onExit}
                    className="flex items-center justify-center gap-2 p-3 bg-red-900/50 hover:bg-red-800 text-red-200 font-bold rounded text-sm lg:text-base"
                    title="Exit Mission"
                >
                    <LogOut className="w-5 h-5" />
                </button>
             </div>
             <button 
                onClick={() => setGameSpeed(s => s === 1 ? 2 : 1)}
                className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-bold border border-neutral-700 ${
                    gameSpeed === 2 ? 'bg-blue-900/50 text-blue-200' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
             >
                 <FastForward className="w-4 h-4" /> {gameSpeed}x SPEED
             </button>
             <button 
                onClick={() => setAutoPlay(!autoPlay)}
                className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-bold border border-neutral-700 ${
                    autoPlay ? 'bg-green-900/50 text-green-200' : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
             >
                 <Repeat className="w-4 h-4" /> AUTO: {autoPlay ? 'ON' : 'OFF'}
             </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 lg:p-4">
            <h3 className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-widest">Defenses (Drag to Map)</h3>
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2 lg:gap-3">
                {Object.values(TOWER_DEFINITIONS).map((def) => {
                    const stats = getTowerStats(def.type as TowerType);
                    const canAfford = money >= stats.cost;
                    return (
                        <div
                            key={def.type}
                            onPointerDown={(e) => {
                                if(canAfford) handlePointerDown(e, def.type as TowerType);
                            }}
                            onMouseEnter={() => setHoveredTowerType(def.type as TowerType)}
                            onMouseLeave={() => setHoveredTowerType(null)}
                            className={`relative p-2 rounded border-2 flex flex-col items-center gap-1 transition select-none touch-none ${
                                canAfford 
                                ? 'bg-neutral-900 border-neutral-700 cursor-grab active:cursor-grabbing hover:border-neutral-500 hover:bg-neutral-800' 
                                : 'bg-neutral-900/50 border-neutral-800 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            {/* TOWER PREVIEW COMPONENT */}
                            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full shadow-sm border border-white/10 flex items-center justify-center bg-black/30 overflow-hidden">
                                <TowerPreview type={def.type as TowerType} />
                            </div>

                            <div className="text-center leading-none w-full">
                                <div className="hidden lg:block text-xs font-bold text-neutral-300 mb-1 truncate">{def.name}</div>
                                <div className="text-[10px] lg:text-xs text-yellow-500 font-mono">${stats.cost}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTowerId && (
                <div className="absolute bottom-0 left-0 right-0 lg:static mt-auto p-4 bg-neutral-900 border-t border-neutral-700 animate-in slide-in-from-bottom z-20">
                    {(() => {
                        const t = towersRef.current.find(t => t.id === selectedTowerId);
                        if(!t) return null;
                        
                        // Calculate Upgrade Cost
                        const upgradeCost = Math.floor((t.cost * 0.6) + (t.cost * 0.2 * t.level));
                        const canUpgrade = money >= upgradeCost && t.level < 7;

                        // Calculate Potential Buffs for Display
                        let bonusDmg = 0;
                        if (t.isBuffed) {
                            const buffingRadars = towersRef.current.filter(r => r.type === TowerType.RADAR && getDistance(r, t) <= r.range);
                            const hasMaxRadar = buffingRadars.some(r => r.level >= 7);
                            if (hasMaxRadar) {
                                bonusDmg = Math.round(t.damage * 0.15);
                            }
                        }
                        
                        return (
                            <>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{t.name} <span className="text-yellow-500 text-xs">LVL {t.level}</span></h3>
                                    </div>
                                    <button onClick={() => setSelectedTowerId(null)} className="text-neutral-500 hover:text-white text-sm">Close</button>
                                </div>
                                <p className="text-xs text-neutral-400 mb-3 leading-tight">
                                    {t.description}
                                </p>
                                {t.type !== TowerType.RADAR && (
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div className="text-xs text-neutral-400">
                                            DMG: <span className="text-white">{t.damage}</span>
                                            {bonusDmg > 0 && <span className="text-green-500 ml-1">(+{bonusDmg})</span>}
                                        </div>
                                        <div className="text-xs text-neutral-400">
                                            RNG: <span className="text-white">{Math.round(t.range)}</span>
                                            {t.isBuffed && <span className="text-green-500 ml-1">(+15%)</span>}
                                        </div>
                                    </div>
                                )}
                                <div className="mb-3 bg-neutral-800 p-2 rounded flex items-center justify-between border border-neutral-700">
                                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                                        <BarChart3 className="w-3 h-3" /> Total Dmg
                                    </span>
                                    <span className="text-sm font-mono font-bold text-orange-400">
                                        {Math.round(t.totalDamage).toLocaleString()}
                                    </span>
                                </div>

                                {t.isBuffed && (
                                    <div className="mb-2 text-[10px] text-blue-300 bg-blue-900/20 border border-blue-500/30 p-1 rounded text-center">
                                        RADAR LINK ACTIVE: Homing Enabled
                                    </div>
                                )}
                                {t.frozenTimer && t.frozenTimer > 0 && (
                                    <div className="mb-2 text-[10px] text-blue-200 bg-cyan-900/40 border border-cyan-500/30 p-1 rounded text-center animate-pulse">
                                        FROZEN: Fire Rate Reduced
                                    </div>
                                )}
                                {t.stunnedTimer && t.stunnedTimer > 0 && (
                                    <div className="mb-2 text-[10px] text-red-200 bg-red-900/40 border border-red-500/30 p-1 rounded text-center animate-pulse">
                                        PARALYZED: Cannot Attack
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button 
                                        onClick={upgradeSelectedTower}
                                        disabled={!canUpgrade && t.level < 7}
                                        className={`flex-1 py-2 text-xs font-bold border rounded transition flex items-center justify-center gap-1 ${
                                            t.level >= 7
                                            ? 'bg-neutral-800 border-neutral-700 text-yellow-500 cursor-default'
                                            : canUpgrade
                                                ? 'bg-yellow-900/30 hover:bg-yellow-900/50 border-yellow-800/50 text-yellow-200'
                                                : 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {t.level >= 7 ? (
                                            <span>MAX LEVEL</span>
                                        ) : (
                                            <>
                                                <ArrowUp className="w-3 h-3" /> UPGRADE (${upgradeCost})
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        onClick={sellSelectedTower}
                                        className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 text-xs font-bold border border-red-800/50 rounded transition"
                                    >
                                        SELL
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};