
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Sword, Shield, Info } from 'lucide-react';
import { ENEMY_STATS, TOWER_DEFINITIONS } from '../../config/constants';
import { EnemyType, TowerType, Enemy, Tower, Projectile, GroundEffect } from '../../types/index';
import { drawEnemy, drawTower, drawProjectile, drawGroundEffect } from '../game/RenderUtils';

// --- 1. CARD RENDERER (Static Real Model) ---

const EntityCardRenderer: React.FC<{ type: EnemyType | TowerType }> = ({ type }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Center point
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const isEnemy = Object.values(EnemyType).includes(type as EnemyType);

        if (isEnemy) {
            const stats = ENEMY_STATS[type as EnemyType];
            // Create dummy enemy object for render function
            const dummy: Enemy = {
                id: 'card',
                type: type as EnemyType,
                x: cx,
                y: cy,
                health: stats.hp,
                maxHealth: stats.hp,
                speed: 0,
                pathIndex: 0,
                distanceTraveled: 0,
                reward: 0,
                damageToPlayer: 0,
                color: stats.color,
                radius: stats.radius * 1.5, // Scale up slightly for card
                isHealer: stats.isHealer
            };
            drawEnemy({ ctx, frame: 0 }, dummy);
        } else {
            const def = TOWER_DEFINITIONS[type as TowerType];
            const dummy: Tower = {
                id: 'card',
                type: type as TowerType,
                x: cx, 
                y: cy,
                range: 0, damage: 0, cooldown: 0, cooldownTimer: 0, cost: 0,
                level: 1,
                color: def.color || '#fff',
                name: '', description: '', rotation: -Math.PI / 4, // Angled look
                frame: 0,
                totalDamage: 0
            };
            // Scale context to make tower bigger
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1.5, 1.5);
            ctx.translate(-cx, -cy);
            drawTower({ ctx, frame: 0 }, dummy);
            ctx.restore();
        }

    }, [type]);

    return <canvas ref={canvasRef} width={100} height={100} className="pointer-events-none" />;
};


// --- 2. REAL SIMULATION ENGINE (Preview) ---

const SIM_PATH = [
    { x: 0, y: 150 },
    { x: 200, y: 150 },
    { x: 250, y: 150 }, // curve start
    { x: 300, y: 200 },
    { x: 300, y: 250 },
    { x: 450, y: 250 },
    { x: 500, y: 200 },
    { x: 500, y: 100 },
    { x: 650, y: 100 }
];

/** Cómo usar bien cada torre (lo que enseña la demo). */
const USE_TIPS: Record<string, string> = {
    SURVIVOR: 'Barata y fiable: ponla junto a una curva para que tenga objetivos más tiempo. Útil al inicio.',
    SNIPER: 'Alcance largo: ponla lejos del camino, con vista a varios tramos, para golpear a Tanks y Bosses.',
    TURRET: 'Mucha cadencia a poco alcance: ponla pegada al camino. Es la mejor para recibir el buff del Command Link.',
    FLAMETHROWER: 'Fuego corto: ponla en una curva cerrada donde pasen juntos. Cada llama golpea hasta 3 enemigos y los quema.',
    MORTAR: 'Daño en área y lento: ponla detrás, contra grupos. Apunta a donde estará el enemigo.',
    SHOCKWAVE: 'Pulso que aturde: ponla donde el camino se junta para frenar a todos y que otras torres disparen.',
    CHEMIST: 'Charcos de ácido que ralentizan: ponlos antes de tus torres de daño para que los enemigos tarden más.',
    TESLA: 'Rayo en cadena (hasta 4): mejor contra grupos grandes de enemigos débiles.',
    LASER: 'Rayo que perfora: ponla alineada con un tramo recto para golpear a todos los que estén en línea.',
    MONK: 'Alcance global, una flecha teledirigida a la vez: ponla donde quieras, ideal contra el enemigo más fuerte.',
    RADAR: 'No ataca. Ponlo cerca de tus torres de daño (dentro de su alcance) para darles más alcance y, a nivel 7, +15% de daño y velocidad.',
};

