import React, { useEffect, useRef, useState } from 'react';
import { Enemy, Tower, Projectile, GameMap, EnemyType, TowerType, Point, GlobalUpgrades, DragState } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, ENEMY_STATS, TOWER_DEFINITIONS, generateWaves } from '../constants';
import { Heart, Zap, Crosshair, Play, Pause, LogOut } from 'lucide-react';

interface GameCanvasProps {
  map: GameMap;
  upgrades: GlobalUpgrades;
  onExit: () => void;
  onWin: (reward: number) => void;
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

export const GameCanvas: React.FC<GameCanvasProps> = ({ map, upgrades, onExit, onWin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game Logic Refs (Mutable for performance)
  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const frameRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const waveActiveRef = useRef<boolean>(false);
  const currentWaveIndexRef = useRef<number>(0);
  const spawnQueueRef = useRef<{ type: EnemyType; framesUntilNext: number }[]>([]);

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
  const [isPaused, setIsPaused] = useState(false);
  
  // Selection & Dragging State
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    towerType: null,
    validPlacement: false,
    x: 0, y: 0,
    gameX: 0, gameY: 0
  });

  // Generate waves specifically for this map config
  const waves = useRef(generateWaves(map.waves));

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
      }

      // Don't place large obstacles on path
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
        // Reduced Alpha for better visibility
        alpha: 0.02 + Math.random() * 0.04
      });
    }
    fogRef.current = fog;

  }, [map]);

  // --- SPAWNING LOGIC ---
  
  const spawnEnemy = (type: EnemyType) => {
    const stats = ENEMY_STATS[type];
    const start = map.path[0];
    enemiesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: start.x,
      y: start.y,
      health: stats.hp,
      maxHealth: stats.hp,
      speed: stats.speed,
      pathIndex: 0,
      distanceTraveled: 0,
      reward: stats.reward,
      damageToPlayer: stats.damageToPlayer,
      color: stats.color,
      radius: stats.radius
    });
  };

  const startNextWave = () => {
    if (waveActiveRef.current || gameOver || victory) return;
    
    if (currentWaveIndexRef.current >= waves.current.length) {
      return; // All waves done
    }

    const waveData = waves.current[currentWaveIndexRef.current];
    const queue: { type: EnemyType; framesUntilNext: number }[] = [];
    
    waveData.enemies.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        queue.push({ type: group.type, framesUntilNext: group.spacing });
      }
    });

    spawnQueueRef.current = queue;
    waveActiveRef.current = true;
    setWave(waveData.number);
  };

  // --- DRAWING ---

  const drawTower = (ctx: CanvasRenderingContext2D, x: number, y: number, type: TowerType, rotation: number, color: string, isGhost: boolean = false) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    if (!isGhost) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(2, 2, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Common Base
    ctx.fillStyle = isGhost ? color : '#2a2a2a';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111';
    ctx.stroke();

    ctx.fillStyle = color;

    if (type === TowerType.SURVIVOR) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(8, -3, 12, 6);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(2, -2, 5, 0, Math.PI*2); ctx.fill();
    } 
    else if (type === TowerType.SNIPER) {
       ctx.fillStyle = '#000';
       ctx.fillRect(0, -2, 28, 4);
       ctx.fillRect(26, -3, 4, 6);
       ctx.fillStyle = color;
       ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
       ctx.strokeStyle = '#000';
       ctx.lineWidth = 1;
       ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.moveTo(0, -2); ctx.lineTo(0, 2); ctx.stroke();
    }
    else if (type === TowerType.TURRET) {
      ctx.fillStyle = '#111';
      ctx.fillRect(8, -6, 14, 4);
      ctx.fillRect(8, 2, 14, 4);
      ctx.fillStyle = color;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-8, -8, 3, 3); ctx.fillRect(-8, 5, 3, 3); ctx.fillRect(5, -8, 3, 3); ctx.fillRect(5, 5, 3, 3);
    }
    else if (type === TowerType.FLAMETHROWER) {
      ctx.fillStyle = '#555';
      ctx.fillRect(-14, -8, 6, 16);
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(18, -8); ctx.lineTo(18, 8); ctx.lineTo(0, 4); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'orange';
      ctx.beginPath(); ctx.arc(18, 0, 2, 0, Math.PI*2); ctx.fill();
    }
    else if (type === TowerType.TESLA) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ddd';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -18); ctx.moveTo(10, -6); ctx.lineTo(16, -10); ctx.moveTo(-10, -6); ctx.lineTo(-16, -10); ctx.stroke();
    }
    else if (type === TowerType.LASER) {
        ctx.fillStyle = '#444';
        ctx.fillRect(0, -5, 24, 10);
        ctx.fillStyle = '#0ff';
        ctx.fillRect(5, -1, 15, 2);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    else if (type === TowerType.MONK) {
        ctx.fillStyle = '#885522';
        // Crossbow shape
        ctx.beginPath();
        ctx.arc(10, 0, 15, Math.PI/2, Math.PI*1.5, true); 
        ctx.stroke();
        ctx.fillRect(0, -2, 20, 4);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  };

  const drawLightningSegment = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
      const dist = Math.hypot(x2-x1, y2-y1);
      const steps = Math.max(2, Math.floor(dist / 10)); // Segment every 10px
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      
      for(let i=1; i<steps; i++) {
          const t = i / steps;
          const baseX = x1 + (x2 - x1) * t;
          const baseY = y1 + (y2 - y1) * t;
          const jitter = (Math.random() - 0.5) * 15; // Jitter amount
          ctx.lineTo(baseX + jitter, baseY + jitter);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
  };

  const update = () => {
    if (isPaused || gameOver || victory) return;

    frameRef.current++;
    
    // Update Fog
    fogRef.current.forEach(p => {
      p.x += p.speed;
      if (p.x > CANVAS_WIDTH + p.size) p.x = -p.size;
    });

    // 1. Spawning & Wave Management
    if (waveActiveRef.current) {
        if (spawnQueueRef.current.length > 0) {
          const nextSpawn = spawnQueueRef.current[0];
          nextSpawn.framesUntilNext--;
          if (nextSpawn.framesUntilNext <= 0) {
            spawnEnemy(nextSpawn.type);
            spawnQueueRef.current.shift();
          }
        } else if (enemiesRef.current.length === 0) {
          const currentWaveReward = waves.current[currentWaveIndexRef.current].reward;
          setMoney(m => m + currentWaveReward);

          waveActiveRef.current = false;
          currentWaveIndexRef.current++;
          
          if (currentWaveIndexRef.current >= waves.current.length) {
             setVictory(true);
             const difficultyMult = map.difficulty === 'HARD' ? 3 : map.difficulty === 'MEDIUM' ? 2 : 1;
             onWin(200 * difficultyMult);
          }
        }
    }

    // 2. Move Enemies
    enemiesRef.current.forEach(enemy => {
      if (enemy.health <= 0) return;

      const targetNode = map.path[enemy.pathIndex + 1];
      if (!targetNode) return; 

      const dx = targetNode.x - enemy.x;
      const dy = targetNode.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < enemy.speed) {
        enemy.x = targetNode.x;
        enemy.y = targetNode.y;
        enemy.pathIndex++;
        enemy.distanceTraveled += dist;
        
        if (enemy.pathIndex >= map.path.length - 1) {
           enemy.health = 0; 
           setLives(prev => Math.max(0, prev - (enemy.type === EnemyType.BOSS ? 20 : 1)));
        }
      } else {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
        enemy.distanceTraveled += enemy.speed;
      }
    });

    const activeEnemies = enemiesRef.current.filter(e => e.health > 0);
    enemiesRef.current = activeEnemies;


    // 3. Towers Action
    towersRef.current.forEach(tower => {
      if (tower.cooldownTimer > 0) {
        tower.cooldownTimer--;
        return;
      }

      // Monk Logic: Wait for projectile to hit
      if (tower.type === TowerType.MONK && tower.activeProjectileId) {
        // Check if projectile still exists
        const exists = projectilesRef.current.some(p => p.id === tower.activeProjectileId);
        if (exists) return; 
        // If not exists (missed/expired), allow fire after cooldown, but usually we clear it on hit
        tower.activeProjectileId = null;
      }

      const enemiesInRange = enemiesRef.current.filter(e => {
        return getDistance(e, tower) <= tower.range;
      });

      if (enemiesInRange.length > 0) {
        enemiesInRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
        const target = enemiesInRange[0];

        const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        tower.rotation = angle;
        
        if (tower.type === TowerType.TESLA) {
           tower.cooldownTimer = tower.cooldown;
           
           // CHAIN LIGHTNING LOGIC
           const chain: Enemy[] = [target];
           let current = target;
           const bounceRange = 180; // Range to jump to next target
           
           // Find up to 3 additional targets
           for(let i=0; i<3; i++) {
               const pool = enemiesRef.current.filter(e => 
                   e.health > 0 && 
                   !chain.includes(e) && 
                   getDistance(current, e) <= bounceRange
               );
               if (pool.length === 0) break;
               
               // Find closest to current link in chain
               pool.sort((a, b) => getDistance(current, a) - getDistance(current, b));
               chain.push(pool[0]);
               current = pool[0];
           }

           // Hitscan Damage
           chain.forEach(e => {
               e.health -= tower.damage;
               if (e.health <= 0) setMoney(m => m + e.reward);
           });

           // Create Visual Lightning Projectile
           projectilesRef.current.push({
             id: Math.random().toString(),
             ownerId: tower.id,
             x: tower.x, y: tower.y,
             targetId: target.id, // Primary target for reference
             chainIds: chain.map(e => e.id), // IDs of all hit enemies
             velocity: {x:0, y:0}, speed: 0,
             damage: 0, // Already applied
             color: tower.color,
             radius: 0,
             type: 'LIGHTNING',
             pierce: 0,
             lifespan: 15 // Short visual duration
           });
        } 
        else if (tower.type === TowerType.FLAMETHROWER) {
            tower.cooldownTimer = tower.cooldown;
             projectilesRef.current.push({
             id: Math.random().toString(),
             x: tower.x, y: tower.y,
             targetId: target.id,
             velocity: {
                 x: Math.cos(angle) * 5,
                 y: Math.sin(angle) * 5
             }, 
             speed: 5,
             damage: tower.damage,
             color: '#ff5500',
             radius: 5,
             type: 'FLAME',
             pierce: 99,
             lifespan: 30
           });
        }
        else if (tower.type === TowerType.LASER) {
             // BEAM LOGIC: Raycast to edge of screen/max range
             tower.cooldownTimer = tower.cooldown;
             
             // Calculate extended point off screen in direction of angle
             // Max diagonal is approx 1000px
             const endX = tower.x + Math.cos(angle) * 1000;
             const endY = tower.y + Math.sin(angle) * 1000;

             // Create static visual beam
             projectilesRef.current.push({
                 id: Math.random().toString(),
                 x: tower.x, 
                 y: tower.y,
                 endX,
                 endY,
                 targetId: null,
                 velocity: {x:0, y:0},
                 speed: 0,
                 damage: tower.damage,
                 color: '#00ffff',
                 radius: 4,
                 type: 'BEAM',
                 pierce: 999,
                 lifespan: 30 // 0.5 Seconds
             });

             // Instant Hitscan Damage
             enemiesRef.current.forEach(enemy => {
                 const dist = getDistanceToLine({x: enemy.x, y: enemy.y}, {x: tower.x, y: tower.y}, {x: endX, y: endY});
                 if (dist < (enemy.radius + 5)) { // +5 for beam thickness
                     enemy.health -= tower.damage;
                     if (enemy.health <= 0) setMoney(m => m + enemy.reward);
                 }
             });
        }
        else if (tower.type === TowerType.MONK) {
             tower.cooldownTimer = tower.cooldown;
             const pid = Math.random().toString();
             tower.activeProjectileId = pid;
             tower.cooldownTimer = 9999; // Infinite until hit
             projectilesRef.current.push({
                 id: pid,
                 ownerId: tower.id,
                 x: tower.x, y: tower.y,
                 targetId: target.id,
                 velocity: {
                     x: Math.cos(angle) * 3,
                     y: Math.sin(angle) * 3
                 },
                 speed: 3,
                 acceleration: 0.15,
                 damage: tower.damage,
                 color: '#ff99aa',
                 radius: 4,
                 type: 'ARROW',
                 pierce: 1,
                 lifespan: 300
             });
        } 
        else {
            tower.cooldownTimer = tower.cooldown;
            const speed = 8;
            projectilesRef.current.push({
              id: Math.random().toString(),
              x: tower.x, 
              y: tower.y,
              targetId: tower.type === TowerType.SNIPER ? target.id : null, 
              velocity: {
                  x: Math.cos(angle) * speed,
                  y: Math.sin(angle) * speed
              },
              speed: speed,
              damage: tower.damage,
              color: '#ffff00', // Changed to Yellow for visibility
              radius: 3,
              type: 'BULLET',
              pierce: 1,
              lifespan: 60
            });
        }
      }
    });

    // 4. Move Projectiles
    projectilesRef.current.forEach(p => {
      p.lifespan--;
      
      // Skip movement for static visuals
      if (p.type === 'BEAM' || p.type === 'LIGHTNING') return;

      if (p.type === 'ARROW') {
          let target = enemiesRef.current.find(e => e.id === p.targetId);
          
          // Retargeting Logic: If target is dead or missing, find closest
          if (!target) {
              let minDist = Infinity;
              let closest: Enemy | null = null;
              for(const e of enemiesRef.current) {
                  const d = getDistance(p, e);
                  if (d < minDist) {
                      minDist = d;
                      closest = e;
                  }
              }
              // Only retarget if within reasonable range (e.g. 300px)
              if (closest && minDist < 300) {
                  p.targetId = closest.id;
                  target = closest;
              }
          }

          // Homing and Acceleration
          if (target) {
              const angle = Math.atan2(target.y - p.y, target.x - p.x);
              // Update velocity vector towards target
              // We preserve current speed magnitude but redirect it
              p.velocity.x = Math.cos(angle) * p.speed;
              p.velocity.y = Math.sin(angle) * p.speed;
          }
          
          // Always accelerate if defined, regardless of target existing (flies straight faster if no target)
          if (p.acceleration) {
              p.speed += p.acceleration;
              // Re-normalize velocity to match new speed
              const currentAngle = Math.atan2(p.velocity.y, p.velocity.x);
               p.velocity.x = Math.cos(currentAngle) * p.speed;
               p.velocity.y = Math.sin(currentAngle) * p.speed;
          }
      }

      p.x += p.velocity.x;
      p.y += p.velocity.y;

      for (let i = 0; i < enemiesRef.current.length; i++) {
        if (p.pierce <= 0) break;
        const enemy = enemiesRef.current[i];
        if (getDistance(p, enemy) < (enemy.radius + p.radius)) {
            enemy.health -= p.damage;
            p.pierce--;
            
            // Monk Reset Mechanic
            if (p.ownerId && p.type === 'ARROW') {
                const ownerTower = towersRef.current.find(t => t.id === p.ownerId);
                if (ownerTower) {
                    ownerTower.activeProjectileId = null;
                    ownerTower.cooldownTimer = 5; // Small delay for reload animation feel
                }
            }

            if (enemy.health <= 0 && enemy.health + p.damage > 0) {
                setMoney(m => m + enemy.reward);
            }
            
            if (p.type === 'BULLET' || p.type === 'ARROW') {
               p.lifespan = 0; 
            }
        }
      }
    });
    
    // Clean up dead projectiles
    projectilesRef.current.forEach(p => {
        if (p.lifespan <= 0 && p.ownerId && p.type === 'ARROW') {
             const ownerTower = towersRef.current.find(t => t.id === p.ownerId);
             if (ownerTower) {
                 ownerTower.activeProjectileId = null;
                 ownerTower.cooldownTimer = 30; // Penalty for missing
             }
        }
    });

    projectilesRef.current = projectilesRef.current.filter(p => p.lifespan > 0);

    if (lives <= 0 && !gameOver) {
        setGameOver(true);
    }
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

    // 6. Game Entities
    towersRef.current.forEach(t => drawTower(ctx, t.x, t.y, t.type, t.rotation, t.color));

    enemiesRef.current.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      const hpPct = e.health / e.maxHealth;
      ctx.fillStyle = 'red';
      ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20, 4);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20 * hpPct, 4);
    });

    projectilesRef.current.forEach(p => {
      if (p.type === 'LIGHTNING') {
         // Chain Lightning Rendering
         if (p.chainIds && p.chainIds.length > 0) {
             let startX = p.x;
             let startY = p.y;
             
             ctx.save();
             // Bright purple core
             ctx.strokeStyle = '#d8b4fe'; 
             ctx.lineWidth = 2;
             ctx.lineCap = 'round';
             ctx.lineJoin = 'round';
             // Glow
             ctx.shadowColor = '#a855f7';
             ctx.shadowBlur = 15;

             p.chainIds.forEach(id => {
                 const enemy = enemiesRef.current.find(e => e.id === id);
                 if (enemy) {
                     drawLightningSegment(ctx, startX, startY, enemy.x, enemy.y);
                     startX = enemy.x;
                     startY = enemy.y;
                     
                     // Connection flash
                     ctx.fillStyle = '#fff';
                     ctx.beginPath(); 
                     ctx.arc(enemy.x, enemy.y, 6, 0, Math.PI*2); 
                     ctx.fill();
                 }
             });
             ctx.restore();
         }
      } else if (p.type === 'BEAM') {
           // Ion Cannon Static Beam
           if (p.endX !== undefined && p.endY !== undefined) {
               const alpha = Math.min(1, p.lifespan / 10); // Fade out
               ctx.save();
               ctx.globalAlpha = alpha;
               
               // Core
               ctx.beginPath();
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(p.endX, p.endY);
               ctx.strokeStyle = '#fff';
               ctx.lineWidth = 2;
               ctx.stroke();

               // Glow
               ctx.beginPath();
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(p.endX, p.endY);
               ctx.strokeStyle = p.color;
               ctx.lineWidth = 6 + Math.sin(frameRef.current * 0.5) * 2;
               ctx.shadowColor = p.color;
               ctx.shadowBlur = 15;
               ctx.stroke();
               
               ctx.restore();
           }
      } else if (p.type === 'ARROW') {
         ctx.save();
         ctx.translate(p.x, p.y);
         const angle = Math.atan2(p.velocity.y, p.velocity.x);
         ctx.rotate(angle);
         ctx.fillStyle = p.color;
         ctx.beginPath();
         ctx.moveTo(5, 0);
         ctx.lineTo(-5, -3);
         ctx.lineTo(-5, 3);
         ctx.fill();
         ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    });

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
      drawTower(ctx, dragState.gameX, dragState.gameY, dragState.towerType, 0, def.color || '#fff', true);
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
      update();
      draw(ctx);
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameOver, victory, map, dragState, selectedTowerId, upgrades]); 

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
    if (x < 20 || x > CANVAS_WIDTH - 20 || y < 20 || y > CANVAS_HEIGHT - 20) return false;
    const collisionWithTower = towersRef.current.some(t => getDistance(t, {x, y}) < 40);
    if (collisionWithTower) return false;
    
    const distToPath = getDistanceToPath({x, y}, map.path);
    if (distToPath < 35) return false;

    return true;
  };

  const handlePointerDown = (e: React.PointerEvent, type: TowerType) => {
    e.preventDefault();
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
              rotation: 0
            });
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
        
        {/* Floating UI Stats */}
        <div className="absolute top-4 left-4 right-4 flex justify-between lg:justify-start lg:gap-4 pointer-events-none">
            <div className="bg-neutral-900/90 border border-yellow-600/50 px-3 py-1 rounded flex items-center gap-2 text-yellow-500 font-bold text-sm lg:text-base shadow-lg backdrop-blur-sm">
                <Zap className="w-4 h-4" />
                <span>${money}</span>
            </div>
            <div className="bg-neutral-900/90 border border-red-600/50 px-3 py-1 rounded flex items-center gap-2 text-red-500 font-bold text-sm lg:text-base shadow-lg backdrop-blur-sm">
                <Heart className="w-4 h-4 fill-current" />
                <span>{lives}</span>
            </div>
            <div className="bg-neutral-900/90 border border-blue-600/50 px-3 py-1 rounded flex items-center gap-2 text-blue-400 font-bold text-sm lg:text-base shadow-lg backdrop-blur-sm">
                <Crosshair className="w-4 h-4" />
                <span>Wave {wave}/{map.waves}</span>
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

        {(gameOver || victory) && (
           <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-50 animate-in fade-in backdrop-blur-sm">
               <h2 className={`text-4xl lg:text-6xl font-title mb-4 ${victory ? 'text-green-500' : 'text-red-600'}`}>
                  {victory ? 'SECTOR SECURED' : 'DEFEAT'}
               </h2>
               <p className="text-lg mb-8 text-neutral-400">
                   {victory ? 'All waves neutralized. Rewards claimed.' : `The wasteland consumed you at Wave ${wave}.`}
               </p>
               <button 
                onClick={onExit}
                className="bg-neutral-200 text-black px-8 py-3 font-bold hover:bg-white transition rounded uppercase tracking-widest"
               >
                   Return to Command
               </button>
           </div>
        )}
      </div>

      {/* SIDEBAR UI */}
      <div className="w-full lg:w-80 h-[40vh] lg:h-full bg-neutral-800 border-t lg:border-t-0 lg:border-l border-neutral-700 flex flex-col z-10 shadow-2xl">
        
        <div className="hidden lg:block p-4 border-b border-neutral-700 bg-neutral-900">
            <h1 className="text-xl font-title text-neutral-400 tracking-wider">COMMAND CENTER</h1>
        </div>

        <div className="p-2 lg:p-4 grid grid-cols-3 gap-2 border-b border-neutral-800 bg-neutral-800">
            <button 
                onClick={startNextWave} 
                disabled={waveActiveRef.current || gameOver || victory}
                className={`flex items-center justify-center gap-2 p-3 font-bold rounded transition text-sm lg:text-base ${
                    waveActiveRef.current 
                    ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' 
                    : 'bg-green-700 hover:bg-green-600 text-white'
                }`}
            >
                <Play className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center justify-center gap-2 p-3 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded text-sm lg:text-base"
            >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
             <button 
                onClick={onExit}
                className="flex items-center justify-center gap-2 p-3 bg-red-900/50 hover:bg-red-800 text-red-200 font-bold rounded text-sm lg:text-base"
            >
                <LogOut className="w-4 h-4" /> <span className="hidden lg:inline">EXIT</span>
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
                            className={`relative p-2 rounded border-2 flex flex-col items-center gap-1 transition select-none touch-none ${
                                canAfford 
                                ? 'bg-neutral-900 border-neutral-700 cursor-grab active:cursor-grabbing hover:border-neutral-500' 
                                : 'bg-neutral-900/50 border-neutral-800 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full shadow-sm border border-white/10" style={{ backgroundColor: def.color }}></div>
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
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-sm">{towersRef.current.find(t => t.id === selectedTowerId)?.name}</h3>
                        <button onClick={() => setSelectedTowerId(null)} className="text-neutral-500 hover:text-white text-sm">Close</button>
                    </div>
                    
                    <p className="text-xs text-neutral-400 mb-3 leading-tight">
                         {towersRef.current.find(t => t.id === selectedTowerId)?.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="text-xs text-neutral-400">
                             DMG: <span className="text-white">{towersRef.current.find(t => t.id === selectedTowerId)?.damage}</span>
                        </div>
                        <div className="text-xs text-neutral-400">
                             RNG: <span className="text-white">{Math.round(towersRef.current.find(t => t.id === selectedTowerId)?.range || 0)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={sellSelectedTower}
                        className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 text-xs font-bold border border-red-800/50 rounded transition"
                    >
                        SELL (70% Refund)
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};