
import { Enemy, Tower, Projectile, EnemyType, TowerType, GroundEffect, StatusFeedbackPopup } from '../../types/index';

// Helper Types
interface DrawContext {
    ctx: CanvasRenderingContext2D;
    frame: number;
}

export const drawTower = ({ ctx, frame }: DrawContext, tower: Tower, isGhost: boolean = false) => {
    const { x, y, type, rotation, color, level } = tower;
    ctx.save();
    ctx.translate(x, y);
    
    // -- HUD LAYER (Non-Rotated) -- 
    if (!isGhost && type === TowerType.MONK && level === 7) {
         // Hunter Ammo HUD
         const ammo = tower.ammo || 0;
         const maxAmmo = 5; 
         const slotW = 6;
         const gap = 2;
         const totalWidth = (maxAmmo * slotW) + ((maxAmmo - 1) * gap);
         const startX = -(totalWidth/2);
         const hudY = -28;

         ctx.fillStyle = 'rgba(0,0,0,0.8)';
         ctx.fillRect(startX - 2, hudY - 2, totalWidth + 4, 8);
         ctx.strokeStyle = '#555';
         ctx.lineWidth = 1;
         ctx.strokeRect(startX - 2, hudY - 2, totalWidth + 4, 8);

         for(let i=0; i<maxAmmo; i++) {
             ctx.fillStyle = i < ammo ? '#f43f5e' : '#333';
             ctx.fillRect(startX + i * (slotW + gap), hudY, slotW, 4);
             if (i < ammo) {
                 ctx.shadowColor = '#f43f5e';
                 ctx.shadowBlur = 5;
                 ctx.fillRect(startX + i * (slotW + gap), hudY, slotW, 4);
                 ctx.shadowBlur = 0;
             }
         }
    }

    // Buff Indicator (from Radar)
    if (tower.isBuffed && !isGhost) {
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(14, 165, 233, ${0.5 + Math.sin(frame * 0.2) * 0.3})`; // Sky blue pulse
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Status Effects
    if (!isGhost) {
        if (tower.stunnedTimer && tower.stunnedTimer > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Static white out
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            for(let i=0; i<4; i++) {
                const angle = Math.random() * Math.PI*2;
                ctx.moveTo(0,0);
                ctx.lineTo(Math.cos(angle)*20, Math.sin(angle)*20);
                ctx.stroke();
            }
        } else if (tower.frozenTimer && tower.frozenTimer > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Ice Blue
            ctx.fill();
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // Radar Passive Range Visual
    if (type === TowerType.RADAR && !isGhost) {
        ctx.beginPath();
        ctx.arc(0, 0, tower.range, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.rotate(rotation);
    
    // --- SPECIAL BASES ---
    
    // TESLA COIL RENDER (Classic & Aggressive)
    if (type === TowerType.TESLA) {
        // Base
        ctx.fillStyle = '#111';
        ctx.fillRect(-10, -5, 20, 10);
        
        // Coils
        ctx.strokeStyle = level === 7 ? '#d8b4fe' : '#b87333'; // Purple or Copper
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-6, -5); ctx.lineTo(-6, -25);
        ctx.moveTo(6, -5); ctx.lineTo(6, -25);
        ctx.stroke();
        
        // Rings
        ctx.strokeStyle = level === 7 ? '#a855f7' : '#d97706';
        ctx.lineWidth = 2;
        for(let i=0; i<4; i++) {
            ctx.beginPath(); ctx.moveTo(-8, -10 - (i*5)); ctx.lineTo(8, -10 - (i*5)); ctx.stroke();
        }
        
        // Top Sphere
        const coreSize = 8 + Math.sin(frame * 0.5) * 1;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(0, -30, coreSize, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        // Aggressive Arcs to ground/base
        if (!isGhost && frame % 5 === 0) {
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             const startX = (Math.random()-0.5) * 10;
             const startY = -30 + (Math.random()-0.5) * 10;
             ctx.moveTo(startX, startY);
             // Jagged line to random ground point
             ctx.lineTo(startX * 2, -10);
             ctx.lineTo((Math.random()-0.5) * 20, 5);
             ctx.stroke();
        }

        ctx.restore();
        return;
    }

    // SHOCKWAVE Custom Draw
    if (type === TowerType.SHOCKWAVE) {
        ctx.fillStyle = '#18181b';
        // Hexagon Base
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const bx = Math.cos(angle) * 14;
            const by = Math.sin(angle) * 14;
            if (i === 0) ctx.moveTo(bx, by);
            else ctx.lineTo(bx, by);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = level >= 7 ? '#d946ef' : '#555';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (level >= 7) {
             const ringCount = 3;
             for(let i=0; i<ringCount; i++) {
                 const offset = (frame + (i*10)) % 30;
                 const size = 6 + (offset/30) * 12;
                 ctx.strokeStyle = `rgba(217, 70, 239, ${1 - offset/30})`;
                 ctx.lineWidth = 2;
                 ctx.beginPath(); ctx.arc(0,0, size, 0, Math.PI*2); ctx.stroke();
             }
             ctx.fillStyle = '#fff';
             ctx.beginPath(); ctx.arc(0,0, 5, 0, Math.PI*2); ctx.fill();
        } else if (level >= 4) {
             ctx.fillStyle = '#333';
             ctx.beginPath(); ctx.arc(-6, -6, 6, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(6, 6, 6, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = color;
             ctx.beginPath(); ctx.arc(-6, -6, 3, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(6, 6, 3, 0, Math.PI*2); ctx.fill();
        } else {
             ctx.fillStyle = '#333';
             ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
             ctx.fillStyle = color;
             ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
        }
        
        ctx.restore();
        return;
    }
    
    // MORTAR Custom Draw
    if (type === TowerType.MORTAR) {
        ctx.fillStyle = level >= 4 ? '#27272a' : '#3f3f46'; 
        ctx.fillRect(-12, -12, 24, 24); // Heavy Base
        
        if (level >= 7) {
             ctx.fillStyle = '#ca8a04'; // Caution Tape Color
             ctx.fillRect(-14, -14, 8, 8);
             ctx.fillRect(6, -14, 8, 8);
             ctx.fillRect(6, 6, 8, 8);
             ctx.fillRect(-14, 6, 8, 8);
        }

        const tubeLen = level >= 4 ? 22 : 18;
        const tubeWid = level >= 7 ? 16 : level >= 4 ? 14 : 12;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -5, tubeWid/2 + 2, 0, Math.PI*2); // Pivot
        ctx.fill();
        
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-(tubeWid/2), -tubeLen, tubeWid, tubeLen); 
        
        if (level >= 7) {
            const grd = ctx.createLinearGradient(0, -tubeLen, 0, 0);
            grd.addColorStop(0, '#ef4444');
            grd.addColorStop(1, '#18181b');
            ctx.fillStyle = grd;
            ctx.fillRect(-(tubeWid/2) + 2, -tubeLen + 2, tubeWid - 4, tubeLen - 4);
        }

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-(tubeWid/2), -tubeLen, tubeWid, tubeLen);
        
        ctx.restore();
        return;
    }

    // --- STANDARD BASE SHADOW & BODY ---
    if (!isGhost) {
       ctx.fillStyle = 'rgba(0,0,0,0.5)';
       ctx.beginPath();
       ctx.arc(2, 2, 15, 0, Math.PI * 2);
       ctx.fill();

       // Sentry Aura
       if (type === TowerType.TURRET && level === 7 && (tower.rampUpMultiplier||1) > 1.2) {
           ctx.beginPath();
           ctx.arc(0, 0, 22, 0, Math.PI*2);
           ctx.fillStyle = `rgba(255, 0, 0, ${0.2 + Math.sin(frame * 0.2) * 0.1})`;
           ctx.fill();
           ctx.strokeStyle = 'red';
           ctx.lineWidth = 1;
           ctx.stroke();
       }
    }

    let baseColor = level >= 4 ? '#222' : '#2a2a2a';
    let baseStroke = level === 7 ? '#ffd700' : '#111'; // Gold stroke for max level
    
    if (level === 7) {
        baseColor = '#000';
        baseStroke = '#fff';
        if (type === TowerType.FLAMETHROWER) baseStroke = '#3b82f6'; // Blue flame base
        if (type === TowerType.CHEMIST) baseStroke = '#0f3d0f'; 
    }

    if (type === TowerType.RADAR) {
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = baseStroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.rotate(frame * 0.05); // Continuous rotation
        ctx.fillStyle = color;
        ctx.beginPath(); 
        ctx.arc(0, -4, 10, 0, Math.PI, false); // Dish shape
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 6); ctx.stroke();
        ctx.fillStyle = '#f00';
        ctx.beginPath(); ctx.arc(0, 6, 2, 0, Math.PI*2); ctx.fill(); // Blinking light
        ctx.restore();
        
        ctx.restore();
        return; 
    }

    ctx.fillStyle = isGhost ? color : baseColor;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + (Math.min(level, 4) * 1), 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = level >= 5 ? 3 : 2;
    ctx.strokeStyle = baseStroke;
    ctx.stroke();

    // Level Details (Plates)
    if (level >= 4 && !isGhost) {
        ctx.fillStyle = level === 7 ? baseStroke : '#555';
        ctx.fillRect(-16, -6, 4, 12);
        ctx.fillRect(12, -6, 4, 12);
        if (level >= 6) {
            ctx.fillRect(-6, -16, 12, 4);
            ctx.fillRect(-6, 12, 12, 4);
        }
    }

    ctx.fillStyle = color;

    // --- TOWER SPECIFIC DESIGNS ---
    if (type === TowerType.SURVIVOR) {
      ctx.fillStyle = level === 7 ? '#333' : '#1a1a1a';
      const barrelW = level >= 5 ? 14 : 12;
      ctx.fillRect(8, -3, barrelW, 6);
      if (level >= 5) {
          ctx.fillStyle = level === 7 ? '#fca5a5' : '#fbbf24'; 
          ctx.fillRect(8, -1, 14, 2);
      }
      ctx.fillStyle = level === 7 ? '#ef4444' : color;
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(2, -2, 5, 0, Math.PI*2); ctx.fill();
    } 
    else if (type === TowerType.SNIPER) {
       ctx.fillStyle = '#000';
       const barrelLen = level >= 5 ? 34 : level === 7 ? 40 : 28;
       ctx.fillRect(0, -2, barrelLen, 4);
       ctx.fillRect(barrelLen - 2, -3, 4, 6); // Muzzle
       ctx.fillStyle = level === 7 ? '#22c55e' : color;
       ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
       ctx.strokeStyle = level >= 5 ? '#fbbf24' : '#000';
       ctx.lineWidth = 1;
       ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.moveTo(0, -2); ctx.lineTo(0, 2); ctx.stroke();
    }
    else if (type === TowerType.TURRET) {
      ctx.fillStyle = '#111';
      if (level >= 5) {
         ctx.fillRect(8, -9, 16, 3);
         ctx.fillRect(8, -3, 16, 3);
         ctx.fillRect(8, 3, 16, 3);
         ctx.fillRect(8, 9, 16, 3);
      } else {
         ctx.fillRect(8, -6, 14, 4);
         ctx.fillRect(8, 2, 14, 4);
      }
      ctx.fillStyle = level === 7 ? '#7f1d1d' : color;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-8, -8, 3, 3); ctx.fillRect(-8, 5, 3, 3); ctx.fillRect(5, -8, 3, 3); ctx.fillRect(5, 5, 3, 3);
    }
    else if (type === TowerType.FLAMETHROWER) {
      ctx.fillStyle = '#555';
      ctx.fillRect(-14, -8, 6, 16); // Tank
      ctx.fillStyle = '#222';
      // Nozzle
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(18 + level, -8 - level/2); ctx.lineTo(18+level, 8+level/2); ctx.lineTo(0, 4); ctx.fill();
      ctx.fillStyle = level === 7 ? '#3b82f6' : color;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = level === 7 ? '#60a5fa' : 'orange';
      ctx.beginPath(); ctx.arc(18, 0, 2 + level/2, 0, Math.PI*2); ctx.fill();
    }
    else if (type === TowerType.CHEMIST) {
        ctx.fillStyle = level === 7 ? '#052e16' : '#3f6212';
        ctx.fillRect(-8, -10, 16, 20); // Base
        ctx.fillStyle = level === 7 ? '#14532d' : color;
        ctx.beginPath(); ctx.arc(0, 0, 8 + level/2, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(18, 0); ctx.stroke();
        ctx.fillStyle = level === 7 ? '#166534' : '#bef264';
        ctx.beginPath(); ctx.arc(18, 0, 5, 0, Math.PI*2); ctx.fill(); 
    }
    else if (type === TowerType.LASER) {
        ctx.fillStyle = '#444';
        ctx.fillRect(0, -5, 24 + level*2, 10);
        ctx.fillStyle = level === 7 ? '#ec4899' : '#0ff';
        ctx.fillRect(5, -1, 15 + level*2, 2);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI*2);
        ctx.fillStyle = level === 7 ? '#be185d' : color;
        ctx.fill();
        if (level >= 5) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(-8, -8, 16, 16);
        }
    }
    else if (type === TowerType.MONK) {
        ctx.fillStyle = '#885522';
        ctx.beginPath();
        const bowSize = 15 + level;
        ctx.arc(10, 0, bowSize, Math.PI/2, Math.PI*1.5, true); 
        ctx.stroke();
        ctx.fillRect(0, -2, 20, 4);
        ctx.fillStyle = level === 7 ? '#881337' : color;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        if (level >= 5) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
        }
    }

    ctx.restore();
};

// --- SUB-ROUTINE: VISUAL STATUS EFFECT INDICATORS ABOVE MUTANTS ---
interface ActiveStatusBadge {
  id: string;
  borderColor: string;
  glowColor: string;
  bgColor: string;
  progressPct?: number; // 0 to 1 for remaining duration arc
  drawGlyph: (ctx: CanvasRenderingContext2D, frame: number) => void;
}

const drawStatusIndicatorsAboveEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number, x: number, barY: number) => {
  const badges: ActiveStatusBadge[] = [];

  // 1. BURNING (Flamethrower, Napalm Mortar, Laser Red Mode)
  if (enemy.burnTimer && enemy.burnTimer > 0) {
    const isBlue = (enemy.healingReduction || 0) > 0.5;
    const progress = Math.max(0, Math.min(1, enemy.burnTimer / 180));
    badges.push({
      id: 'BURN',
      borderColor: isBlue ? '#38bdf8' : '#f97316',
      glowColor: isBlue ? '#0284c7' : '#ea580c',
      bgColor: isBlue ? 'rgba(8, 47, 73, 0.95)' : 'rgba(67, 20, 7, 0.95)',
      progressPct: progress,
      drawGlyph: (c, f) => {
        const flick = Math.sin(f * 0.4) * 1.2;
        // Outer Flame
        c.beginPath();
        c.moveTo(-3.5, 3.5);
        c.quadraticCurveTo(-4.5, 0, -2, -1.5);
        c.quadraticCurveTo(-2.5, -4.5 + flick, 0, -5.5 + flick);
        c.quadraticCurveTo(2.5, -4.5 + flick, 2, -1.5);
        c.quadraticCurveTo(4.5, 0, 3.5, 3.5);
        c.quadraticCurveTo(0, 4.5, -3.5, 3.5);
        c.closePath();
        c.fillStyle = isBlue ? '#60a5fa' : '#f97316';
        c.fill();
        // Inner Flame Core
        c.beginPath();
        c.moveTo(-1.8, 2.5);
        c.quadraticCurveTo(-2, 0, 0, -2.5 + flick * 0.5);
        c.quadraticCurveTo(2, 0, 1.8, 2.5);
        c.closePath();
        c.fillStyle = isBlue ? '#e0f2fe' : '#fef08a';
        c.fill();
      }
    });
  }

  // 2. FROZEN / STUNNED (Tesla Lvl 7, Pulverizer Stun, Ice Mage)
  if (enemy.frozen && enemy.frozen > 0) {
    const progress = Math.max(0, Math.min(1, enemy.frozen / 45));
    badges.push({
      id: 'FROZEN',
      borderColor: '#67e8f9',
      glowColor: '#0284c7',
      bgColor: 'rgba(8, 47, 73, 0.95)',
      progressPct: progress,
      drawGlyph: (c, f) => {
        c.save();
        c.rotate(Math.sin(f * 0.08) * 0.2);
        c.strokeStyle = '#e0f2fe';
        c.lineWidth = 1.3;
        c.lineCap = 'round';
        // 6-spoke snowflake crystal
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI) / 3;
          c.beginPath();
          c.moveTo(-Math.cos(angle) * 4.5, -Math.sin(angle) * 4.5);
          c.lineTo(Math.cos(angle) * 4.5, Math.sin(angle) * 4.5);
          c.stroke();
        }
        // Center sparkling core
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(0, 0, 1.3, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    });
  }

  // 3. SLOWED (Chemist Glue Bomb, Acid Pool, Blue Laser, Cryo Slow)
  if (enemy.slowFactor && enemy.slowFactor < 1 && (!enemy.frozen || enemy.frozen <= 0)) {
    badges.push({
      id: 'SLOWED',
      borderColor: '#0ea5e9',
      glowColor: '#0369a1',
      bgColor: 'rgba(12, 74, 110, 0.95)',
      drawGlyph: (c, f) => {
        const slide = (f * 0.12) % 2;
        c.fillStyle = '#38bdf8';
        // Top Chevron
        c.beginPath();
        c.moveTo(-3.5, -3.5 + slide);
        c.lineTo(0, -1 + slide);
        c.lineTo(3.5, -3.5 + slide);
        c.lineTo(0, 0.5 + slide);
        c.closePath();
        c.fill();
        // Bottom Chevron
        c.beginPath();
        c.moveTo(-3.5, 0 + slide);
        c.lineTo(0, 2.5 + slide);
        c.lineTo(3.5, 0 + slide);
        c.lineTo(0, 4 + slide);
        c.closePath();
        c.fill();
      }
    });
  }

  // 4. POISON / ACID DoT (Chemist Lvl 7+ Dark Poison)
  if (enemy.poisonDoT && enemy.poisonDoT > 0) {
    badges.push({
      id: 'POISON',
      borderColor: '#4ade80',
      glowColor: '#16a34a',
      bgColor: 'rgba(20, 83, 45, 0.95)',
      drawGlyph: (c, f) => {
        // Toxic droplet
        c.fillStyle = '#22c55e';
        c.beginPath();
        c.arc(0, 1, 3.2, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(-2.8, 0);
        c.lineTo(0, -4.5);
        c.lineTo(2.8, 0);
        c.closePath();
        c.fill();
        // Bubbling effervescence
        const bubbleY = -0.5 - ((f * 0.2) % 3.5);
        c.fillStyle = '#bbf7d0';
        c.beginPath();
        c.arc(0.8, bubbleY, 0.9, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  // 5. VULNERABLE (Sniper Ranger Lvl 7 Pierce)
  if (enemy.vulnerable && enemy.vulnerable > 0) {
    const progress = Math.max(0, Math.min(1, enemy.vulnerable / 180));
    badges.push({
      id: 'VULNERABLE',
      borderColor: '#ef4444',
      glowColor: '#dc2626',
      bgColor: 'rgba(69, 10, 10, 0.95)',
      progressPct: progress,
      drawGlyph: (c, f) => {
        c.strokeStyle = '#f87171';
        c.lineWidth = 1.2;
        // Reticle ring
        c.beginPath();
        c.arc(0, 0, 3.8, 0, Math.PI * 2);
        c.stroke();
        // 4 crosshair ticks
        c.beginPath();
        c.moveTo(0, -5); c.lineTo(0, -3.2);
        c.moveTo(0, 3.2); c.lineTo(0, 5);
        c.moveTo(-5, 0); c.lineTo(-3.2, 0);
        c.moveTo(3.2, 0); c.lineTo(5, 0);
        c.stroke();
        // Center pip
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.arc(0, 0, 1.2 + Math.sin(f * 0.25) * 0.4, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  // 6. ARMOR BROKEN (Pulverizer Shockwave Lvl 7)
  if (enemy.armorBroken) {
    badges.push({
      id: 'ARMOR_BROKEN',
      borderColor: '#f59e0b',
      glowColor: '#d97706',
      bgColor: 'rgba(69, 26, 3, 0.95)',
      drawGlyph: (c) => {
        // Cracked Shield
        c.fillStyle = '#f59e0b';
        c.beginPath();
        c.moveTo(-3.5, -3.5);
        c.lineTo(3.5, -3.5);
        c.lineTo(3.5, 0);
        c.quadraticCurveTo(0, 4.5, -3.5, 0);
        c.closePath();
        c.fill();
        // Jagged fissure crack
        c.strokeStyle = '#18181b';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, -3.5);
        c.lineTo(-1.2, -0.8);
        c.lineTo(1.2, 1);
        c.lineTo(0, 3.8);
        c.stroke();
      }
    });
  }

  if (badges.length === 0) return;

  const badgeRadius = 7.5;
  const badgeSpacing = 17;
  const totalW = (badges.length - 1) * badgeSpacing;
  const startX = x - totalW / 2;
  const badgeCenterY = barY - 11; // Positioned right above the health bar

  badges.forEach((b, idx) => {
    const bx = startX + idx * badgeSpacing;
    const by = badgeCenterY + Math.sin(frame * 0.12 + idx * 1.5) * 1.2;

    ctx.save();
    ctx.translate(bx, by);

    // Glow & Backdrop Capsule
    ctx.shadowColor = b.glowColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = b.bgColor;
    ctx.beginPath();
    ctx.arc(0, 0, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Outline Border
    ctx.strokeStyle = b.borderColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Remaining duration ring if applicable
    if (b.progressPct !== undefined && b.progressPct > 0) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, badgeRadius - 0.7, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * b.progressPct));
      ctx.stroke();
    }

    // Inner Glyph
    ctx.shadowBlur = 0;
    b.drawGlyph(ctx, frame);

    ctx.restore();
  });
};

export const drawEnemy = ({ ctx, frame }: DrawContext, enemy: Enemy) => {
    const { x, y, radius, color, health, maxHealth, type, slowFactor, burnTimer } = enemy;

    // 1. Aura for Healer
    if (enemy.isHealer) {
        ctx.beginPath();
        ctx.arc(x, y, 200, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(74, 222, 128, ${0.1 + Math.sin(frame * 0.05) * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = `rgba(74, 222, 128, 0.03)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius * 1.8, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.sin(frame * 0.1) * 0.05})`;
        ctx.fill();
        
        const count = 3;
        for(let i=0; i<count; i++) {
            const angle = (frame * 0.02) + (i * (Math.PI * 2 / count));
            const cx = x + Math.cos(angle) * (radius * 1.5);
            const cy = y + Math.sin(angle) * (radius * 1.5);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(frame * -0.05);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(-4, -1.5, 8, 3);
            ctx.fillRect(-1.5, -4, 3, 8);
            ctx.restore();
        }
    }

    if (type === EnemyType.ICE_MAGE) {
         ctx.beginPath();
         ctx.arc(x, y, radius + 4, 0, Math.PI*2);
         ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(frame * 0.1) * 0.2})`;
         ctx.lineWidth = 2;
         ctx.stroke();
    }

    if (type === EnemyType.NINJA) {
        for(let i=1; i<4; i++) {
             ctx.globalAlpha = 0.3 / i;
             ctx.beginPath();
             ctx.arc(x - (enemy.speed * i * 3), y, radius, 0, Math.PI*2);
             ctx.fillStyle = '#000';
             ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // 2. BURN EFFECT (Base Flames + Rising Ember Sparks)
    if (burnTimer && burnTimer > 0) {
        const isBlue = (enemy.healingReduction || 0) > 0.5;
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, Math.PI*2);
        ctx.fillStyle = isBlue ? 'rgba(59, 130, 246, 0.5)' : 'rgba(249, 115, 22, 0.5)';
        ctx.fill();

        const flameCount = 5;
        for(let i=0; i<flameCount; i++) {
             const offset = (frame + (i * 23)) % 40; 
             const progress = offset / 40; 
             const angle = Math.PI/2 + ((i / flameCount) * Math.PI) - Math.PI/2 + Math.sin(frame * 0.1)*0.5;
             const fx = x + Math.cos(angle) * (radius * 0.7);
             const fy = y + Math.sin(angle) * (radius * 0.7) - (progress * 15);
             const fSize = (radius * 0.4) * (1 - progress);

             ctx.beginPath();
             ctx.arc(fx, fy, fSize, 0, Math.PI*2);
             ctx.fillStyle = isBlue 
                ? `rgba(191, 219, 254, ${1-progress})` 
                : `rgba(254, 215, 170, ${1-progress})`;
             ctx.fill();
        }

        // Drifting fire embers
        for(let i=0; i<3; i++) {
            const emberOffset = (frame * 1.5 + (i * 17)) % 30;
            const ex = x + Math.sin(frame * 0.1 + i) * radius * 0.8;
            const ey = y - (emberOffset / 30) * (radius + 15);
            ctx.fillStyle = isBlue ? '#38bdf8' : '#fbbf24';
            ctx.fillRect(ex, ey, 1.5, 1.5);
        }
    }

    // 3. SLOWED EFFECT (Frost puddle & cold snowflake particles)
    if (slowFactor && slowFactor < 1 && (!enemy.frozen || enemy.frozen <= 0)) {
        ctx.beginPath();
        ctx.ellipse(x, y + radius * 0.8, radius * 1.2, radius * 0.4, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const particleCount = 3;
        ctx.fillStyle = '#bae6fd'; 
        for(let i=0; i<particleCount; i++) {
            const angle = (frame * -0.05) + (i * (Math.PI * 2 / particleCount));
            const px = x + Math.cos(angle) * (radius + 5);
            const py = y + Math.sin(angle) * (radius + 5);
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle + frame * 0.1);
            ctx.fillRect(-2, -0.5, 4, 1);
            ctx.fillRect(-0.5, -2, 1, 4);
            ctx.restore();
        }
    }

    // 4. POISON EFFECT
    if (enemy.poisonDoT && enemy.poisonDoT > 0) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI*2);
        ctx.fillStyle = `rgba(20, 83, 45, 0.4)`; 
        ctx.fill();
        
        const bubbleCount = 2;
        for(let i=0; i<bubbleCount; i++) {
             const offset = (frame + (i * 30)) % 60;
             const py = y + radius - (offset/60) * radius * 2;
             const px = x + Math.sin(offset * 0.2 + i) * radius * 0.5;
             ctx.beginPath();
             ctx.arc(px, py, 2, 0, Math.PI*2);
             ctx.fillStyle = '#4ade80';
             ctx.fill();
        }
    }

    // 5. FROZEN CRYSTALLINE ENCASEMENT (Tesla Lvl 7 / Pulverizer / Ice Mage)
    if (enemy.frozen && enemy.frozen > 0) {
         ctx.save();
         // Hexagonal frost crystal shell
         ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
         ctx.strokeStyle = '#67e8f9';
         ctx.lineWidth = 1.8;
         ctx.shadowColor = '#38bdf8';
         ctx.shadowBlur = 8;
         const iceR = radius + 3.5;
         ctx.beginPath();
         for (let i = 0; i < 6; i++) {
              const a = (i * Math.PI) / 3;
              const ix = x + Math.cos(a) * iceR;
              const iy = y + Math.sin(a) * iceR;
              if (i === 0) ctx.moveTo(ix, iy);
              else ctx.lineTo(ix, iy);
         }
         ctx.closePath();
         ctx.fill();
         ctx.stroke();

         // Frost gleam highlight
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
         ctx.lineWidth = 1.5;
         ctx.beginPath();
         ctx.moveTo(x - iceR * 0.4, y - iceR * 0.5);
         ctx.lineTo(x + iceR * 0.3, y - iceR * 0.7);
         ctx.stroke();
         ctx.restore();

         // Electric/Frost arcs
         ctx.strokeStyle = '#d8b4fe'; 
         ctx.lineWidth = 1.5;
         ctx.shadowColor = '#a855f7';
         ctx.shadowBlur = 5;
         const segments = 2;
         for(let i=0; i<segments; i++) {
              ctx.beginPath();
              const startAngle = Math.random() * Math.PI * 2;
              let cx = x + Math.cos(startAngle) * radius;
              let cy = y + Math.sin(startAngle) * radius;
              ctx.moveTo(cx, cy);
              const steps = 4;
              for(let j=0; j<steps; j++) {
                  cx += (Math.random() - 0.5) * 8;
                  cy += (Math.random() - 0.5) * 8;
                  ctx.lineTo(cx, cy);
              }
              ctx.stroke();
         }
         ctx.shadowBlur = 0;
    }

    // 6. ARMOR BROKEN CRACK ON BODY
    if (enemy.armorBroken) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.6, -radius * 0.4); 
        ctx.lineTo(-radius * 0.1, 0); 
        ctx.lineTo(-radius * 0.4, radius * 0.5);
        ctx.stroke();
        ctx.restore();
    }

    // Main Mutant Body
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Cold ice overlay if frozen
    if (enemy.frozen && enemy.frozen > 0) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
        ctx.fill();
    }

    ctx.strokeStyle = (enemy.frozen && enemy.frozen > 0) ? '#67e8f9' : '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    if (type === EnemyType.BOSS || type === EnemyType.MATRYOSHKA || type === EnemyType.NINJA) {
        ctx.strokeStyle = type === EnemyType.MATRYOSHKA ? '#a855f7' : type === EnemyType.NINJA ? '#555' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius - 4, 0, Math.PI*2);
        ctx.stroke();
    }

    // Health Bar
    const hpPct = Math.max(0, health / maxHealth);
    const barW = 24;
    const barH = 4;
    const barY = y - radius - 10;
    
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x - barW/2, barY, barW, barH);
    
    ctx.fillStyle = (enemy.poisonDoT && enemy.poisonDoT > 0) ? '#10b981' : '#ef4444'; 
    if (hpPct > 0.5 && !enemy.poisonDoT) ctx.fillStyle = '#22c55e';
    else if (hpPct > 0.2 && !enemy.poisonDoT) ctx.fillStyle = '#eab308';
    
    ctx.fillRect(x - barW/2, barY, barW * hpPct, barH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barW/2, barY, barW, barH);

    // --- RENDER VISUAL STATUS EFFECT INDICATORS (BURNING, FROZEN, SLOWED, POISON, VULNERABLE, ARMOR BROKEN) ABOVE MUTANT ---
    drawStatusIndicatorsAboveEnemy(ctx, enemy, frame, x, barY);
};

