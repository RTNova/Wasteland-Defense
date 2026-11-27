import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, Cpu, Crosshair, Bomb, Skull, Target, Rocket, Focus, Gauge, Zap, Timer,
  Package, Coins, Briefcase, Plus, Minus, Maximize, Check, Lock, X, LucideIcon
} from 'lucide-react';
import { PlayerProgress } from '../../types/index';
import {
  SKILL_NODES, SKILL_NODE_MAP, BRANCH_COLORS, BRANCH_LABELS,
  SkillNode, SkillBranch, getSkillNodeStatus
} from '../../config/skillTree';
import { soundManager } from '../../config/soundManager';

const ICONS: Record<string, LucideIcon> = {
  Cpu, Crosshair, Bomb, Skull, Target, Rocket, Focus, Gauge, Zap, Timer, Package, Coins, Briefcase
};

const NODE_R = 30;
const CORE_R = 44;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;

// Branch name labels floating beyond each capstone
const BRANCH_LABEL_POS: Record<Exclude<SkillBranch, 'CORE'>, { x: number; y: number }> = {
  DAMAGE: { x: -700, y: -700 },
  PRECISION: { x: 700, y: -700 },
  SPEED: { x: 700, y: 700 },
  ECONOMY: { x: -700, y: 700 }
};

interface ArmoryTreeProps {
  progress: PlayerProgress;
  onBuyNode: (nodeId: string) => void;
  onBack: () => void;
}

interface ViewTransform { x: number; y: number; k: number; }