const CombatSimulation: React.FC<{ type: TowerType }> = ({ type }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const reqRef = useRef<number>(0);

    // State refs for the simulation loop
    const simRef = useRef({
        enemies: [] as Enemy[],
        projectiles: [] as Projectile[],
        groundEffects: [] as GroundEffect[],
        tower: null as Tower | null,
        partner: null as Tower | null, // Command Link: torre a la que apoya
        frame: 0,
        spawnTimer: 0
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // --- SETUP SIMULATION ---
        const def = TOWER_DEFINITIONS[type];
        
        // Tower Placement - Strategic based on path
        simRef.current.tower = {
            id: 'sim-tower',
            type: type,
            x: 280, // Inside the curve
            y: 130, 
            range: def.range || 150,
            damage: def.damage || 10,
            cooldown: def.cooldown || 60,
            cooldownTimer: 0,
            cost: 0,
            level: 1,
            color: def.color || '#fff',
            name: '', description: '', rotation: 0,
            frame: 0,
            burstCount: 0,
            activeProjectileId: null,
            totalDamage: 0
        };

        // Command Link no dispara: apoya a otra torre. Se le pone una Sentry cerca para ver el efecto.
        simRef.current.partner = null;
        if (type === TowerType.RADAR) {
            const pd = TOWER_DEFINITIONS[TowerType.TURRET];
            simRef.current.partner = {
                ...simRef.current.tower,
                id: 'sim-partner', type: TowerType.TURRET, x: 350, y: 195,
                range: pd.range || 140, damage: pd.damage || 20, cooldown: pd.cooldown || 8,
                color: pd.color || '#ef4444', isBuffed: false
            } as Tower;
        }

        simRef.current.enemies = [];
        simRef.current.projectiles = [];
        simRef.current.groundEffects = [];
        simRef.current.frame = 0;

        // --- SIMULATION LOOP ---
        const update = () => {
            const state = simRef.current;
            state.frame++;
            const { enemies, projectiles, groundEffects } = state;
            // Command Link: la torre que dispara es la Sentry apoyada. El Command Link solo da el buff.
            const buffOn = type === TowerType.RADAR && Math.floor(state.frame / 420) % 2 === 1;
            const tower = (type === TowerType.RADAR ? state.partner : state.tower) as Tower | null;
            if (!tower) return;
            if (type === TowerType.RADAR) {
                tower.isBuffed = buffOn;
                // Buff real del juego (Command Link nivel 7): +15% alcance, daño y velocidad
                const bd = TOWER_DEFINITIONS[TowerType.TURRET];
                tower.range = (bd.range || 140) * (buffOn ? 1.15 : 1);
                tower.damage = (bd.damage || 20) * (buffOn ? 1.15 : 1);
                tower.cooldown = (bd.cooldown || 8) / (buffOn ? 1.15 : 1);
            }

            // 1. SPAWN LOGIC (Tailored to showcase tower)
            if (enemies.length === 0 || (state.spawnTimer > 0 && state.frame % 25 === 0)) {
                if (enemies.length === 0) state.spawnTimer = 1; 

                let spawnType = EnemyType.WALKER;
                let batchSize = 1;

                // Customize scenario based on tower strength
                if (type === TowerType.TESLA || type === TowerType.FLAMETHROWER || type === TowerType.CHEMIST || type === TowerType.MORTAR || type === TowerType.SHOCKWAVE) {
                    spawnType = EnemyType.WALKER; // Swarm
                    batchSize = 6;
                } else if (type === TowerType.SNIPER || type === TowerType.LASER || type === TowerType.MONK) {
                    spawnType = EnemyType.TANK; // Heavy
                    batchSize = 1;
                } else {
                    spawnType = EnemyType.RUNNER; // Fast
                    batchSize = 3;
                }

                if (state.spawnTimer <= batchSize) {
                    const stats = ENEMY_STATS[spawnType];
                    // Reset path logic slightly for sim
                    const start = SIM_PATH[0];
                    
                    enemies.push({
                        id: Math.random().toString(),
                        type: spawnType,
                        x: start.x + 110 - (state.spawnTimer * 12), 
                        y: start.y + (Math.random() - 0.5) * 10, 
                        health: stats.hp * 4, // Boost HP for demo duration
                        maxHealth: stats.hp * 4,
                        speed: stats.speed,
                        pathIndex: 0,
                        distanceTraveled: 0,
                        reward: 0, damageToPlayer: 0, color: stats.color, radius: stats.radius,
                        isHealer: stats.isHealer,
                        slowFactor: 1,
                        burnTimer: 0,
                        burnDamage: 0
                    });
                    state.spawnTimer++;
                } else {
                    state.spawnTimer = 0; // Batch done
                }
            }

            // 2. MOVE ENEMIES
            enemies.forEach(e => {
                // Apply Ground Effects
                let slowed = false;
                groundEffects.forEach(g => {
                    if (g.type !== 'ACID_POOL') return; // solo el ácido ralentiza; el pulso y el fuego son visuales
                    const dist = Math.hypot(e.x - g.x, e.y - g.y);
                    if(dist < e.radius + g.radius) {
                        slowed = true;
                        e.health -= g.damagePerFrame;
                    }
                });
                e.slowFactor = slowed ? 0.5 : 1;

                // BURN EFFECT
                if (e.burnTimer && e.burnTimer > 0) {
                    e.burnTimer--;
                    if (e.burnTimer % 30 === 0) {
                        e.health -= (e.burnDamage || 0);
                    }
                }

                // Aturdimiento (Pulverizer): no se mueve
                if (e.frozen && e.frozen > 0) { e.frozen--; return; }

                // Simple Path Following (Similar to GameCanvas)
                const targetNode = SIM_PATH[e.pathIndex + 1];
                if (targetNode) {
                    const dx = targetNode.x - e.x;
                    const dy = targetNode.y - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const effectiveSpeed = e.speed * (e.slowFactor || 1);

                    if (dist < effectiveSpeed) {
                        e.x = targetNode.x;
                        e.y = targetNode.y;
                        e.pathIndex++;
                        if(e.pathIndex >= SIM_PATH.length - 1) {
                            // Loop back
                            e.pathIndex = 0;
                            e.x = SIM_PATH[0].x;
                            e.y = SIM_PATH[0].y;
                            e.health = e.maxHealth;
                        }
                    } else {
                        e.x += (dx / dist) * effectiveSpeed;
                        e.y += (dy / dist) * effectiveSpeed;
                    }
                }
            });

            // 3. TOWER ATTACK LOGIC
            if (tower.cooldownTimer > 0) tower.cooldownTimer--;

            // Monk Check: Don't fire if arrow active
            let canFire = true;
            if (type === TowerType.MONK && tower.activeProjectileId) {
                const exists = projectiles.some(p => p.id === tower.activeProjectileId);
                if (exists) canFire = false;
                else tower.activeProjectileId = null;
            }

            // Find target
            const inRange = enemies.filter(e => Math.hypot(e.x - tower.x, e.y - tower.y) <= tower.range);
            // Sort by distance
            inRange.sort((a,b) => {
                const da = Math.hypot(a.x - tower.x, a.y - tower.y);
                const db = Math.hypot(b.x - tower.x, b.y - tower.y);
                return da - db;
            });
            
            const target = inRange[0];

            if (target && tower.cooldownTimer <= 0 && canFire) {
                const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
                tower.rotation = angle;

                if (type === TowerType.TESLA) {
                     tower.cooldownTimer = tower.cooldown;
                     const chain = inRange.slice(0, 4).map(e => e.id); 
                     projectiles.push({
                         id: Math.random().toString(), type: 'LIGHTNING',
                         x: tower.x, y: tower.y, chainIds: chain,
                         color: tower.color, radius: 0, damage: 0, speed: 0, velocity: {x:0,y:0}, pierce: 0, lifespan: 20, targetId: null
                     });
                     inRange.slice(0, 4).forEach(e => e.health -= tower.damage);
                
                } else if (type === TowerType.LASER) {
                     tower.cooldownTimer = tower.cooldown;
                     projectiles.push({
                         id: Math.random().toString(), type: 'BEAM',
                         x: tower.x, y: tower.y, endX: tower.x + Math.cos(angle)*800, endY: tower.y + Math.sin(angle)*800,
                         color: '#0ff', radius: 0, damage: 0, speed: 0, velocity: {x:0,y:0}, pierce: 0, lifespan: 20, targetId: null
                     });
                     // Hitscan simulation
                     enemies.forEach(e => {
                         // Simple box check for sim
                         if (Math.hypot(e.x - tower.x, e.y - tower.y) < 800) {
                            const angleToEnemy = Math.atan2(e.y - tower.y, e.x - tower.x);
                            if (Math.abs(angleToEnemy - angle) < 0.1) e.health -= tower.damage;
                         }
                     });

                } else if (type === TowerType.FLAMETHROWER) {
                    tower.cooldownTimer = tower.cooldown;
                    
                    const spread = 0.4;
                    const randomizedAngle = angle + (Math.random() * spread - spread/2);

                     projectiles.push({
                         id: Math.random().toString(), type: 'FLAME', // Correct Type
                         x: tower.x, y: tower.y, targetId: target.id,
                         velocity: { x: Math.cos(randomizedAngle) * 5, y: Math.sin(randomizedAngle) * 5 }, 
                         speed: 5, damage: tower.damage, color: '#ff5500', // Orange
                         radius: 5, pierce: 3, lifespan: 30, hitIds: []
                    });

                } else if (type === TowerType.CHEMIST) {
                     tower.cooldownTimer = tower.cooldown;
                     projectiles.push({
                         id: Math.random().toString(), type: 'GLUE_BOMB',
                         x: tower.x, y: tower.y, 
                         endX: target.x, endY: target.y, // Target location
                         velocity: { x: Math.cos(angle)*6, y: Math.sin(angle)*6 }, 
                         speed: 6, damage: tower.damage, color: '#bef264', radius: 6, 
                         pierce: 0, lifespan: 60, targetId: null
                     });

                } else if (type === TowerType.MONK) {
                    tower.cooldownTimer = 9999; // Wait for hit
                    const pid = Math.random().toString();
                    tower.activeProjectileId = pid;
                    projectiles.push({
                        id: pid, ownerId: tower.id, type: 'ARROW',
                        x: tower.x, y: tower.y, targetId: target.id,
                        velocity: { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 },
                        speed: 3, acceleration: 0.15, // Accelerates
                        damage: tower.damage, color: '#ff99aa', radius: 4, pierce: 1, lifespan: 300
                    });
                
                } else if (type === TowerType.TURRET) {
                    // Sentry
                    tower.cooldownTimer = tower.cooldown;
                    projectiles.push({
                        id: Math.random().toString(), type: 'BULLET',
                        x: tower.x, y: tower.y, targetId: target.id,
                        velocity: { x: Math.cos(angle)*8, y: Math.sin(angle)*8 },
                        speed: 8, damage: tower.damage, 
                        color: '#ffff00', // Sync with GAME CANVAS (Yellow Bullets)
                        radius: 3, pierce: 1, lifespan: 60
                    });

                } else if (type === TowerType.SHOCKWAVE) {
                    // Pulso en área: daña y aturde 0,5 s a todo lo que esté en alcance (como en el juego)
                    tower.cooldownTimer = tower.cooldown;
                    inRange.forEach(e => { e.health -= tower.damage; e.frozen = 30; });
                    groundEffects.push({
                        id: Math.random().toString(), type: 'SHOCKWAVE', x: tower.x, y: tower.y,
                        radius: tower.range, lifespan: 15, damagePerFrame: 0, slowFactor: 0
                    });

                } else if (type === TowerType.MORTAR) {
                    // Obús al punto donde estará el enemigo, daño en área al caer
                    tower.cooldownTimer = tower.cooldown;
                    const speed = 4;
                    const travel = Math.hypot(target.x - tower.x, target.y - tower.y) / speed;
                    const nextNode = SIM_PATH[target.pathIndex + 1];
                    let px = target.x, py = target.y;
                    if (nextNode) {
                        const dx = nextNode.x - target.x, dy = nextNode.y - target.y;
                        const d = Math.hypot(dx, dy) || 1;
                        px += (dx / d) * target.speed * travel; py += (dy / d) * target.speed * travel;
                    }
                    projectiles.push({
                        id: Math.random().toString(), ownerId: tower.id, x: tower.x, y: tower.y, targetId: null,
                        endX: px, endY: py, velocity: { x: 0, y: 0 }, speed, damage: tower.damage,
                        color: '#71717a', radius: 6, type: 'MORTAR_SHELL', pierce: 0, lifespan: 120, splashRadius: 70
                    });

                } else {
                    // Generic
                    tower.cooldownTimer = tower.cooldown;
                    projectiles.push({
                        id: Math.random().toString(), type: 'BULLET',
                        x: tower.x, y: tower.y, targetId: target.id,
                        velocity: { x: Math.cos(angle)*8, y: Math.sin(angle)*8 },
                        speed: 8, damage: tower.damage, color: '#ffff00', radius: 3, pierce: 1, lifespan: 60
                    });
                }
            } else if (target) {
                tower.rotation = Math.atan2(target.y - tower.y, target.x - tower.x);
            }

            // 4. PROJECTILE UPDATE
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                p.lifespan--;
                
                if (p.lifespan <= 0) {
                    // Monk miss penalty logic
                    if (p.type === 'ARROW' && tower.activeProjectileId === p.id) {
                         tower.activeProjectileId = null;
                         tower.cooldownTimer = 30;
                    }
                    projectiles.splice(i, 1);
                    continue;
                }
                
                if (p.type === 'BEAM' || p.type === 'LIGHTNING') continue;

                if (p.type === 'MORTAR_SHELL' && p.endX !== undefined && p.endY !== undefined) {
                    const dx = p.endX - p.x, dy = p.endY - p.y;
                    const d = Math.hypot(dx, dy);
                    if (d < p.speed) {
                        const r = p.splashRadius || 70;
                        groundEffects.push({
                            id: Math.random().toString(), type: 'FIRE_POOL', x: p.endX, y: p.endY,
                            radius: r, lifespan: 15, damagePerFrame: 0, slowFactor: 0
                        });
                        enemies.forEach(e => { if (Math.hypot(e.x - p.endX!, e.y - p.endY!) <= r) e.health -= p.damage; });
                        projectiles.splice(i, 1);
                    } else {
                        p.x += (dx / d) * p.speed; p.y += (dy / d) * p.speed;
                    }
                    continue;
                }

                // CHEMIST LOGIC
                if (p.type === 'GLUE_BOMB' && p.endX) {
                     const d = Math.hypot(p.x - p.endX, p.y - (p.endY || 0));
                     if (d < 10) {
                         groundEffects.push({
                             id: Math.random().toString(), type: 'ACID_POOL', x: p.endX, y: p.endY || 0,
                             radius: 40, lifespan: 90, damagePerFrame: 0.1, slowFactor: 0.5
                         });
                         projectiles.splice(i, 1);
                         continue;
                     }
                     // Move to target
                     const a = Math.atan2((p.endY||0) - p.y, p.endX - p.x);
                     p.x += Math.cos(a) * p.speed;
                     p.y += Math.sin(a) * p.speed;
                     continue; // Skip collision
                }

                // ARROW HOMING LOGIC
                if (p.type === 'ARROW') {
                    const t = enemies.find(e => e.id === p.targetId);
                    if (t) {
                         const a = Math.atan2(t.y - p.y, t.x - p.x);
                         p.velocity.x = Math.cos(a) * p.speed;
                         p.velocity.y = Math.sin(a) * p.speed;
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

                // Collision
                for (const e of enemies) {
                    if (Math.hypot(p.x - e.x, p.y - e.y) < (e.radius + p.radius)) {
                        
                         // FLAME LOGIC: One hit per particle per enemy
                        if (p.type === 'FLAME') {
                            if (p.hitIds && p.hitIds.includes(e.id)) continue; // Already hit this enemy
                            
                            p.hitIds?.push(e.id);
                            
                            // Apply burn status
                            e.burnTimer = 180; // 3 seconds
                            e.burnDamage = 5; // Tick damage every 0.5s
                        }

                        e.health -= p.damage;
                        p.pierce--;
                        
                        // Monk hit logic
                        if (p.type === 'ARROW' && tower.activeProjectileId === p.id) {
                            tower.activeProjectileId = null;
                            tower.cooldownTimer = 5;
                        }

                        if (p.pierce <= 0) {
                            projectiles.splice(i, 1);
                            break;
                        }
                    }
                }
            }

            // 5. CLEANUP
            simRef.current.enemies = enemies.filter(e => e.health > 0);
            simRef.current.groundEffects = groundEffects.filter(g => {
                g.lifespan--;
                return g.lifespan > 0;
            });
        };

        const drawMap = () => {
             // Draw Background (Dark Grey)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            for(let x=0; x<canvas.width; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }

            // Draw Path
            if (SIM_PATH.length > 0) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // Border
                ctx.beginPath();
                ctx.lineWidth = 48;
                ctx.strokeStyle = '#111';
                ctx.moveTo(SIM_PATH[0].x, SIM_PATH[0].y);
                for(let i=1; i<SIM_PATH.length; i++) ctx.lineTo(SIM_PATH[i].x, SIM_PATH[i].y);
                ctx.stroke();

                // Road
                ctx.beginPath();
                ctx.lineWidth = 38;
                ctx.strokeStyle = '#333';
                ctx.moveTo(SIM_PATH[0].x, SIM_PATH[0].y);
                for(let i=1; i<SIM_PATH.length; i++) ctx.lineTo(SIM_PATH[i].x, SIM_PATH[i].y);
                ctx.stroke();

                // Lines
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#555';
                ctx.setLineDash([15, 15]);
                ctx.moveTo(SIM_PATH[0].x, SIM_PATH[0].y);
                for(let i=1; i<SIM_PATH.length; i++) ctx.lineTo(SIM_PATH[i].x, SIM_PATH[i].y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        };

        const draw = () => {
            drawMap();

            const context = { ctx, frame: simRef.current.frame };
            
            // Draw Effects
            simRef.current.groundEffects.forEach(g => drawGroundEffect(context, g));

            // Draw Tower
            if (simRef.current.tower) {
                drawTower(context, simRef.current.tower);
                // Range Ring
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.setLineDash([5,5]);
                ctx.beginPath(); ctx.arc(simRef.current.tower.x, simRef.current.tower.y, simRef.current.tower.range, 0, Math.PI*2); ctx.stroke();
                ctx.setLineDash([]);
            }

            // Command Link: torre apoyada, rayos de buff y cartel
            const partner = simRef.current.partner;
            if (partner && simRef.current.tower) {
                const radar = simRef.current.tower;
                const on = !!partner.isBuffed;
                drawTower(context, partner);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.setLineDash([5,5]);
                ctx.beginPath(); ctx.arc(partner.x, partner.y, partner.range, 0, Math.PI*2); ctx.stroke();
                ctx.setLineDash([]);
                if (on) {
                    const pulse = 0.5 + 0.5 * Math.sin(simRef.current.frame / 8);
                    ctx.strokeStyle = `rgba(56,189,248,${0.5 + pulse * 0.4})`;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath(); ctx.moveTo(radar.x, radar.y); ctx.lineTo(partner.x, partner.y); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.beginPath(); ctx.arc(partner.x, partner.y, 22 + pulse * 4, 0, Math.PI*2); ctx.stroke();
                }
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'left';
                ctx.fillStyle = on ? '#38bdf8' : '#a3a3a3';
                ctx.fillText(on ? 'BUFF ACTIVO: +15% daño, velocidad y alcance' : 'SIN BUFF (Sentry sola)', 12, 24);
                ctx.fillStyle = '#737373';
                ctx.font = '12px monospace';
                ctx.fillText('El Command Link no dispara: potencia a las torres cercanas', 12, 44);
            }

            // Draw Enemies
            simRef.current.enemies.forEach(e => drawEnemy(context, e));

            // Draw Projectiles
            simRef.current.projectiles.forEach(p => drawProjectile(context, p, simRef.current.enemies));
        };

        // Paso fijo de 60 actualizaciones por segundo, igual en cualquier monitor (antes iba un paso por fotograma)
        const STEP_MS = 1000 / 60;
        let last = performance.now();
        let acc = 0;
        const loop = (now: number) => {
            acc += Math.min(now - last, 250);
            last = now;
            let steps = 0;
            while (acc >= STEP_MS && steps < 5) { update(); acc -= STEP_MS; steps++; }
            if (steps === 5) acc = 0;
            draw();
            reqRef.current = requestAnimationFrame(loop);
        };
        reqRef.current = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(reqRef.current);
    }, [type]);

    return <canvas ref={canvasRef} width={600} height={300} className="w-full aspect-[2/1] bg-black rounded border border-neutral-700 mb-4 shadow-inner" />;
};

// --- 3. THREAT DEMO (animación en bucle para cada amenaza, estilo carta) ---

const THREAT_CAPTION: Record<string, string> = {
    WALKER: 'Camina por el camino. Débil, pero llega en masa.',
    RUNNER: 'Rápido y frágil: te quita 4 vidas si llega.',
    TANK: 'Aguanta mucho. Al morir suelta 3 Walkers.',
    BOSS: 'Jefe. Al morir suelta 3 Tanks.',
    MATRYOSHKA: 'Se abre en cadena: suelta 3 Bosses al morir, y cada Boss suelta 3 Tanks.',
    HEALER: 'Cura a los enemigos cercanos (3% de su vida máxima cada 0,5 s). Mátalo primero.',
    ICE_MAGE: 'Dispara a tus torres y las congela: disparan 20% más lento durante 3 s.',
    NINJA: 'Muy rápido. Al llegar paraliza todas tus torres 3 s y quita 1 vida.',
};

const THREAT_PATH_Y = 120;

const ThreatDemo: React.FC<{ type: EnemyType }> = ({ type }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const reqRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width, H = canvas.height;
        const stats = ENEMY_STATS[type];

        const mk = (t: EnemyType, x: number, y: number, frac: number, scale = 1): Enemy => {
            const st = ENEMY_STATS[t];
            return {
                id: `${t}-${Math.round(x)}-${Math.round(y)}`, type: t, x, y,
                health: st.hp * frac, maxHealth: st.hp, speed: 0, pathIndex: 0, distanceTraveled: 0,
                reward: 0, damageToPlayer: 0, color: st.color, radius: st.radius * scale, isHealer: st.isHealer
            };
        };
        const mkTower = (x: number, y: number, extra: Partial<Tower> = {}): Tower => {
            const d = TOWER_DEFINITIONS[TowerType.TURRET];
            return {
                id: 'demo-tower', type: TowerType.TURRET, x, y, range: 0, damage: 0, cooldown: 0, cooldownTimer: 0, cost: 0,
                level: 1, color: d.color || '#ef4444', name: '', description: '', rotation: 0, frame: 0, totalDamage: 0, ...extra
            } as Tower;
        };
        const road = () => {
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#111'; ctx.lineWidth = 46; ctx.beginPath(); ctx.moveTo(0, THREAT_PATH_Y); ctx.lineTo(W, THREAT_PATH_Y); ctx.stroke();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 38; ctx.beginPath(); ctx.moveTo(0, THREAT_PATH_Y); ctx.lineTo(W, THREAT_PATH_Y); ctx.stroke();
            ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.setLineDash([15, 15]);
            ctx.beginPath(); ctx.moveTo(0, THREAT_PATH_Y); ctx.lineTo(W, THREAT_PATH_Y); ctx.stroke(); ctx.setLineDash([]);
        };
        const label = (txt: string, x: number, y: number, color = '#fff', size = 13) => {
            ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(txt, x, y);
        };
        const ring = (x: number, y: number, r: number, color: string, w = 3) => {
            ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        };
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

        const LOOP = 8; // segundos
        const render = (tt: number) => {
            const t = tt % LOOP;
            const frame = Math.floor(tt * 60);
            const dc = { ctx, frame };
            road();
            const y = THREAT_PATH_Y;

            if (stats.onDeathSpawn) {
                // Tanque, Boss, Matryoshka: caminan, reciben disparos, mueren y sueltan 3 del siguiente tipo
                const child = stats.onDeathSpawn.type, n = stats.onDeathSpawn.count;
                const DIE = 3;
                const px = 40 + (t / DIE) * 150;
                const sentry = mkTower(190, 48, { rotation: Math.PI / 2 });
                drawTower(dc, sentry);
                if (t < DIE) {
                    drawEnemy(dc, mk(type, px, y, 1 - clamp01(t / DIE) * 1.0 + 0.001));
                    if (frame % 6 < 3) { ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(190, 48); ctx.lineTo(px, y); ctx.stroke(); }
                } else {
                    const dx = 190;
                    const k = t - DIE;
                    if (k < 0.5) { ring(dx, y, 10 + k * 90, `rgba(251,191,36,${1 - k * 2})`, 4); label('¡MUERE!', dx, y - 40, '#fbbf24'); }
                    for (let i = 0; i < n; i++) {
                        const off = (i - (n - 1) / 2) * ENEMY_STATS[child].radius * 2.3;
                        const pop = clamp01((k - 0.15) / 0.35);
                        const walk = Math.max(0, k - 0.5) * (ENEMY_STATS[child].speed * 45);
                        const cx = dx + off * pop + walk;
                        const cy = y + (1 - pop) * -18;
                        drawEnemy(dc, mk(child, Math.min(cx, W - 15), cy, 1, 0.4 + 0.6 * pop));
                    }
                    if (k > 0.4) label(`+${n} ${child}`, dx, y - 40, '#fca5a5');
                }
            } else if (type === EnemyType.HEALER) {
                // Healer: aura, aliados heridos que se recuperan
                const hx = 110 + Math.sin(t * 0.6) * 20;
                const pulse = 0.5 + 0.5 * Math.sin(tt * 4);
                ring(hx, y, 95, `rgba(74,222,128,${0.25 + pulse * 0.2})`, 2);
                ring(hx, y, 95 * ((t * 1.5) % 1), 'rgba(74,222,128,0.35)', 2);
                const cyc = (t % 4) / 4;
                [0, 1, 2].forEach(i => {
                    const ax = 200 + i * 38, frac = clamp01(0.3 + 0.7 * ((cyc + i * 0.2) % 1));
                    const e = mk(EnemyType.WALKER, ax, y, frac);
                    drawEnemy(dc, e);
                    if (Math.hypot(ax - hx, 0) < 95 + 20) label('+', ax, y - 22, '#4ade80', 16);
                });
                drawEnemy(dc, mk(type, hx, y, 1));
                label('Cura a los que están dentro del círculo', W / 2, 28, '#86efac', 12);
            } else if (type === EnemyType.ICE_MAGE) {
                // Ice Mage dispara a una torre y la congela
                const mx = 70 + Math.min(t, 6) * 12;
                const tower = mkTower(250, 52, { rotation: Math.PI / 2 });
                const cycle = t % 4;
                const frozen = cycle > 1.2 && cycle < 4;
                if (frozen) tower.frozenTimer = 60;
                drawTower(dc, tower);
                drawEnemy(dc, mk(type, mx, y, 1));
                if (cycle < 1.2) {
                    const p = cycle / 1.2;
                    const bx = mx + (250 - mx) * p, by = y + (52 - y) * p;
                    ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
                    ring(bx, by, 9, 'rgba(147,197,253,0.5)', 2);
                }
                if (frozen) label('CONGELADA: -20% velocidad de disparo', 250, 22, '#93c5fd', 12);
            } else if (type === EnemyType.NINJA) {
                // Ninja: corre, llega al final, paraliza torres
                const run = clamp01(t / 2.2);
                const nx = 20 + run * (W - 45);
                const stun = t > 2.2 && t < 5.2;
                [90, 190, 290].forEach((tx, i) => {
                    const tw = mkTower(tx, 48 + (i % 2) * 8, { rotation: Math.PI / 2 });
                    if (stun) tw.stunnedTimer = 60;
                    ctx.save();
                    if (stun) ctx.globalAlpha = 0.55;
                    drawTower(dc, tw);
                    ctx.restore();
                    if (stun) label('zZ', tx, 24, '#fde047', 14);
                });
                if (t < 2.7) drawEnemy(dc, mk(type, nx, y, 1));
                if (t > 2.2 && t < 2.9) ring(W - 25, y, 10 + (t - 2.2) * 60, `rgba(250,204,21,${1 - (t - 2.2) / 0.7})`, 4);
                if (stun) label('TORRES PARALIZADAS 3 s  (-1 vida)', W / 2, H - 14, '#fde047', 12);
            } else {
                // Walker, Runner: caminan por el camino
                const sp = stats.speed * 55;
                for (let i = 0; i < 3; i++) {
                    const x = ((t * sp + i * 70) % (W + 40)) - 20;
                    drawEnemy(dc, mk(type, x, y, 1));
                }
            }
        };

        // Paso fijo: el tiempo de la animación se mide en segundos reales, igual en cualquier monitor
        const t0 = performance.now();
        const loop = (now: number) => {
            render((now - t0) / 1000);
            reqRef.current = requestAnimationFrame(loop);
        };
        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [type]);

    return <canvas ref={canvasRef} width={400} height={200} className="w-full aspect-[2/1] bg-black rounded-lg border border-neutral-700 shadow-inner" />;
};

// --- MAIN COMPONENT ---


interface BestiaryProps {
    onBack: () => void;
}

export const Bestiary: React.FC<BestiaryProps> = ({ onBack }) => {
    const [tab, setTab] = useState<'ENEMIES' | 'TOWERS'>('ENEMIES');
    const [selectedItem, setSelectedItem] = useState<any | null>(null); // For Modal

    return (
        <div className="min-h-screen bg-[#1c2b44] relative flex flex-col">
            {/* --- TOP NAVIGATION BAR --- */}
            <div className="bg-[#141e30] border-b border-[#2d405e] p-2 sticky top-0 z-20 shadow-xl">
                 <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button onClick={onBack} className="p-2 text-neutral-400 hover:text-white">
                        <ChevronLeft />
                    </button>
                    <h1 className="font-title text-xl text-[#bde0ff] tracking-wider shadow-black drop-shadow-md">
                        INTELLIGENCE DATABASE
                    </h1>
                    <div className="w-10"></div> {/* Spacer */}
                 </div>
                 
                 {/* Tabs */}
                 <div className="flex justify-center gap-8 mt-4">
                     <button 
                        onClick={() => setTab('ENEMIES')}
                        className={`pb-2 px-4 font-bold uppercase text-sm tracking-wide transition-all border-b-4 ${
                            tab === 'ENEMIES' 
                            ? 'border-[#ff4f4f] text-white' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-300'
                        }`}
                     >
                        <div className="flex items-center gap-2">
                            <Sword className="w-4 h-4" /> Threats
                        </div>
                     </button>
                     <button 
                        onClick={() => setTab('TOWERS')}
                        className={`pb-2 px-4 font-bold uppercase text-sm tracking-wide transition-all border-b-4 ${
                            tab === 'TOWERS' 
                            ? 'border-[#4f8aff] text-white' 
                            : 'border-transparent text-neutral-500 hover:text-neutral-300'
                        }`}
                     >
                         <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Defenses
                        </div>
                     </button>
                 </div>
            </div>

            {/* --- CONTENT GRID --- */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-4xl mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    
                    {/* ENEMIES GRID */}
                    {tab === 'ENEMIES' && Object.values(EnemyType).map((type) => {
                        const stats = ENEMY_STATS[type];
                        const rarityColor = type === EnemyType.MATRYOSHKA ? 'border-purple-500 bg-purple-900/20' 
                                          : type === EnemyType.BOSS ? 'border-orange-500 bg-orange-900/20' 
                                          : 'border-blue-500 bg-blue-900/20';
                        
                        return (
                            <div 
                                key={type}
                                onClick={() => setSelectedItem({ type, category: 'ENEMY', stats, name: type.replace(/_/g, ' ') })}
                                className={`group relative aspect-[3/4] bg-[#1e2a3b] rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-lg overflow-hidden ${rarityColor.split(' ')[0]}`}
                            >
                                {/* Card Background Glow */}
                                <div className={`absolute inset-0 opacity-30 bg-gradient-to-b from-transparent to-black ${rarityColor.split(' ')[1]}`}></div>
                                
                                {/* Icon (CANVAS RENDERER) */}
                                <div className="absolute inset-0 flex items-center justify-center pb-6 group-hover:scale-110 transition-transform duration-300">
                                    <EntityCardRenderer type={type} />
                                </div>

                                {/* Name Label */}
                                <div className="absolute bottom-0 left-0 right-0 bg-[#111827] py-2 px-1 border-t border-white/10">
                                    <div className="text-center text-[10px] sm:text-xs font-bold text-white uppercase truncate">
                                        {type.replace(/_/g, ' ')}
                                    </div>
                                </div>
                                
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Info className="w-4 h-4 text-white drop-shadow" />
                                </div>
                            </div>
                        );
                    })}

                    {/* TOWERS GRID */}
                    {tab === 'TOWERS' && Object.values(TowerType).map((type) => {
                        const def = TOWER_DEFINITIONS[type];
                        const cost = def.cost || 0;
                        const rarityClass = cost > 800 ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                                          : cost > 400 ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                                          : 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]';

                        return (
                            <div 
                                key={type}
                                onClick={() => setSelectedItem({ type, category: 'TOWER', stats: def, name: def.name })}
                                className={`group relative aspect-[3/4] bg-[#232b3a] rounded-xl border-2 border-b-[6px] ${rarityClass} active:border-b-2 active:translate-y-1 transition-all cursor-pointer overflow-hidden`}
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent"></div>

                                {/* Icon (CANVAS RENDERER) */}
                                <div className="absolute inset-0 flex items-center justify-center pb-8 group-hover:scale-110 transition-transform duration-300">
                                     <EntityCardRenderer type={type} />
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm py-2 px-1 border-t border-white/10 flex flex-col items-center">
                                    <div className="text-[10px] sm:text-xs font-bold text-white uppercase truncate w-full text-center px-1">
                                        {def.name}
                                    </div>
                                    <div className="text-[10px] text-yellow-400 font-mono">
                                        ${cost}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- DETAIL MODAL --- */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1e293b] w-full max-w-md rounded-xl border border-[#334155] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="bg-[#0f172a] p-4 flex justify-between items-center border-b border-[#334155]">
                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">{selectedItem.name}</h2>
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="text-neutral-400 hover:text-white font-bold"
                            >
                                CLOSE
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            
                            {selectedItem.category === 'TOWER' && (
                                <>
                                    {/* THE REAL SIMULATION */}
                                    <CombatSimulation type={selectedItem.type} />
                                    {USE_TIPS[selectedItem.type] && (
                                        <p className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-800/50 rounded p-2 mb-3">
                                            <strong>Uso correcto:</strong> {USE_TIPS[selectedItem.type]}
                                        </p>
                                    )}

                                    <p className="text-sm text-neutral-300 italic mb-4 border-l-2 border-blue-500 pl-3">
                                        {selectedItem.stats.description}
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-[#0f172a] p-3 rounded">
                                            <div className="text-neutral-500 text-xs uppercase">Damage</div>
                                            <div className="text-white font-bold text-lg">{selectedItem.stats.damage}</div>
                                        </div>
                                        <div className="bg-[#0f172a] p-3 rounded">
                                            <div className="text-neutral-500 text-xs uppercase">Range</div>
                                            <div className="text-white font-bold text-lg">{selectedItem.stats.range}</div>
                                        </div>
                                        <div className="bg-[#0f172a] p-3 rounded">
                                            <div className="text-neutral-500 text-xs uppercase">Reload</div>
                                            <div className="text-white font-bold text-lg">{(selectedItem.stats.cooldown / 60).toFixed(1)}s</div>
                                        </div>
                                        <div className="bg-[#0f172a] p-3 rounded">
                                            <div className="text-neutral-500 text-xs uppercase">Type</div>
                                            <div className="text-blue-400 font-bold">{selectedItem.type}</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedItem.category === 'ENEMY' && (() => {
                                const t = selectedItem.type as EnemyType;
                                const st = selectedItem.stats;
                                const rarity = t === EnemyType.MATRYOSHKA ? { name: 'ÉPICA', c: 'text-purple-300 border-purple-500', bar: 'from-purple-700 to-purple-500' }
                                             : t === EnemyType.BOSS ? { name: 'JEFE', c: 'text-orange-300 border-orange-500', bar: 'from-orange-700 to-orange-500' }
                                             : (st.onDeathSpawn || st.isHealer || st.attackRange || t === EnemyType.NINJA) ? { name: 'ESPECIAL', c: 'text-sky-300 border-sky-500', bar: 'from-sky-700 to-sky-500' }
                                             : { name: 'COMÚN', c: 'text-neutral-300 border-neutral-500', bar: 'from-neutral-700 to-neutral-500' };
                                return (
                                    <div className={`rounded-xl border-2 ${rarity.c.split(' ')[1]} overflow-hidden bg-[#0f172a]`}>
                                        <div className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${rarity.bar}`}>
                                            <span className="font-bold text-white uppercase tracking-wide text-sm">{selectedItem.name}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-black/40 ${rarity.c.split(' ')[0]}`}>{rarity.name}</span>
                                        </div>
                                        <div className="p-2">
                                            <ThreatDemo type={t} />
                                        </div>
                                        <p className="px-3 pb-3 text-xs text-neutral-200 leading-snug">{THREAT_CAPTION[t]}</p>
                                        <div className="grid grid-cols-4 gap-px bg-[#334155] text-center">
                                            <div className="bg-[#0f172a] py-2"><div className="text-[9px] text-neutral-500 uppercase">Vida</div><div className="text-green-400 font-bold">{st.hp}</div></div>
                                            <div className="bg-[#0f172a] py-2"><div className="text-[9px] text-neutral-500 uppercase">Velocidad</div><div className="text-yellow-400 font-bold">{st.speed}</div></div>
                                            <div className="bg-[#0f172a] py-2"><div className="text-[9px] text-neutral-500 uppercase">Daño</div><div className="text-red-400 font-bold">{st.damageToPlayer}</div></div>
                                            <div className="bg-[#0f172a] py-2"><div className="text-[9px] text-neutral-500 uppercase">Botín</div><div className="text-blue-400 font-bold">${st.reward}</div></div>
                                        </div>
                                    </div>
                                );
                            })()}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