export const drawProjectile = ({ ctx, frame }: DrawContext, p: Projectile, enemies: Enemy[]) => {
    if (p.type === 'LIGHTNING') {
        if (p.chainIds && p.chainIds.length > 0) {
            let startX = p.x;
            let startY = p.y;
            ctx.save();
            ctx.strokeStyle = '#d8b4fe'; 
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 15;

            const drawLightningSegment = (x1: number, y1: number, x2: number, y2: number) => {
                const dist = Math.hypot(x2-x1, y2-y1);
                const steps = Math.max(2, Math.floor(dist / 10)); 
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                for(let i=1; i<steps; i++) {
                    const t = i / steps;
                    const baseX = x1 + (x2 - x1) * t;
                    const baseY = y1 + (y2 - y1) * t;
                    const jitter = (Math.random() - 0.5) * 15; 
                    ctx.lineTo(baseX + jitter, baseY + jitter);
                }
                ctx.lineTo(x2, y2);
                ctx.stroke();
            };

            p.chainIds.forEach(id => {
                const enemy = enemies.find(e => e.id === id);
                if (enemy) {
                    drawLightningSegment(startX, startY, enemy.x, enemy.y);
                    startX = enemy.x;
                    startY = enemy.y;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); 
                    ctx.arc(enemy.x, enemy.y, 6, 0, Math.PI*2); 
                    ctx.fill();
                }
            });
            ctx.restore();
        }
     } else if (p.type === 'BEAM') {
          if (p.endX !== undefined && p.endY !== undefined) {
              const alpha = Math.min(1, p.lifespan / 10);
              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.endX, p.endY);
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = p.radius ? p.radius / 2 : 2;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.endX, p.endY);
              ctx.strokeStyle = p.color;
              ctx.lineWidth = (p.radius || 6) + Math.sin(frame * 0.5) * 2;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 15;
              ctx.stroke();
              ctx.restore();
          }
     } else if (p.type === 'FLAME') {
         // Custom Flame Draw
         const isBlue = p.isBlueFire; // Lvl 7 Logic
         
         ctx.save();
         ctx.translate(p.x, p.y);
         const angle = Math.atan2(p.velocity.y, p.velocity.x);
         ctx.rotate(angle);
         
         if (isBlue) {
             // Will-o'-the-wisp (Fuego Fatuo) style (Level 7)
             ctx.globalAlpha = 0.8;
             ctx.shadowColor = '#06b6d4';
             ctx.shadowBlur = 10;
             
             // Core
             ctx.fillStyle = '#cffafe'; // White-blue
             ctx.beginPath();
             ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI*2);
             ctx.fill();
             
             // Trail / Aura
             ctx.fillStyle = 'rgba(6, 182, 212, 0.4)'; // Cyan
             ctx.beginPath();
             ctx.moveTo(0, p.radius);
             ctx.quadraticCurveTo(-p.radius*4, 0, 0, -p.radius);
             ctx.fill();
             
         } else {
             // Standard Flame
             ctx.fillStyle = `rgba(255, 85, 0, ${p.lifespan / 30})`;
             ctx.beginPath();
             ctx.arc(0, 0, p.radius, 0, Math.PI*2);
             ctx.fill();
             
             ctx.fillStyle = '#fbbf24'; // Inner yellow
             ctx.beginPath();
             ctx.arc(-2, 0, p.radius * 0.6, 0, Math.PI*2);
             ctx.fill();
         }
         
         ctx.restore();
         
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
     } else if (p.type === 'GLUE_BOMB' || p.type === 'MORTAR_SHELL') {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
     } else if (p.type === 'ICE_BOLT') {
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath(); 
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.velocity.x * 3, p.y - p.velocity.y * 3);
        ctx.stroke();
     } else {
       ctx.beginPath();
       ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
       ctx.fillStyle = p.color;
       ctx.fill();
     }
};

