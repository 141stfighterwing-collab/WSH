'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

const TYPE_COLORS: Record<string, string> = {
  quick: '#60a5fa',
  notebook: '#4ade80',
  deep: '#c084fc',
  code: '#fb923c',
  project: '#f472b6',
  document: '#22d3ee',
  'ai-prompts': '#facc15',
};

interface OrbitNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
  x: number;
  y: number;
  radius: number;
  ring: number;
  initial: string;
  linkedToHub: boolean;
}

interface HubNode {
  id: 'hub';
  title: string;
  type: 'hub';
  tags: string[];
  x: number;
  y: number;
  radius: number;
  ring: number;
  initial: string;
  linkedToHub: false;
}

const clampTitle = (title: string, max = 22) =>
  title.length > max ? `${title.slice(0, max)}…` : title;

export default function MindMap() {
  const { mindMapOpen, setMindMapOpen, notes, loadNoteIntoEditor } = useWSHStore();
  const [dimensions, setDimensions] = useState({ width: 1440, height: 900 });
  const [zoom, setZoom] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const rotationFrame = useRef<number | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);

  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);

  useEffect(() => {
    if (!mindMapOpen) return;
    const updateSize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mindMapOpen]);

  useEffect(() => {
    if (!mindMapOpen) return;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      setRotationDeg((elapsed / 120000) * 360);
      rotationFrame.current = requestAnimationFrame(tick);
    };
    rotationFrame.current = requestAnimationFrame(tick);
    return () => {
      if (rotationFrame.current) cancelAnimationFrame(rotationFrame.current);
    };
  }, [mindMapOpen]);

  const center = useMemo(
    () => ({ x: dimensions.width / 2, y: dimensions.height / 2 }),
    [dimensions],
  );

  const orbitNodes = useMemo<OrbitNode[]>(() => {
    if (activeNotes.length === 0) return [];

    const sorted = [...activeNotes].sort((a, b) => {
      const tagDelta = (b.tags?.length || 0) - (a.tags?.length || 0);
      if (tagDelta !== 0) return tagDelta;
      return a.title.localeCompare(b.title);
    });

    const maxPerRing = [6, 10, 14, 18];
    const ringRadii = [220, 330, 450, 580];
    const ringBuckets: typeof sorted[] = maxPerRing.map(() => []);

    let ringIndex = 0;
    for (const note of sorted) {
      while (
        ringIndex < maxPerRing.length - 1 &&
        ringBuckets[ringIndex].length >= maxPerRing[ringIndex]
      ) {
        ringIndex += 1;
      }
      ringBuckets[ringIndex].push(note);
    }

    const built: OrbitNode[] = [];
    ringBuckets.forEach((bucket, idx) => {
      if (bucket.length === 0) return;
      const angleStep = (Math.PI * 2) / bucket.length;
      const baseRotation = idx % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + angleStep / 2;
      bucket.forEach((note, i) => {
        const angle = baseRotation + angleStep * i;
        const radius = ringRadii[idx] ?? ringRadii[ringRadii.length - 1] + idx * 90;
        const size = idx === 0 ? 24 : idx === 1 ? 19 : 16;
        built.push({
          id: note.id,
          title: note.title || 'Untitled',
          type: note.type,
          tags: note.tags,
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
          radius: size,
          ring: idx,
          initial: (note.type || 'n').charAt(0).toUpperCase(),
          linkedToHub: true,
        });
      });
    });

    return built;
  }, [activeNotes, center]);

  const hubNode = useMemo<HubNode>(() => ({
    id: 'hub',
    title: 'Core Intelligence',
    type: 'hub',
    tags: [],
    x: 0,
    y: 0,
    radius: 34,
    ring: -1,
    initial: 'H',
    linkedToHub: false,
  }), []);

  const edges = useMemo(() => {
    const byId = new Map(orbitNodes.map((n) => [n.id, n]));
    const results: Array<{
      source: OrbitNode | HubNode;
      target: OrbitNode;
      strength: number;
      secondary?: boolean;
    }> = [];

    for (const node of orbitNodes) {
      results.push({
        source: hubNode,
        target: node,
        strength: 1,
      });
    }

    for (let i = 0; i < activeNotes.length; i++) {
      for (let j = i + 1; j < activeNotes.length; j++) {
        const shared = activeNotes[i].tags.filter((t) => activeNotes[j].tags.includes(t));
        if (shared.length === 0) continue;
        const source = byId.get(activeNotes[i].id);
        const target = byId.get(activeNotes[j].id);
        if (!source || !target) continue;
        const sameOrAdjacentRing = Math.abs(source.ring - target.ring) <= 1;
        if (!sameOrAdjacentRing) continue;
        results.push({
          source,
          target,
          strength: shared.length,
          secondary: true,
        });
      }
    }

    return results;
  }, [orbitNodes, activeNotes, hubNode]);

  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      const note = notes.find((n) => n.id === nodeId);
      if (!note) return;
      await loadNoteIntoEditor(note.id);
      setMindMapOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [notes, loadNoteIntoEditor, setMindMapOpen],
  );

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.15, 2.2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z / 1.15, 0.6)), []);
  const handleReset = useCallback(() => setZoom(1), []);

  if (!mindMapOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-[#060b17]/95" onClick={() => setMindMapOpen(false)} />

      <div className="relative w-full h-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.10),transparent_25%),radial-gradient(circle_at_80%_35%,rgba(168,85,247,0.08),transparent_28%),linear-gradient(180deg,#050914_0%,#0a1224_55%,#060b17_100%)]" />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <span className="micro-label text-pri-400">Mind Map</span>
          <span className="text-[10px] text-muted-foreground">
            {activeNotes.length} nodes · {Math.max(edges.length - orbitNodes.length, 0)} linked threads
          </span>
        </div>

        <button
          onClick={() => setMindMapOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute top-14 right-4 z-10 flex flex-col gap-1">
          <button onClick={handleZoomIn} className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 max-w-[260px]">
          <span className="micro-label text-muted-foreground block mb-2">Legend</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{type}</span>
              </div>
            ))}
          </div>
          <p className="text-[8px] text-muted-foreground/50 mt-2 leading-relaxed">
            Hub-and-spoke galaxy view with anchored note connections. Click any node to open the note.
          </p>
        </div>

        <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-full bg-slate-800/80 text-[10px] font-mono text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>

        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            className="relative"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 240ms ease',
            }}
          >
            <div
              className="absolute"
              style={{
                top: center.y,
                left: center.x,
                width: 0,
                height: 0,
                transform: `rotate(${rotationDeg}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <svg className="absolute inset-0 overflow-visible pointer-events-none">
                <defs>
                  <filter id="galaxy-glow">
                    <feGaussianBlur result="coloredBlur" stdDeviation="1.5" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {edges.map((edge, idx) => {
                  const isHub = edge.source.id === 'hub';
                  return (
                    <g key={`${edge.source.id}-${edge.target.id}-${idx}`}>
                      <line
                        x1={edge.source.x}
                        y1={edge.source.y}
                        x2={edge.target.x - center.x}
                        y2={edge.target.y - center.y}
                        stroke={isHub ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)'}
                        strokeWidth={isHub ? 0.9 : Math.min(0.6 + edge.strength * 0.22, 1.5)}
                        strokeDasharray={edge.secondary ? '3 4' : undefined}
                        filter={isHub ? 'url(#galaxy-glow)' : undefined}
                      />
                      {!isHub && (
                        <circle
                          cx={edge.target.x - center.x}
                          cy={edge.target.y - center.y}
                          r={edge.target.radius + 7}
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="1"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
              <div className="absolute -translate-x-1/2 -translate-y-1/2">
                <div className="absolute inset-[-18px] rounded-full bg-purple-500/25 blur-2xl" />
                <div className="relative w-20 h-20 rounded-full border border-purple-200/30 bg-gradient-to-br from-purple-700/70 via-indigo-700/60 to-slate-900 shadow-[0_0_40px_rgba(168,85,247,0.35)] flex items-center justify-center">
                  <span className="text-lg font-black text-white tracking-wide">H</span>
                </div>
                <div
                  className="absolute left-1/2 top-full mt-3 -translate-x-1/2 text-center whitespace-nowrap"
                  style={{ transform: `translateX(-50%) rotate(${-rotationDeg}deg)` }}
                >
                  <div className="text-xs font-bold text-primary-fixed-dim">Core Intelligence</div>
                  <div className="text-[10px] text-muted-foreground">Central note constellation</div>
                </div>
              </div>

              {orbitNodes.map((node) => {
                const color = TYPE_COLORS[node.type] || TYPE_COLORS.quick;
                const hovered = hoveredNodeId === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => void handleNodeClick(node.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: node.x - center.x,
                      top: node.y - center.y,
                      transform: `translate(-50%, -50%) scale(${hovered ? 1.08 : 1})`,
                      transition: 'transform 180ms ease',
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div
                        className="absolute rounded-full blur-xl opacity-70"
                        style={{
                          width: node.radius * 2.8,
                          height: node.radius * 2.8,
                          backgroundColor: color,
                          filter: 'blur(16px)',
                        }}
                      />
                      <div
                        className="relative rounded-full border shadow-[0_0_18px_rgba(255,255,255,0.14)] flex items-center justify-center font-black"
                        style={{
                          width: node.radius * 2,
                          height: node.radius * 2,
                          backgroundColor: `${color}22`,
                          borderColor: `${color}99`,
                          color,
                          fontSize: node.ring === 0 ? '13px' : '11px',
                        }}
                      >
                        {node.initial}
                      </div>
                      <div
                        className="absolute left-1/2 top-full mt-2 whitespace-nowrap text-center pointer-events-none"
                        style={{ transform: `translateX(-50%) rotate(${-rotationDeg}deg)` }}
                      >
                        <div className={`text-[11px] font-semibold ${hovered ? 'text-white' : 'text-slate-200/90'}`}>
                          {clampTitle(node.title)}
                        </div>
                        {hovered && node.tags.length > 0 && (
                          <div className="text-[9px] text-slate-400 max-w-[180px] truncate">
                            {node.tags.slice(0, 3).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {activeNotes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-muted-foreground/60">No notes to visualize</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Create notes with tags to populate the galaxy map</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
