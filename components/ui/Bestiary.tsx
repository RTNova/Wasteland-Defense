
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

const CombatSimulation: React.FC<{ type: TowerType }> = ({ type }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const reqRef = useRef<number>(0);

    // State refs for the simulation loop
    const simRef = useRef({
        enemies: [] as Enemy[],
        projectiles: [] as Projectile[],
        groundEffects: [] as GroundEffect[],
        tower: null as Tower | null,
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

        simRef.current.enemies = [];
        simRef.current.projectiles = [];
        simRef.current.groundEffects = [];
        simRef.current.frame = 0;

        // --- SIMULATION LOOP ---
        const update = () => {
            const state = simRef.current;
            state.frame++;
            const { tower, enemies, projectiles, groundEffects } = state;

            if (!tower) return;

            // 1. SPAWN LOGIC (Tailored to showcase tower)
            if (enemies.length === 0 || (state.spawnTimer > 0 && state.frame % 25 === 0)) {
                if (enemies.length === 0) state.spawnTimer = 1; 

                let spawnType = EnemyType.WALKER;
                let batchSize = 1;

                // Customize scenario based on tower strength
                if (type === TowerType.TESLA || type === TowerType.FLAMETHROWER || type === TowerType.CHEMIST) {
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
                        x: start.x - 20, 
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
                         radius: 5, pierce: 99, lifespan: 30, hitIds: []
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

            // Draw Enemies
            simRef.current.enemies.forEach(e => drawEnemy(context, e));

            // Draw Projectiles
            simRef.current.projectiles.forEach(p => drawProjectile(context, p, simRef.current.enemies));
        };

        const loop = () => {
            update();
            draw();
            reqRef.current = requestAnimationFrame(loop);
        };
        loop();

        return () => cancelAnimationFrame(reqRef.current);
    }, [type]);

    return <canvas ref={canvasRef} width={600} height={300} className="w-full h-64 bg-black rounded border border-neutral-700 mb-4 shadow-inner" />;
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
                                onClick={() => setSelectedItem({ type, category: 'ENEMY', stats, name: type })}
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
                                        {type}
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

                            {selectedItem.category === 'ENEMY' && (
                                <div className="text-center">
                                    <div className="mb-6 flex justify-center scale-150">
                                        <EntityCardRenderer type={selectedItem.type} />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                                        <div className="bg-[#0f172a] p-3 rounded border-l-4 border-green-500">
                                            <div className="text-neutral-500 text-xs uppercase">Hit Points</div>
                                            <div className="text-white font-bold text-xl">{selectedItem.stats.hp}</div>
                                        </div>
                                        <div className="bg-[#0f172a] p-3 rounded border-l-4 border-yellow-500">
                                            <div className="text-neutral-500 text-xs uppercase">Speed</div>
                                            <div className="text-white font-bold text-xl">{selectedItem.stats.speed}</div>
                                        </div>
                                        <div className="bg-[#0f172a] p-3 rounded border-l-4 border-red-500">
                                            <div className="text-neutral-500 text-xs uppercase">Player DMG</div>
                                            <div className="text-white font-bold text-xl">{selectedItem.stats.damageToPlayer}</div>
                                        </div>
                                        <div className="bg-[#0f172a] p-3 rounded border-l-4 border-blue-500">
                                            <div className="text-neutral-500 text-xs uppercase">Bounty</div>
                                            <div className="text-white font-bold text-xl">${selectedItem.stats.reward}</div>
                                        </div>
                                    </div>

                                    {selectedItem.stats.onDeathSpawn && (
                                        <div className="bg-red-900/30 p-3 rounded text-sm text-red-200 border border-red-900/50">
                                            ⚠️ Spawns <strong>{selectedItem.stats.onDeathSpawn.count}x {selectedItem.stats.onDeathSpawn.type}</strong> upon death.
                                        </div>
                                    )}
                                    {selectedItem.stats.isHealer && (
                                        <div className="bg-green-900/30 p-3 rounded text-sm text-green-200 border border-green-900/50">
                                            💖 Heals nearby allies continuously. Bursts heal on death.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