export const ArmoryTree: React.FC<ArmoryTreeProps> = ({ progress, onBuyNode, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistRef = useRef(0);
  const suppressClickRef = useRef(false);

  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const purchased = progress.skillNodes ?? [];
  const selected: SkillNode | null = selectedId ? SKILL_NODE_MAP[selectedId] ?? null : null;

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setView(v => {
      const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * factor));
      const f = k / v.k;
      return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
    });
  }, []);

  // Center the tree on first render
  useEffect(() => {
    const el = containerRef.current;
    if (!el || initializedRef.current) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    initializedRef.current = true;
    const fit = Math.min(rect.width, rect.height) / 1500;
    const k = Math.min(0.95, Math.max(0.35, fit));
    setView({ x: rect.width / 2, y: rect.height / 2 - 30, k });
  }, []);

  // Native wheel listener so we can preventDefault (page must not scroll while zooming)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const getPos = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // No setPointerCapture here: capturing on the container would retarget the
    // pointerup and swallow click events on the node <g> elements.
    pointersRef.current.set(e.pointerId, getPos(e));
    suppressClickRef.current = false;
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchDistRef.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const prev = pointersRef.current.get(e.pointerId);
    if (!prev) return;
    const pos = getPos(e);
    pointersRef.current.set(e.pointerId, pos);

    if (pointersRef.current.size === 1) {
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) suppressClickRef.current = true;
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (pointersRef.current.size === 2) {
      suppressClickRef.current = true;
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinchDistRef.current > 0 && dist > 0) {
        zoomAt(mid.x, mid.y, dist / pinchDistRef.current);
      }
      pinchDistRef.current = dist;
    }
  };

  const handlePointerEnd = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchDistRef.current = 0;
  };

  const handleNodeClick = (nodeId: string) => {
    if (suppressClickRef.current) return;
    soundManager.playClick();
    setSelectedId(nodeId);
  };

  const centerView = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setView(v => ({ ...v, x: rect.width / 2, y: rect.height / 2 - 30 }));
    soundManager.playClick();
  };

  const zoomButton = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
    soundManager.playClick();
  };

  const nodeStatus = (node: SkillNode) => getSkillNodeStatus(node, purchased);

  const selectedStatus = selected ? nodeStatus(selected) : null;
  const selectedParent = selected?.parent ? SKILL_NODE_MAP[selected.parent] : null;
  const canAfford = selected ? progress.techPoints >= selected.cost : false;

  return (
    <main className="fixed inset-0 z-40 bg-neutral-950 overflow-hidden select-none">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4 pointer-events-none">
        <button
          onClick={() => { soundManager.playClick(); onBack(); }}
          className="pointer-events-auto flex items-center gap-1.5 text-neutral-400 hover:text-white transition bg-neutral-900/80 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-bold"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="font-title text-lg sm:text-2xl tracking-widest text-neutral-200 uppercase drop-shadow-lg">
          Armory
        </h2>
        <div className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900/80 border border-yellow-700/60 rounded-lg px-3 py-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-400 font-bold text-sm">{progress.techPoints}</span>
          <span className="text-yellow-700 text-[10px] font-bold hidden sm:inline">TP</span>
        </div>
      </div>

      {/* Pan / zoom canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: 'radial-gradient(circle, #262626 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <svg className="w-full h-full">
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {/* Branch labels */}
            {(Object.keys(BRANCH_LABEL_POS) as Array<Exclude<SkillBranch, 'CORE'>>).map(branch => (
              <text
                key={branch}
                x={BRANCH_LABEL_POS[branch].x}
                y={BRANCH_LABEL_POS[branch].y}
                textAnchor="middle"
                fill={BRANCH_COLORS[branch]}
                opacity={0.45}
                fontSize={24}
                fontWeight={900}
                letterSpacing={6}
                style={{ textTransform: 'uppercase' }}
              >
                {BRANCH_LABELS[branch]}
              </text>
            ))}

            {/* Edges */}
            {SKILL_NODES.filter(n => n.parent).map(node => {
              const parent = SKILL_NODE_MAP[node.parent!];
              const status = nodeStatus(node);
              const color = BRANCH_COLORS[node.branch];
              return (
                <line
                  key={`edge-${node.id}`}
                  x1={parent.x}
                  y1={parent.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={status === 'LOCKED' ? '#525252' : color}
                  strokeWidth={status === 'PURCHASED' ? 4 : 2.5}
                  strokeDasharray={status === 'PURCHASED' ? undefined : '8 7'}
                  opacity={status === 'PURCHASED' ? 0.95 : status === 'AVAILABLE' ? 0.65 : 0.3}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Nodes */}
            {SKILL_NODES.map(node => {
              const status = nodeStatus(node);
              const color = BRANCH_COLORS[node.branch];
              const r = node.branch === 'CORE' ? CORE_R : NODE_R;
              const Icon = ICONS[node.icon] ?? Cpu;
              const isSelected = selectedId === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x} ${node.y})`}
                  className="cursor-pointer"
                  onClick={() => handleNodeClick(node.id)}
                >
                  {status === 'AVAILABLE' && (
                    <circle r={r + 7} fill="none" stroke={color} strokeWidth={2} opacity={0.5} className="animate-pulse" />
                  )}
                  {isSelected && (
                    <circle r={r + 12} fill="none" stroke="#ffffff" strokeWidth={1.5} opacity={0.7} strokeDasharray="4 4" />
                  )}
                  <circle
                    r={r}
                    fill={status === 'PURCHASED' ? color : '#171717'}
                    stroke={status === 'LOCKED' ? color : status === 'PURCHASED' ? '#ffffff' : color}
                    strokeWidth={status === 'LOCKED' ? 1.5 : 3}
                    opacity={status === 'LOCKED' ? 0.45 : 1}
                    style={status === 'PURCHASED' ? { filter: `drop-shadow(0 0 10px ${color})` } : undefined}
                  />
                  {status === 'LOCKED' ? (
                    <Lock x={-10} y={-10} width={20} height={20} color="#737373" />
                  ) : (
                    <Icon
                      x={-r * 0.42}
                      y={-r * 0.42}
                      width={r * 0.84}
                      height={r * 0.84}
                      color={status === 'PURCHASED' ? '#0a0a0a' : color}
                    />
                  )}
                  <text
                    y={r + 18}
                    textAnchor="middle"
                    fill={status === 'LOCKED' ? '#737373' : '#e5e5e5'}
                    fontSize={12}
                    fontWeight={700}
                    stroke="#0a0a0a"
                    strokeWidth={3}
                    paintOrder="stroke"
                    style={{ textTransform: 'uppercase' }}
                  >
                    {node.name}
                  </text>
                  {status !== 'PURCHASED' && (
                    <text
                      y={r + 33}
                      textAnchor="middle"
                      fill="#facc15"
                      fontSize={11}
                      fontWeight={700}
                      stroke="#0a0a0a"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {node.cost} TP
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Zoom controls */}
      <div className="absolute right-3 top-24 z-20 flex flex-col gap-2">
        <button
          onClick={() => zoomButton(1.3)}
          className="p-2.5 bg-neutral-900/90 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-neutral-500 transition"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomButton(1 / 1.3)}
          className="p-2.5 bg-neutral-900/90 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-neutral-500 transition"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={centerView}
          className="p-2.5 bg-neutral-900/90 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-neutral-500 transition"
          title="Center view"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Hint bar */}
      {!selected && (
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center pointer-events-none px-4">
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-full px-4 py-2 text-[10px] sm:text-xs text-neutral-400 font-bold text-center">
            Drag to move • Scroll or pinch to zoom • Tap a node
          </div>
        </div>
      )}

      {/* Node detail panel */}
      {selected && selectedStatus && (
        <div className="absolute bottom-0 inset-x-0 z-20 p-3 sm:p-5 animate-in slide-in-from-bottom-4 duration-200">
          <div
            className="max-w-xl mx-auto bg-neutral-900/95 border-2 rounded-xl p-4 shadow-2xl backdrop-blur"
            style={{ borderColor: BRANCH_COLORS[selected.branch] }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg border"
                  style={{ borderColor: BRANCH_COLORS[selected.branch], backgroundColor: `${BRANCH_COLORS[selected.branch]}22` }}
                >
                  {React.createElement(ICONS[selected.icon] ?? Cpu, {
                    className: 'w-5 h-5',
                    color: BRANCH_COLORS[selected.branch]
                  })}
                </div>
                <div>
                  <h3 className="text-white font-bold uppercase tracking-wide text-sm sm:text-base">{selected.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: BRANCH_COLORS[selected.branch] }}>
                    {BRANCH_LABELS[selected.branch]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { soundManager.playClick(); setSelectedId(null); }}
                className="text-neutral-500 hover:text-white transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-neutral-300 text-xs sm:text-sm mb-4">{selected.desc}</p>

            {selectedStatus === 'PURCHASED' ? (
              <div className="w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-neutral-800 text-green-400 border border-green-800">
                <Check className="w-4 h-4" /> Installed
              </div>
            ) : selectedStatus === 'LOCKED' ? (
              <div className="w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-neutral-800 text-neutral-500 border border-neutral-700">
                <Lock className="w-4 h-4" /> Requires {selectedParent?.name ?? 'previous upgrade'}
              </div>
            ) : (
              <button
                onClick={() => {
                  if (!canAfford) return;
                  soundManager.playUpgrade();
                  onBuyNode(selected.id);
                }}
                disabled={!canAfford}
                className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition border ${
                  canAfford
                    ? 'text-black hover:brightness-110'
                    : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                }`}
                style={canAfford ? { backgroundColor: BRANCH_COLORS[selected.branch], borderColor: BRANCH_COLORS[selected.branch] } : undefined}
              >
                {canAfford ? (
                  <>Install • {selected.cost} TP</>
                ) : (
                  <>Not enough TP • {selected.cost} TP</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