export const drawGroundEffect = ({ ctx, frame }: DrawContext, g: GroundEffect) => {
    if (g.type === 'DELAYED_HEAL') {
        const pct = g.lifespan / (g.maxLifespan || 120);
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 0, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.arc(g.x, g.y, g.radius, -Math.PI/2, (-Math.PI/2) + ((1-pct) * Math.PI*2));
        ctx.fillStyle = `rgba(0, 255, 0, 0.1)`;
        ctx.fill();
    } 
    else if (g.type === 'FIRE_POOL') {
        // Redefined Fire Pool with Distinct Border
        
        // 1. Hot Core Gradient
        const grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
        grd.addColorStop(0, 'rgba(255, 200, 0, 0.8)'); // Bright yellow center
        grd.addColorStop(0.6, 'rgba(255, 69, 0, 0.5)'); // Red-Orange mid
        grd.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Transparent edge fit fill
        
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Distinct Wavy Border
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + Math.sin(frame * 0.2) * 0.2})`; // Red pulsing border
        ctx.lineWidth = 3;
        ctx.stroke();

        // Embers rising
        if (Math.random() > 0.5) {
            ctx.fillStyle = '#fbbf24'; 
            const ex = g.x + (Math.random() - 0.5) * g.radius;
            const ey = g.y + (Math.random() - 0.5) * g.radius;
            ctx.beginPath();
            ctx.arc(ex, ey, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
    }
    else if (g.type === 'SHOCKWAVE') {
        ctx.strokeStyle = `rgba(217, 70, 239, ${g.lifespan/20})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius * (1 - g.lifespan/20), 0, Math.PI*2);
        ctx.stroke();
    }
    else if (g.type === 'ACID_POOL' || g.type === 'ACID_POOL' as any) { 
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = g.isDarkPoison ? '#14532d' : '#84cc16';
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = g.isDarkPoison ? '#22c55e' : '#bef264';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.globalAlpha = 1;
        if (Math.random() > 0.7) {
            ctx.fillStyle = '#ecfccb';
            const bx = g.x + (Math.random() - 0.5) * g.radius * 1.4;
            const by = g.y + (Math.random() - 0.5) * g.radius * 1.4;
            if (Math.hypot(bx - g.x, by - g.y) < g.radius) {
                ctx.beginPath();
                ctx.arc(bx, by, 2 + Math.random()*2, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
    ctx.globalAlpha = 1;
};

export const drawStatusPopups = (
  { ctx }: { ctx: CanvasRenderingContext2D },
  popups: StatusFeedbackPopup[]
) => {
  if (!popups || popups.length === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px monospace';

  popups.forEach(popup => {
    const age = popup.maxLifespan - popup.lifespan;
    let alpha = 1.0;
    if (age < 6) {
      alpha = age / 6;
    } else if (popup.lifespan < 14) {
      alpha = popup.lifespan / 14;
    }

    const scale = age < 6 ? 1.0 + (1 - age / 6) * 0.35 : 1.0;

    ctx.save();
    ctx.translate(popup.x, popup.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Dark backdrop capsule for maximum contrast
    ctx.shadowColor = popup.glowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
    ctx.strokeStyle = popup.color;
    ctx.lineWidth = 1.2;

    const textWidth = ctx.measureText(popup.text).width;
    const w = textWidth + 12;
    const h = 18;

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.shadowBlur = 0;
    ctx.fillStyle = popup.color;
    ctx.fillText(popup.text, 0, 0.5);

    ctx.restore();
  });
  ctx.restore();
};

