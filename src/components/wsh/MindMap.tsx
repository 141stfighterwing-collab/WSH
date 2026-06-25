'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Pause, Play, Orbit } from 'lucide-react';
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

interface GraphNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
  x: number;
  y: number;
  radius: number;
  degree: number;
  role: 'center' | 'orbiter-major' | 'orbiter-minor' | 'static';
  initial: string;
  orbitRadius?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
  type: 'hub' | 'shared-tag' | 'similarity';
}

const clampTitle = (title: string, max = 22) =>
  title.length > max ? `${title.slice(0, max)}…` : title;

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'it', 'to', 'for', 'of', 'with', 'as', 'by', 'from', 'that', 'but', 'or', 'not', 'are', 'be', 'this', 'will', 'can', 'if', 'has', 'have', 'had', 'was', 'were', 'been'
]);

const getWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + Math.cos(angle) * radius,
  y: cy + Math.sin(angle) * radius,
});

export default function MindMap() {
  const { mindMapOpen, setMindMapOpen, notes, loadNoteIntoEditor } = useWSHStore();
  const [dimensions, setDimensions] = useState({ width: 1440, height: 900 });
  const [zoom, setZoom] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const lastLabelRotationRef = useRef<number>(0);
  const [orbiting, setOrbiting] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [centerNodeId, setCenterNodeId] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const orbitLayerRef = useRef<HTMLDivElement | null>(null);
  const hubLabelRef = useRef<HTMLDivElement | null>(null);
  const nodeLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nodePositionMapRef = useRef<Map<string, GraphNode>>(new Map());

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

  const center = useMemo(
    () => ({ x: dimensions.width / 2, y: dimensions.height / 2 }),
    [dimensions],
  );

  const graph = useMemo(() => {
    const noteMeta = activeNotes.map((note) => ({
      id: note.id,
      title: note.title || 'Untitled',
      type: note.type,
      tags: note.tags || [],
      words: new Set([
        ...getWords(note.title || ''),
        ...getWords(note.content || ''),
        ...getWords(note.type || ''),
      ]),
    }));

    const degreeMap = new Map<string, number>();
    const edges: Edge[] = [];

    noteMeta.forEach((note) => degreeMap.set(note.id, 0));

    for (let i = 0; i < noteMeta.length; i++) {
      for (let j = i + 1; j < noteMeta.length; j++) {
        const a = noteMeta[i];
        const b = noteMeta[j];
        const sharedTags = a.tags.filter((tag) => b.tags.includes(tag)).length;

        let wordMatches = 0;
        a.words.forEach((word) => {
          if (b.words.has(word)) wordMatches += 1;
        });

        const score = sharedTags * 2 + wordMatches;
        if (score < 2) continue;

        edges.push({
          source: a.id,
          target: b.id,
          strength: score,
          type: sharedTags > 0 ? 'shared-tag' : 'similarity',
        });

        degreeMap.set(a.id, (degreeMap.get(a.id) || 0) + 1);
        degreeMap.set(b.id, (degreeMap.get(b.id) || 0) + 1);
      }
    }

    const sortedByDegree = [...noteMeta].sort((a, b) => {
      const degreeDelta = (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0);
      if (degreeDelta !== 0) return degreeDelta;
      return (b.tags.length - a.tags.length) || a.title.localeCompare(b.title);
    });

    const chosenCenterId = centerNodeId && noteMeta.some((note) => note.id === centerNodeId)
      ? centerNodeId
      : sortedByDegree[0]?.id ?? null;

    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    });

    const major: typeof noteMeta = [];
    const minor: typeof noteMeta = [];
    const staticNodes: typeof noteMeta = [];

    noteMeta.forEach((note) => {
      if (note.id === chosenCenterId) return;
      const degree = degreeMap.get(note.id) || 0;
      const directlyConnectedToCenter = chosenCenterId ? adjacency.get(chosenCenterId)?.has(note.id) : false;

      if (directlyConnectedToCenter && degree >= 3) {
        major.push(note);
      } else if (directlyConnectedToCenter || degree >= 2) {
        minor.push(note);
      } else {
        staticNodes.push(note);
      }
    });

    const nodes: GraphNode[] = [];

    if (chosenCenterId) {
      const centerMeta = noteMeta.find((note) => note.id === chosenCenterId);
      if (centerMeta) {
        nodes.push({
          id: centerMeta.id,
          title: centerMeta.title,
          type: centerMeta.type,
          tags: centerMeta.tags,
          x: center.x,
          y: center.y,
          radius: 38,
          degree: degreeMap.get(centerMeta.id) || 0,
          role: 'center',
          initial: (centerMeta.type || 'n').charAt(0).toUpperCase(),
        });
      }
    }

    major.forEach((note, index) => {
      const orbitRadius = 220 + (index % 2) * 35;
      const orbitAngle = (Math.PI * 2 * index) / Math.max(major.length, 1);
      const point = polarToCartesian(center.x, center.y, orbitRadius, orbitAngle);
      nodes.push({
        id: note.id,
        title: note.title,
        type: note.type,
        tags: note.tags,
        x: point.x,
        y: point.y,
        radius: 24,
        degree: degreeMap.get(note.id) || 0,
        role: 'orbiter-major',
        initial: (note.type || 'n').charAt(0).toUpperCase(),
        orbitRadius,
        orbitAngle,
        orbitSpeed: 0.0023 + (index % 3) * 0.0006,
      });
    });

    minor.forEach((note, index) => {
      const orbitRadius = 340 + (index % 3) * 28;
      const orbitAngle = ((Math.PI * 2 * index) / Math.max(minor.length, 1)) + 0.35;
      const point = polarToCartesian(center.x, center.y, orbitRadius, orbitAngle);
      nodes.push({
        id: note.id,
        title: note.title,
        type: note.type,
        tags: note.tags,
        x: point.x,
        y: point.y,
        radius: 18,
        degree: degreeMap.get(note.id) || 0,
        role: 'orbiter-minor',
        initial: (note.type || 'n').charAt(0).toUpperCase(),
        orbitRadius,
        orbitAngle,
        orbitSpeed: 0.001 + (index % 4) * 0.00025,
      });
    });

    staticNodes.forEach((note, index) => {
      const columns = Math.max(3, Math.min(6, Math.floor(dimensions.width / 260)));
      const col = index % columns;
      const row = Math.floor(index / columns);
      const baseX = 140 + col * 170;
      const baseY = 140 + row * 120;
      nodes.push({
        id: note.id,
        title: note.title,
        type: note.type,
        tags: note.tags,
        x: Math.min(dimensions.width - 120, baseX),
        y: Math.min(dimensions.height - 120, baseY),
        radius: 14,
        degree: degreeMap.get(note.id) || 0,
        role: 'static',
        initial: (note.type || 'n').charAt(0).toUpperCase(),
      });
    });

    const hubEdges: Edge[] = [];
    if (chosenCenterId) {
      nodes
        .filter((node) => node.id !== chosenCenterId && node.role !== 'static')
        .forEach((node) => {
          hubEdges.push({
            source: chosenCenterId,
            target: node.id,
            strength: 1,
            type: 'hub',
          });
        });
    }

    return {
      nodes,
      edges: [...hubEdges, ...edges],
      centerId: chosenCenterId,
    };
  }, [activeNotes, center, centerNodeId, dimensions.height, dimensions.width]);

  const positionedNodes = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graph.nodes.forEach((node) => map.set(node.id, { ...node }));
    nodePositionMapRef.current = map;
    return graph.nodes;
  }, [graph.nodes]);

  const resolvedEdges = useMemo(() => {
    return graph.edges
      .map((edge) => ({
        ...edge,
        sourceNode: nodePositionMapRef.current.get(edge.source),
        targetNode: nodePositionMapRef.current.get(edge.target),
      }))
      .filter((edge) => edge.sourceNode && edge.targetNode);
  }, [graph.edges, positionedNodes]);

  useEffect(() => {
    if (!mindMapOpen) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    let globalRotation = 0;
    const animate = () => {
      if (orbitLayerRef.current) {
        if (rotating) {
          globalRotation += 0.015;
          orbitLayerRef.current.style.transform = `rotate(${globalRotation}deg)`;
        } else {
          orbitLayerRef.current.style.transform = 'rotate(0deg)';
        }
      }

      const labelRotation = rotating ? -globalRotation : 0;
      if (Math.abs(labelRotation - lastLabelRotationRef.current) > 0.12) {
        if (hubLabelRef.current) {
          hubLabelRef.current.style.transform = `translateX(-50%) rotate(${labelRotation}deg)`;
        }

        Object.values(nodeLabelRefs.current).forEach((label) => {
          if (label) {
            label.style.transform = `translateX(-50%) rotate(${labelRotation}deg)`;
          }
        });
        lastLabelRotationRef.current = labelRotation;
      }

      if (orbiting) {
        graph.nodes.forEach((node) => {
          if ((node.role === 'orbiter-major' || node.role === 'orbiter-minor') && node.orbitRadius && typeof node.orbitAngle === 'number') {
            node.orbitAngle += node.orbitSpeed || 0;
            const point = polarToCartesian(center.x, center.y, node.orbitRadius, node.orbitAngle);
            const liveNode = nodePositionMapRef.current.get(node.id);
            if (liveNode) {
              liveNode.x = point.x;
              liveNode.y = point.y;
            }
          }
        });
      }

      graph.nodes.forEach((node) => {
        const liveNode = nodePositionMapRef.current.get(node.id);
        const element = document.getElementById(`mind-node-${node.id}`);
        if (element && liveNode) {
          element.style.transform = `translate(-50%, -50%) translate(${liveNode.x - center.x}px, ${liveNode.y - center.y}px) scale(${hoveredNodeId === node.id ? 1.08 : 1})`;
        }
      });

      resolvedEdges.forEach((edge, idx) => {
        const line = document.getElementById(`mind-edge-${idx}`) as SVGLineElement | null;
        const source = nodePositionMapRef.current.get(edge.source);
        const target = nodePositionMapRef.current.get(edge.target);
        if (line && source && target) {
          line.setAttribute('x1', String(source.x - center.x));
          line.setAttribute('y1', String(source.y - center.y));
          line.setAttribute('x2', String(target.x - center.x));
          line.setAttribute('y2', String(target.y - center.y));
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mindMapOpen, graph.nodes, resolvedEdges, center, orbiting, rotating]);

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

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setCenterNodeId(nodeId);
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z * 1.15, 2.2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z / 1.15, 0.6)), []);
  const handleReset = useCallback(() => {
    setZoom(1);
    setOrbiting(true);
    setRotating(false);
    setCenterNodeId(null);
  }, []);

  if (!mindMapOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-[#060b17]/95" onClick={() => setMindMapOpen(false)} />

      <div className="relative w-full h-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.10),transparent_25%),radial-gradient(circle_at_80%_35%,rgba(168,85,247,0.08),transparent_28%),linear-gradient(180deg,#050914_0%,#0a1224_55%,#060b17_100%)]" />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-3 flex-wrap">
          <span className="micro-label text-pri-400">Hybrid Galaxy Mind Map</span>
          <span className="text-[10px] text-muted-foreground">
            {activeNotes.length} notes · {graph.edges.length} connections
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            Double-click a node to make it the center star
          </span>
        </div>

        <button
          onClick={() => setMindMapOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute top-14 right-4 z-10 flex flex-col gap-1">
          <button onClick={() => setOrbiting((value) => !value)} className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95" title={orbiting ? 'Stop orbiting' : 'Start orbiting'}>
            {orbiting ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={() => setRotating((value) => !value)} className="p-2 rounded-xl bg-slate-800/80 text-muted-foreground hover:text-foreground hover:bg-slate-700 transition-all active:scale-95" title={rotating ? 'Stop galaxy rotation' : 'Rotate galaxy view'}>
            <Orbit className="w-4 h-4" />
          </button>
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

        <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 max-w-[300px]">
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
            Hybrid graph + orbital view. Multi-connected notes orbit the center note. Less-connected notes stay calmer. Click a node to open it.
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
              ref={orbitLayerRef}
              className="absolute will-change-transform"
              style={{
                top: center.y,
                left: center.x,
                width: 0,
                height: 0,
                transform: 'rotate(0deg)',
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
                {resolvedEdges.map((edge, idx) => {
                  const isHub = edge.type === 'hub';
                  const source = nodePositionMapRef.current.get(edge.source)!;
                  const target = nodePositionMapRef.current.get(edge.target)!;
                  return (
                    <g key={`${edge.source}-${edge.target}-${idx}`}>
                      <line
                        id={`mind-edge-${idx}`}
                        x1={source.x - center.x}
                        y1={source.y - center.y}
                        x2={target.x - center.x}
                        y2={target.y - center.y}
                        stroke={isHub ? 'rgba(255,255,255,0.32)' : edge.type === 'shared-tag' ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.12)'}
                        strokeWidth={isHub ? 0.9 : Math.min(0.8 + edge.strength * 0.18, 1.8)}
                        strokeDasharray={isHub ? undefined : '3 4'}
                        filter={isHub ? 'url(#galaxy-glow)' : undefined}
                      />
                    </g>
                  );
                })}
              </svg>

              {positionedNodes
                .filter((node) => node.role === 'center')
                .map((node) => {
                  const color = TYPE_COLORS[node.type] || '#a855f7';
                  return (
                    <div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: node.x - center.x, top: node.y - center.y }}>
                      <button
                        type="button"
                        onClick={() => void handleNodeClick(node.id)}
                        onDoubleClick={() => handleNodeDoubleClick(node.id)}
                        className="relative flex items-center justify-center"
                      >
                        <div className="absolute inset-[-18px] rounded-full blur-2xl" style={{ backgroundColor: `${color}55` }} />
                        <div className="relative rounded-full border shadow-[0_0_40px_rgba(168,85,247,0.35)] flex items-center justify-center font-black text-white"
                          style={{ width: node.radius * 2, height: node.radius * 2, background: `radial-gradient(circle at 30% 30%, ${color}, #111827)`, borderColor: `${color}88` }}>
                          {node.initial}
                        </div>
                        <div ref={hubLabelRef} className="absolute left-1/2 top-full mt-3 -translate-x-1/2 text-center whitespace-nowrap will-change-transform" style={{ transform: 'translateX(-50%) rotate(0deg)' }}>
                          <div className="text-xs font-bold text-primary-fixed-dim">{clampTitle(node.title, 28)}</div>
                          <div className="text-[10px] text-muted-foreground">Center star · {node.degree} links</div>
                        </div>
                      </button>
                    </div>
                  );
                })}

              {positionedNodes
                .filter((node) => node.role !== 'center')
                .map((node) => {
                  const color = TYPE_COLORS[node.type] || TYPE_COLORS.quick;
                  const hovered = hoveredNodeId === node.id;
                  return (
                    <button
                      key={node.id}
                      id={`mind-node-${node.id}`}
                      type="button"
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => void handleNodeClick(node.id)}
                      onDoubleClick={() => handleNodeDoubleClick(node.id)}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: 0,
                        top: 0,
                        transform: `translate(-50%, -50%) translate(${node.x - center.x}px, ${node.y - center.y}px) scale(${hovered ? 1.08 : 1})`,
                        transition: 'transform 140ms linear',
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
                            fontSize: node.role === 'orbiter-major' ? '13px' : '11px',
                            opacity: node.role === 'static' ? 0.88 : 1,
                          }}
                        >
                          {node.initial}
                        </div>
                        <div
                          ref={(el) => {
                            nodeLabelRefs.current[node.id] = el;
                          }}
                          className="absolute left-1/2 top-full mt-2 whitespace-nowrap text-center pointer-events-none will-change-transform"
                          style={{ transform: 'translateX(-50%) rotate(0deg)' }}
                        >
                          <div className={`text-[11px] font-semibold ${hovered ? 'text-white' : 'text-slate-200/90'}`}>
                            {clampTitle(node.title)}
                          </div>
                          <div className="text-[9px] text-slate-400">
                            {node.role === 'orbiter-major' ? 'Major orbit' : node.role === 'orbiter-minor' ? 'Minor orbit' : 'Static cluster'}
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
              <p className="text-xs text-muted-foreground/40 mt-1">Create notes with tags or related content to populate the galaxy map</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
